using MongoDB.Driver;
using MongoDB.Bson;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using Microsoft.Extensions.Options;
using DraftEngine.Models.Configuration;

namespace DraftEngine.Services;

public class DraftService
{
    private readonly IMongoCollection<Draft> _drafts;
    private readonly IMongoCollection<Trade> _trades;
    private readonly ILogger<DraftService> _logger;
    public DraftService(
        MongoDbContext dbContext, 
        ILogger<DraftService> logger)
    {
        _drafts = dbContext.Database.GetCollection<Draft>("drafts");
        _trades = dbContext.Database.GetCollection<Trade>("trades");
        _logger = logger;
    }

    /// <summary>
    /// Updates a draft pick's ownership by modifying its tradedTo array
    /// </summary>
    /// <param name="draftId">The unique identifier of the draft</param>
    /// <param name="overallPickNumber">The overall pick number to update</param>
    /// <param name="newManagerId">The ID of the manager receiving the pick</param>
    /// <param name="isRevert">Whether this is a revert operation (removing last trade)</param>
    /// <returns>True if the update was successful, false otherwise</returns>
    public async Task<bool> UpdatePickOwnershipAsync(string draftId, int overallPickNumber, string? newManagerId = null, bool isRevert = false)
    {
        try
        {
            var draft = await GetByIdAsync(draftId);
            if (draft == null)
            {
                _logger.LogError("Draft not found: {DraftId}", draftId);
                throw new InvalidOperationException($"Draft {draftId} not found");
            }

            var pick = draft.Rounds
                .SelectMany(r => r.Picks)
                .FirstOrDefault(p => p.OverallPickNumber == overallPickNumber);

            if (pick == null)
            {
                _logger.LogError("Pick {OverallPickNumber} not found in draft {DraftId}", overallPickNumber, draftId);
                throw new InvalidOperationException($"Pick {overallPickNumber} not found in draft {draftId}");
            }

            var filter = Builders<Draft>.Filter.And(
                Builders<Draft>.Filter.Eq(d => d.Id, draftId),
                Builders<Draft>.Filter.ElemMatch(d => d.Rounds, 
                    r => r.Picks.Any(p => p.OverallPickNumber == overallPickNumber))
            );

            UpdateDefinition<Draft> update;
            if (isRevert)
            {
                // Check if there are any trades to revert
                if (pick.TradedTo?.Count == 0)
                {
                    _logger.LogWarning("No trades to revert for pick {OverallPickNumber}", overallPickNumber);
                    return true;
                }

                // Remove the last manager from tradedTo array
                update = Builders<Draft>.Update.PopLast(
                    "Rounds.$[roundIndex].Picks.$[pickIndex].TradedTo"
                );
            }
            else if (newManagerId != null)
            {
            // Add new manager to tradedTo array if it doesn't exist
            update = Builders<Draft>.Update.AddToSet(
                "Rounds.$[roundIndex].Picks.$[pickIndex].TradedTo",
                newManagerId
            );
            }
            else
            {
                throw new ArgumentNullException(nameof(newManagerId), "Manager ID required for non-revert operations");
            }

            var arrayFilters = new List<ArrayFilterDefinition>
            {
                new BsonDocumentArrayFilterDefinition<BsonDocument>(
                    new BsonDocument("roundIndex.Picks",
                        new BsonDocument("$elemMatch",
                            new BsonDocument("OverallPickNumber", overallPickNumber)))),
                new BsonDocumentArrayFilterDefinition<BsonDocument>(
                    new BsonDocument("pickIndex.OverallPickNumber", overallPickNumber))
            };

            var options = new UpdateOptions { ArrayFilters = arrayFilters };
            var result = await _drafts.UpdateOneAsync(filter, update, options);

            if (!result.IsAcknowledged || result.ModifiedCount == 0)
            {
                _logger.LogError("Failed to update pick ownership in draft {DraftId}", draftId);
                throw new InvalidOperationException($"Failed to update pick ownership in draft {draftId}");
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating pick ownership");
            throw;
        }
    }

    /// <summary>
    /// Retrieves all drafts in the system
    /// </summary>
    /// <param name="sortDescending">Whether to sort drafts by creation date in descending order (newest first)</param>
    /// <returns>List of drafts, sorted based on the sortDescending parameter</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    /// <remarks>
    /// Provides flexible draft retrieval with optional sorting:
    /// - By default, returns drafts sorted with newest first
    /// - Can be configured to return drafts in chronological order
    /// Useful for draft history, reporting, and management interfaces
    /// </remarks>
    public async Task<List<Draft>> GetAllDraftsAsync(bool sortDescending = true)
    {
        try
        {
            var query = _drafts.Find(_ => true);
            
            return await (sortDescending 
                ? query.SortByDescending(d => d.CreatedAt)
                : query.SortBy(d => d.CreatedAt))
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all drafts");
            throw;
        }
    }

    /// <summary>
    /// Retrieves a specific draft by its unique identifier
    /// </summary>
    /// <param name="id">The unique identifier of the draft</param>
    /// <returns>The requested draft, or null if not found</returns>
    /// <exception cref="ArgumentException">Thrown when an invalid or empty ID is provided</exception>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    /// <remarks>
    /// Provides safe and efficient draft retrieval:
    /// - Validates input ID before database query
    /// - Returns null for non-existent drafts
    /// - Logs any retrieval errors
    /// </remarks>
    public async Task<Draft?> GetByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            throw new ArgumentException("Draft ID cannot be null or empty", nameof(id));

        try
        {
            return await _drafts.Find(d => d.Id == id).FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving draft with ID: {DraftId}", id);
            throw;
        }
    }

    /// <summary>
    /// Retrieves the currently active draft in the system
    /// </summary>
    /// <returns>The active draft, or null if no draft is currently active</returns>
    /// <exception cref="Exception">Thrown when database operation fails or multiple active drafts exist</exception>
    /// <remarks>
    /// Ensures draft system integrity:
    /// - Returns the single active draft
    /// - Prevents scenarios with multiple active drafts
    /// - Provides clear indication of draft system state
    /// </remarks>
    public async Task<Draft?> GetActiveDraftAsync()
    {
        try
        {
            var activeDrafts = await _drafts.Find(d => d.IsActive)
                .Limit(2)  // Fetch at most 2 to check for multiple active drafts
                .ToListAsync();

            return activeDrafts.Count switch
            {
                0 => null,
                1 => activeDrafts[0],
                _ => throw new InvalidOperationException("Multiple active drafts detected. This is an invalid system state.")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active draft");
            throw;
        }
    }

    /// <summary>
    /// Retrieves pick information from the active draft
    /// </summary>
    /// <param name="stateType">Type of pick to retrieve: 'current' or 'active'</param>
    /// <returns>Pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="InvalidOperationException">Thrown when no active draft found</exception>
    /// <exception cref="ArgumentException">Thrown when an invalid state type is provided</exception>
    /// <remarks>
    /// Pick State Types:
    /// - 'current': Represents draft progression, always after the furthest completed pick
    /// - 'active': Used for UI state management, can be any pick in the draft
    /// 
    /// Ensures type-safe retrieval of draft pick information
    /// </remarks>
    public async Task<PickResponse?> GetPickResponseAsync(string stateType)
    {
        // Validate input
        ValidateStateType(stateType);

        try
        {
            var draft = await GetActiveDraftAsync() 
                ?? throw new InvalidOperationException("No active draft found");

            return stateType switch
            {
                "current" => CreatePickResponse(
                    draft.CurrentRound, 
                    draft.CurrentPick, 
                    draft.CurrentOverallPick),
                "active" => CreatePickResponse(
                    draft.ActiveRound, 
                    draft.ActivePick, 
                    draft.ActiveOverallPick),
                _ => null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting {StateType} pick response", stateType);
            throw;
        }
    }

    /// <summary>
    /// Gets information about the active pick in the active draft
    /// </summary>
    /// <returns>Active pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<PickResponse?> GetActivePickAsync()
    {
        try
        {
            return await GetPickResponseAsync("active");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active pick");
            throw;
        }
    }

    /// <summary>
    /// Gets information about the current pick in the active draft
    /// </summary>
    /// <returns>Current pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<PickResponse?> GetCurrentPickAsync()
    {
        try
        {
            return await GetPickResponseAsync("current");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current pick");
            throw;
        }
    }

    private void ValidateStateType(string stateType)
    {
        if (stateType is not ("current" or "active"))
        {
            throw new ArgumentException("Invalid state type. Must be 'current' or 'active'.", nameof(stateType));
        }
    }

    private PickResponse? CreatePickResponse(int? round, int? pick, int? overallPickNumber)
    {
        return round.HasValue && pick.HasValue && overallPickNumber.HasValue
            ? new PickResponse
            {
                Round = round.Value,
                Pick = pick.Value,
                OverallPickNumber = overallPickNumber.Value
            }
            : null;
    }

    /// <summary>
    /// Finds the next available pick after the specified pick
    /// </summary>
    /// <param name="pick">The overall pick number to advance from</param>
    /// <param name="skipCompleted">Whether to skip over completed picks when finding the next pick</param>
    /// <returns>Next pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    /// <remarks>
    /// Pick Selection Rules:
    /// - Uses overall pick numbers to determine next pick in sequence
    /// - Optionally skips completed picks based on skipCompleted parameter
    /// - Returns null if no active draft or no subsequent picks exist
    /// 
    /// Handles complex draft scenarios including:
    /// - Snake drafts with alternating pick orders
    /// - Drafts with partially completed rounds
    /// </remarks>
    public async Task<PickResponse?> GetNextPickAsync(int pick, bool skipCompleted = false)
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find all valid picks after the current pick
            var validPicks = draft.Rounds
                .SelectMany(round => round.Picks)
                .Where(p => 
                    p.OverallPickNumber > pick && 
                    (!skipCompleted || !p.IsComplete)
                )
                .OrderBy(p => p.OverallPickNumber)
                .ToList();

            // If no valid picks found, return null
            if (!validPicks.Any()) return null;

            // Select the first valid pick
            var nextPick = validPicks.First();
            var round = draft.Rounds.First(r => r.Picks.Contains(nextPick)).RoundNumber;

            return new PickResponse
            {
                Round = round,
                Pick = nextPick.PickNumber,
                OverallPickNumber = nextPick.OverallPickNumber
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting next pick after {OverallPickNumber}", pick);
            throw;
        }
    }

    /// <summary>
    /// Creates a new draft with specified settings
    /// </summary>
    /// <param name="year">Draft year</param>
    /// <param name="type">Type of draft</param>
    /// <param name="isSnakeDraft">Whether to use snake draft ordering</param>
    /// <param name="initialRounds">Number of rounds to create initially</param>
    /// <param name="draftOrder">Array of draft positions defining the order</param>
    /// <returns>The newly created draft</returns>
    /// <exception cref="InvalidOperationException">Thrown when another draft is already active</exception>
    /// <exception cref="ArgumentException">Thrown when input parameters are invalid</exception>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    /// <remarks>
    /// Draft Creation Rules:
    /// - Ensures only one active draft exists at a time
    /// - Generates sequential overall pick numbers
    /// - Handles snake draft order for even-numbered rounds
    /// - Validates input parameters before draft creation
    /// 
    /// Pick Numbering Mechanism:
    /// - Unique overall pick number across entire draft
    /// - Round-specific pick numbers maintain draft order
    /// - Snake drafts reverse order in even rounds while maintaining sequential overall picks
    /// </remarks>
    public async Task<Draft> CreateDraftAsync(int year, string type, bool isSnakeDraft, int initialRounds, DraftPosition[] draftOrder)
    {
        // Validate input parameters
        ValidateDraftCreationParameters(year, type, initialRounds, draftOrder);

        try
        {
            // Ensure no other active drafts
            var activeDraft = await GetActiveDraftAsync();
            if (activeDraft != null)
            {
                throw new InvalidOperationException("An active draft already exists");
            }

            var draft = CreateBaseDraftObject(year, type, isSnakeDraft, draftOrder);
            draft.Rounds = GenerateInitialRounds(isSnakeDraft, initialRounds, draftOrder);

            // Persist draft to database
            await _drafts.InsertOneAsync(draft);

            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating draft for year {Year}, type {Type}", year, type);
            throw;
        }
    }

    private static void ValidateDraftCreationParameters(int year, string type, int initialRounds, DraftPosition[] draftOrder)
    {
        if (year < 1900 || year > DateTime.UtcNow.Year + 1)
            throw new ArgumentException("Invalid draft year", nameof(year));

        if (string.IsNullOrWhiteSpace(type))
            throw new ArgumentException("Draft type cannot be empty", nameof(type));

        if (initialRounds < 1 || initialRounds > 50)
            throw new ArgumentException("Initial rounds must be between 1 and 50", nameof(initialRounds));

        if (draftOrder == null || draftOrder.Length == 0)
            throw new ArgumentException("Draft order must contain at least one manager", nameof(draftOrder));
    }

    private static Draft CreateBaseDraftObject(int year, string type, bool isSnakeDraft, DraftPosition[] draftOrder)
    {
        return new Draft
        {
            Year = year,
            Type = type,
            IsSnakeDraft = isSnakeDraft,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            DraftOrder = draftOrder,
            Rounds = new List<DraftRound>(),
            CurrentRound = 1,
            CurrentPick = 1,
            CurrentOverallPick = 1,
            ActiveRound = 1,
            ActivePick = 1,
            ActiveOverallPick = 1
        };
    }

    private static List<DraftRound> GenerateInitialRounds(bool isSnakeDraft, int initialRounds, DraftPosition[] draftOrder)
    {
        int totalManagers = draftOrder.Length;
        var rounds = new List<DraftRound>();

        for (int roundNumber = 1; roundNumber <= initialRounds; roundNumber++)
        {
            var roundPicks = new DraftPosition[totalManagers];
            
            for (int managerIndex = 0; managerIndex < totalManagers; managerIndex++)
            {
                var originalPosition = draftOrder[managerIndex];
                var newPosition = CreateDraftPosition(isSnakeDraft, roundNumber, totalManagers, managerIndex, originalPosition);
                
                roundPicks[GetPickArrayIndex(isSnakeDraft, roundNumber, managerIndex, totalManagers)] = newPosition;
            }

            rounds.Add(new DraftRound
            {
                RoundNumber = roundNumber,
                Picks = roundPicks
            });
        }

        return rounds;
    }

    private static DraftPosition CreateDraftPosition(bool isSnakeDraft, int roundNumber, int totalManagers, int managerIndex, DraftPosition originalPosition)
    {
        return new DraftPosition
        {
            ManagerId = originalPosition.ManagerId,
            PickNumber = originalPosition.PickNumber,
            IsComplete = false,
            OverallPickNumber = CalculateOverallPickNumber(isSnakeDraft, roundNumber, totalManagers, managerIndex),
            TradedTo = new List<string>()
        };
    }

    private static int CalculateOverallPickNumber(bool isSnakeDraft, int roundNumber, int totalManagers, int managerIndex)
    {
        return isSnakeDraft && roundNumber % 2 == 0
            ? (roundNumber * totalManagers) - managerIndex
            : ((roundNumber - 1) * totalManagers) + managerIndex + 1;
    }

    private static int GetPickArrayIndex(bool isSnakeDraft, int roundNumber, int managerIndex, int totalManagers)
    {
        return isSnakeDraft && roundNumber % 2 == 0
            ? totalManagers - 1 - managerIndex
            : managerIndex;
    }

    /// <summary>
    /// Updates both current and active pick states in the draft
    /// </summary>
    /// <remarks>
    /// Remember to call this method after any other method that relies on pick state
    /// This method manages the two-tier pick tracking system:
    /// 1. Active Pick (UI Selection):
    ///    - Always updates to the target pick
    ///    - Used for viewing and editing specific picks
    ///    - Can move freely to any pick
    /// 2. Current Pick (Draft Progress):
    ///    - Tracks actual draft progress
    /// State Management Rules:
    /// - Active pick always updates to target position
    /// - Current pick is always the pick after the highest completed pick
    /// </remarks>
    /// <param name="targetPick">Target overall pick number</param>
    /// <param name="pickMade">Whether the update is due to a completed pick</param>
    /// <returns>Updated pick information if successful, null if target pick not found</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<PickResponse?> UpdatePickStateAsync(int targetPick, bool pickMade = false)
    {
        try
        {
            // Get fresh draft state
            Draft? draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find the target pick
            DraftPosition? pick = draft.Rounds
                .SelectMany(r => r.Picks)
                .FirstOrDefault(p => p.OverallPickNumber == targetPick);
            
            if (pick != null)
            {                
                // Find the target round
                int? round = draft.Rounds
                    .FirstOrDefault(r => r.Picks.Contains(pick))?.RoundNumber;

                _logger.LogInformation(
                    "Current state - Current: {CurrentPick}, Active: {ActivePick}. Updating to target: {TargetPick}, Player drafted: {PickMade}", 
                    draft.CurrentOverallPick, 
                    draft.ActiveOverallPick,
                    targetPick,
                    pickMade);

                FilterDefinition<Draft> filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
                UpdateDefinition<Draft> updateDefinition;

                // Always update active position to target pick
                updateDefinition = Builders<Draft>.Update
                    .Set(d => d.ActiveRound, round)
                    .Set(d => d.ActivePick, pick.PickNumber)
                    .Set(d => d.ActiveOverallPick, targetPick);

                if (pickMade)
                {
                    // If current pick is behind target pick, we need to update current pick
                    if (draft.CurrentOverallPick < targetPick)
                    {
                        updateDefinition = Builders<Draft>.Update.Combine(
                            updateDefinition,
                            Builders<Draft>.Update.Set(d => d.CurrentRound, round),
                            Builders<Draft>.Update.Set(d => d.CurrentPick, pick.PickNumber),
                            Builders<Draft>.Update.Set(d => d.CurrentOverallPick, targetPick)
                        );
                    }
                }
            
                var result = await _drafts.UpdateOneAsync(filter, updateDefinition);
                if (!result.IsAcknowledged)
                {
                    throw new Exception($"Failed to update pick state for draft {draft.Id}");
                }

                // Get fresh state after update
                var updatedDraft = await GetByIdAsync(draft.Id!);
                if (updatedDraft != null)
                {
                    _logger.LogInformation(
                        "Pick state updated successfully. New state - Current: {CurrentPick}, Active: {ActivePick}",
                        updatedDraft.CurrentOverallPick,
                        updatedDraft.ActiveOverallPick);
                }

                return new PickResponse
                {
                    Round = round,
                    Pick = pick.PickNumber,
                    OverallPickNumber = pick.OverallPickNumber
                };
            }
            else
            {
                _logger.LogError("Target pick not found: {TargetPick}", targetPick);

                // If pick is null the last pick of the draft may have just been made
                // See if the target pick number is higher than the last pick
                int totalPicks = draft.Rounds.Sum(r => r.Picks.Length);
                if (targetPick == totalPicks + 1)
                {
                    FilterDefinition<Draft> lastPickFilter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
                    UpdateDefinition<Draft> lastPickUpdate = Builders<Draft>.Update
                        .Set(d => d.CurrentRound, null)
                        .Set(d => d.CurrentPick, null)
                        .Set(d => d.CurrentOverallPick, null);

                    var lastPickResult = await _drafts.UpdateOneAsync(lastPickFilter, lastPickUpdate);
                    if (!lastPickResult.IsAcknowledged)
                    {
                        throw new Exception($"Failed to update pick state for draft {draft.Id}");
                    }

                _logger.LogInformation("Draft complete. Current pick state set to null");
                }
            }

            return null;
        }

        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating pick state");
            throw;
        }
    }
    
    /// <summary>
    /// Dynamically modifies the draft by adding or removing the last round
    /// </summary>
    /// <param name="id">The unique identifier of the draft to modify</param>
    /// <param name="addRound">Indicates whether to add (true) or remove (false) a round</param>
    /// <returns>The updated draft with the round modification</returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown in the following scenarios:
    /// - Draft cannot be found
    /// - Attempting to remove the only remaining round
    /// - Attempting to remove a round with completed picks
    /// </exception>
    /// <exception cref="Exception">Thrown when database update fails</exception>
    /// <remarks>
    /// Round modification rules:
    /// - Adding a round: 
    ///   * Generates picks for all managers based on draft order
    ///   * Handles snake draft pick number calculations
    ///   * Sets all new picks as incomplete
    /// - Removing a round:
    ///   * Removes the last round
    ///   * Prevents removal if any picks in the round are complete
    /// Ensures draft integrity and maintains draft order consistency
    /// </remarks>
    public async Task<Draft> AddRemoveRoundAsync(string id, bool addRound = true)
    {
        try
        {
            Draft? draft = await GetByIdAsync(id) ?? throw new InvalidOperationException("Draft not found");

            var filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);

            if (!addRound)
            {
                if (draft.Rounds.Count <= 1)
                {
                    throw new InvalidOperationException("Cannot remove the only round");
                }
                
                if (draft.Rounds.Last().Picks.Any(p => p.IsComplete))
                {
                    throw new InvalidOperationException("Cannot remove round with completed picks");
                }

                draft.Rounds.RemoveAt(draft.Rounds.Count - 1);
            }
            else
            {
                draft.Rounds.Add(CreateNewRound(draft));
            }

            var updateDefinition = Builders<Draft>.Update.Set(d => d.Rounds, draft.Rounds);

            var result = await _drafts.UpdateOneAsync(filter, updateDefinition);
            
            if (!result.IsAcknowledged || result.ModifiedCount == 0)
            {
                throw new Exception($"Failed to {(addRound ? "add" : "remove")} round for draft {draft.Year} {draft.Type} {draft.Id}");
            }

            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error modifying draft rounds: {DraftId}", id);
            throw;
        }
    }

    private DraftRound CreateNewRound(Draft draft)
    {
        int newRoundNumber = draft.Rounds.Count + 1;
        int totalManagers = draft.DraftOrder.Length;
        var roundPicks = new DraftPosition[totalManagers];

        for (int j = 0; j < totalManagers; j++)
        {
            var originalPosition = draft.DraftOrder[j];
            var newPosition = new DraftPosition
            {
                ManagerId = originalPosition.ManagerId,
                PickNumber = originalPosition.PickNumber,
                IsComplete = false,
                TradedTo = new List<string>()
            };

            newPosition.OverallPickNumber = draft.IsSnakeDraft && newRoundNumber % 2 == 0
                ? (newRoundNumber * totalManagers) - j
                : ((newRoundNumber - 1) * totalManagers) + j + 1;

            roundPicks[draft.IsSnakeDraft && newRoundNumber % 2 == 0 
                ? totalManagers - 1 - j 
                : j] = newPosition;
        }

        return new DraftRound
        {
            RoundNumber = newRoundNumber,
            Picks = roundPicks
        };
    }
    
    /// <summary>
    /// Toggles the active state of a draft, ensuring only one draft is active at a time
    /// </summary>
    /// <param name="draftId">The unique identifier of the draft to modify</param>
    /// <returns>A task representing the asynchronous toggle operation</returns>
    /// <exception cref="InvalidOperationException">Thrown when the specified draft cannot be found</exception>
    /// <exception cref="Exception">Thrown when database operations fail during draft activation/deactivation</exception>
    /// <remarks>
    /// This method performs the following actions:
    /// - If the specified draft is being activated, deactivates any currently active draft
    /// - Toggles the IsActive status of the specified draft
    /// - Ensures database consistency by updating draft activation states atomically
    /// Logs any errors encountered during the process
    /// </remarks>
    public async Task ToggleActiveAsync(string draftId)
    {
        try
        {
            Draft? draft = await GetByIdAsync(draftId) ?? throw new InvalidOperationException("Draft not found");

            var filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
            var updateDefinition = Builders<Draft>.Update.Set(d => d.IsActive, !draft.IsActive);

            // If we're activating this draft, deactivate the existing active draft
            if (!draft.IsActive)
            {
                var activeDraft = await GetActiveDraftAsync();
                if (activeDraft != null)
                {
                    var deactivateFilter = Builders<Draft>.Filter.Eq(d => d.Id, activeDraft.Id);
                    var deactivateUpdate = Builders<Draft>.Update.Set(d => d.IsActive, false);

                    var deactivateResult = await _drafts.UpdateOneAsync(deactivateFilter, deactivateUpdate);
                    if (!deactivateResult.IsAcknowledged || deactivateResult.ModifiedCount == 0)
                    {
                        throw new Exception($"Failed to deactivate existing active draft {activeDraft.Year} {activeDraft.Type} {activeDraft.Id}");
                    }
                }
            }
            
            var result = await _drafts.UpdateOneAsync(filter, updateDefinition);
            if (!result.IsAcknowledged || result.ModifiedCount == 0)
            {
                throw new Exception($"Failed to toggle active state for draft {draft.Year} {draft.Type} {draft.Id}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling draft active state: {DraftId}", draftId);
            throw;
        }
    }

    /// <summary>
    /// Marks a pick as complete in the draft
    /// </summary>
    /// <param name="overallPickNumber">The overall pick number to mark as complete</param>
    /// <returns>True if the pick was successfully marked as complete, false otherwise</returns>
    public async Task<bool> TogglePickCompleteAsync(int overallPickNumber)
    {
        try
        {
            _logger.LogInformation("Starting TogglePickCompleteAsync for overall pick number: {OverallPickNumber}", overallPickNumber);

            var draft = await GetActiveDraftAsync();
            if (draft == null)
            {
                _logger.LogWarning("No active draft found when trying to toggle pick {OverallPickNumber} complete", overallPickNumber);
                return false;
            }

            _logger.LogInformation("Active draft found: {DraftId}, Year: {Year}, Type: {Type}", 
                draft.Id, draft.Year, draft.Type);

            // Find the pick to update
            var pick = draft.Rounds
                .SelectMany(r => r.Picks)
                .FirstOrDefault(p => p.OverallPickNumber == overallPickNumber);

            if (pick == null)
            {
                _logger.LogWarning("No pick found for overall pick number {OverallPickNumber} in draft {DraftId}", 
                    overallPickNumber, draft.Id);
                return false;
            }

            _logger.LogInformation("Pick found - Manager: {ManagerId}, IsComplete: {IsComplete}", 
                pick.ManagerId, pick.IsComplete);

            bool isComplete = pick.IsComplete;

            if (pick.IsComplete) _logger.LogWarning("Pick {OverallPickNumber} is already marked as complete. Toggling to not complete.", overallPickNumber);
            else _logger.LogInformation("Marking pick {OverallPickNumber} as complete", overallPickNumber);

            // Update the pick's IsComplete status
            var filter = Builders<Draft>.Filter.And(
                Builders<Draft>.Filter.Eq(d => d.Id, draft.Id),
                Builders<Draft>.Filter.ElemMatch(d => d.Rounds, 
                    r => r.Picks.Any(p => p.OverallPickNumber == overallPickNumber))
            );

            _logger.LogInformation("Preparing to update draft {DraftId} with filter: {Filter}", 
                draft.Id, filter.ToString());

            var update = Builders<Draft>.Update.Set(
                "Rounds.$[roundIndex].Picks.$[pickIndex].IsComplete",
                !isComplete
            );

            _logger.LogInformation("Update operation prepared");

            var arrayFilters = new List<ArrayFilterDefinition>
            {
                new BsonDocumentArrayFilterDefinition<BsonDocument>(
                    new BsonDocument("roundIndex.Picks",
                        new BsonDocument("$elemMatch",
                            new BsonDocument("OverallPickNumber", overallPickNumber)))),
                new BsonDocumentArrayFilterDefinition<BsonDocument>(
                    new BsonDocument("pickIndex.OverallPickNumber", overallPickNumber))
            };

            var options = new UpdateOptions { ArrayFilters = arrayFilters };
            
            _logger.LogInformation("Executing update operation for draft {DraftId}", draft.Id);
            var result = await _drafts.UpdateOneAsync(filter, update, options);

            _logger.LogInformation("Update result - Acknowledged: {Acknowledged}, Modified Count: {ModifiedCount}", 
                result.IsAcknowledged, result.ModifiedCount);

            return result.IsAcknowledged && result.ModifiedCount > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling complete status for pick {OverallPickNumber}", overallPickNumber);
            throw;
        }
    }
    
    /// <summary>
    /// Resets a draft to its initial state, clearing all pick completions and resetting draft tracking
    /// </summary>
    /// <param name="id">The unique identifier of the draft to reset</param>
    /// <returns>A task representing the asynchronous reset operation</returns>
    /// <exception cref="InvalidOperationException">Thrown when no draft is found with the specified ID</exception>
    /// <exception cref="Exception">Thrown when the draft reset fails, either due to:
    ///   - Update not being acknowledged by the database
    ///   - No documents being modified during the reset process
    /// </exception>
    /// <remarks>
    /// This method performs the following actions:
    /// - Resets current, active, and overall pick tracking to the first pick (round 1, pick 1)
    /// - Marks all picks in all rounds as not complete
    /// Logs any errors encountered during the reset process
    /// </remarks>
    public async Task<Draft> ResetAsync(string id)
    {
        try
        {
            Draft? draft = await GetByIdAsync(id) ?? throw new InvalidOperationException("Draft not found");
            if (!draft.IsActive)
            {
                throw new InvalidOperationException("Draft must be active to reset");
            }

            var filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
            var update = Builders<Draft>.Update
                .Set(d => d.CurrentRound, 1)
                .Set(d => d.CurrentPick, 1)
                .Set(d => d.CurrentOverallPick, 1)
                .Set(d => d.ActiveRound, 1)
                .Set(d => d.ActivePick, 1)
                .Set(d => d.ActiveOverallPick, 1)
                // Reset all picks to incomplete and clear trades
                .Set("Rounds.$[].Picks.$[].IsComplete", false)
                .Set("Rounds.$[].Picks.$[].TradedTo", new List<string>());

            var result = await _drafts.UpdateOneAsync(filter, update);

            if (!result.IsAcknowledged)
            {
                throw new Exception($"Failed to reset draft {draft.Year} {draft.Type} {draft.Id}");
            }
            if (result.ModifiedCount == 0)
            {
                throw new Exception($"No documents were modified while resetting draft {draft.Year} {draft.Type} {draft.Id}");
            }

            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting draft: {DraftId}", id);
            throw;
        }
    }

/// <summary>
/// Permanently deletes a draft from the system
/// </summary>
/// <param name="id">The unique identifier of the draft to be deleted</param>
/// <returns>A task representing the asynchronous delete operation</returns>
/// <exception cref="Exception">Thrown when the draft deletion fails or is not acknowledged by the database</exception>
/// <remarks>
/// This method removes the draft document from the database.
/// - Logs any errors encountered during the deletion process
/// - Throws an exception if the deletion is not acknowledged
/// Note: This operation is irreversible and will remove all associated draft data
/// </remarks>
public async Task DeleteAsync(string id)
{
    try
    {
        // Get all trades for this draft
        var trades = await _trades.Find(t => 
            t.Parties.Any(p => 
                p.Assets.Any(a => 
                    a.Type == TradeAssetType.DraftPick && 
                    a.DraftId == id
                )
            )
        ).ToListAsync();

        // Delete all trades for this draft
        if (trades.Any())
        {
            await _trades.DeleteManyAsync(t => 
                t.Parties.Any(p => 
                    p.Assets.Any(a => 
                        a.Type == TradeAssetType.DraftPick && 
                        a.DraftId == id
                    )
                )
            );
        }

        // Delete the draft
        var result = await _drafts.DeleteOneAsync(d => d.Id == id);
        
        if (!result.IsAcknowledged)
        {
            throw new Exception($"Failed to delete draft {id}");
        }
        
        if (result.DeletedCount == 0)
        {
            throw new Exception($"No draft found with ID {id}");
        }
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error deleting draft: {DraftId}", id);
        throw;
    }
}
}
