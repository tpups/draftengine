using MongoDB.Driver;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using Microsoft.Extensions.Options;
using DraftEngine.Models.Configuration;

namespace DraftEngine.Services;

public class DraftService
{
    private readonly IMongoCollection<Draft> _drafts;
    private readonly ILogger<DraftService> _logger;
    private readonly bool _enableConsoleLogging;

    public DraftService(
        MongoDbContext dbContext, 
        ILogger<DraftService> logger,
        IOptions<DebugOptions> debugOptions)
    {
        _drafts = dbContext.Database.GetCollection<Draft>("drafts");
        _logger = logger;
        _enableConsoleLogging = debugOptions.Value.EnableConsoleLogging;
    }

    /// <summary>
    /// Retrieves all drafts in the system, ordered by creation date
    /// </summary>
    /// <returns>List of all drafts, sorted with newest first</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<List<Draft>> GetAllDraftsAsync()
    {
        try
        {
            return await _drafts.Find(_ => true)
                .SortByDescending(d => d.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all drafts");
            throw;
        }
    }

    /// <summary>
    /// Retrieves a specific draft by its ID
    /// </summary>
    /// <param name="id">The ID of the draft to retrieve</param>
    /// <returns>The requested draft, or null if not found</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<Draft?> GetByIdAsync(string id)
    {
        try
        {
            return await _drafts.Find(d => d.Id == id).FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting draft by id: {Id}", id);
            throw;
        }
    }

    /// <summary>
    /// Retrieves the currently active draft in the system
    /// </summary>
    /// <returns>The active draft, or null if no draft is active</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<Draft?> GetActiveDraftAsync()
    {
        try
        {
            return await _drafts.Find(d => d.IsActive).FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active draft");
            throw;
        }
    }

    /// <summary>
    /// Gets information about the active pick in the active draft
    /// </summary>
    /// <remarks>
    /// Gets active pick information from active draft. If draft is not active, returns null.
    /// Active pick is used for UI state management and drafting. Active pick is the pick currently being viewed in the player grid.
    /// </remarks>
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
    /// <remarks>
    /// Gets current pick information from active draft. If draft is not active, returns null.
    /// Current pick tracks draft progress. Current pick is always after the furthest completed pick.
    /// </remarks>
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

    /// <summary>
    /// Gets information about the current or active pick in the active draft
    /// </summary>
    /// <returns>Pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<PickResponse?> GetPickResponseAsync(string stateType)
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            if (stateType == "current")
            {
                if (draft.CurrentRound != null && draft.CurrentPick != null)
                {
                    return new PickResponse
                    {
                        Round = draft.CurrentRound,
                        Pick = draft.CurrentPick,
                        OverallPickNumber = draft.CurrentOverallPick
                    };
                }
            }
            else if (stateType == "active")
            {
                if (draft.ActiveRound != null && draft.ActivePick != null)
                {
                    return new PickResponse
                    {
                        Round = draft.ActiveRound,
                        Pick = draft.ActivePick,
                        OverallPickNumber = draft.ActiveOverallPick
                    };
                }
            }
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting pick response");
            throw;
        }
    }

    /// <summary>
    /// Finds the next available pick after the specified pick
    /// </summary>
    /// <remarks>
    /// Uses overall pick numbers to determine the next pick in sequence.
    /// When skipCompleted is true, skips over picks that are already complete.
    /// Returns null if no active draft or at the end of the draft.
    /// </remarks>
    /// <param name="pick">The overall pick number to advance from</param>
    /// <param name="skipCompleted">Whether to skip over completed picks when finding the next pick</param>
    /// <returns>Next pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<PickResponse?> GetNextPickAsync(int pick, bool skipCompleted = false)
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Looking for next pick after overall number: {pick}");
            }

            // Find next pick in overall sequence
            // Skip completed picks if skipCompleted is true
            var allPicks = draft.Rounds
                .SelectMany(round => round.Picks)
                .Where(p => 
                    p.OverallPickNumber > pick && 
                    (!skipCompleted || !p.IsComplete)
                )
                .Select(pick => pick.OverallPickNumber)
                .ToList();

            var nextPickNumber = allPicks.FirstOrDefault() + 1;

            if (allPicks.Any())
            {
                var nextPick = draft.Rounds
                    .SelectMany(round => round.Picks)
                    .FirstOrDefault(p => p.OverallPickNumber == nextPickNumber);
                if (nextPick != null)
                {
                    var round = draft.Rounds.FirstOrDefault(r => r.Picks.Contains(nextPick))?.RoundNumber;
                    if (_enableConsoleLogging)
                    {
                        Console.WriteLine($"Found next pick: Round {round}, Pick {nextPick.PickNumber} (Overall: {nextPick.OverallPickNumber})");
                    }
                    return new PickResponse
                    {
                        Round = round,
                        Pick = nextPick.PickNumber,
                        OverallPickNumber = nextPick.OverallPickNumber
                    };
                }
            }

            if (_enableConsoleLogging)
            {
                Console.WriteLine("No next pick found");
            }

            return null;
        }

        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting next pick");
            throw;
        }
    }


    /// <summary>
    /// Updates both current and active pick states in the draft
    /// </summary>
    /// <remarks>
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
    public async Task<PickResponse?> UpdateCurrentPickAsync(int targetPick, bool pickMade = false)
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

                if (_enableConsoleLogging)
                {
                    Console.WriteLine($"Current state - Current: {draft.CurrentOverallPick}, Active: {draft.ActiveOverallPick}");
                    Console.WriteLine($"Updating pick state to target overall number: {targetPick}");
                }

                FilterDefinition<Draft> filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
                UpdateDefinition<Draft> updateDefinition;

                // Always update active position to target pick
                updateDefinition = Builders<Draft>.Update
                    .Set(d => d.ActiveRound, round)
                    .Set(d => d.ActivePick, pick.PickNumber)
                    .Set(d => d.ActiveOverallPick, targetPick);

                if (pickMade)
                {
                    // Get the highest completed pick
                    DraftPosition? highestCompletedPick = draft.Rounds
                        .SelectMany(r => r.Picks)
                        .Where(p => p.IsComplete)
                        .OrderByDescending(p => p.OverallPickNumber)
                        .FirstOrDefault();
                    if (highestCompletedPick != null && highestCompletedPick.OverallPickNumber > draft.CurrentOverallPick)
                    {
                        // Update current pick to the pick after the highest completed pick
                        var nextPickAfterHighest = highestCompletedPick.OverallPickNumber + 1;
                        var nextPick = draft.Rounds
                            .SelectMany(r => r.Picks)
                            .FirstOrDefault(p => p.OverallPickNumber == nextPickAfterHighest);

                        if (nextPick != null)
                        {
                            var nextPickRound = draft.Rounds
                                .First(r => r.Picks.Contains(nextPick))
                                .RoundNumber;

                            updateDefinition = Builders<Draft>.Update.Combine(
                                updateDefinition,
                                Builders<Draft>.Update
                                    .Set(d => d.CurrentRound, nextPickRound)
                                    .Set(d => d.CurrentPick, nextPick.PickNumber)
                                    .Set(d => d.CurrentOverallPick, nextPickAfterHighest)
                            );
                        }
                    }
                }
            
                var result = await _drafts.UpdateOneAsync(filter, updateDefinition);
                if (!result.IsAcknowledged)
                {
                    throw new Exception($"Failed to update pick state for draft {draft.Id}");
                }

                if (_enableConsoleLogging)
                {
                    // Get fresh state after update
                    var updatedDraft = await GetByIdAsync(draft.Id!);
                    if (updatedDraft != null)
                    {
                        Console.WriteLine($"Pick state updated successfully");
                        Console.WriteLine($"New state - Current: {updatedDraft.CurrentOverallPick}, Active: {updatedDraft.ActiveOverallPick}");
                    }
                }

                return new PickResponse
                {
                    Round = round,
                    Pick = pick.PickNumber,
                    OverallPickNumber = pick.OverallPickNumber
                };
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
    /// Creates a new draft with specified settings
    /// </summary>
    /// <remarks>
    /// Creates a draft with the given parameters and generates the initial rounds.
    /// For snake drafts, even-numbered rounds reverse the draft order.
    /// Only one draft can be active at a time.
    /// 
    /// Pick Numbering:
    /// - Each pick has both a round-specific number and an overall number
    /// - Overall numbers are sequential through the entire draft
    /// - For snake drafts, even rounds reverse the order but maintain sequential overall numbers
    /// </remarks>
    /// <param name="year">Draft year</param>
    /// <param name="type">Type of draft</param>
    /// <param name="isSnakeDraft">Whether to use snake draft ordering</param>
    /// <param name="initialRounds">Number of rounds to create initially</param>
    /// <param name="draftOrder">Array of draft positions defining the order</param>
    /// <returns>The newly created draft</returns>
    /// <exception cref="InvalidOperationException">Thrown when another draft is already active</exception>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<Draft> CreateDraftAsync(int year, string type, bool isSnakeDraft, int initialRounds, DraftPosition[] draftOrder)
    {
        try
        {
            // Ensure no other active drafts
            var activeDraft = await GetActiveDraftAsync();
            if (activeDraft != null)
            {
                throw new InvalidOperationException("There is already an active draft");
            }

            var draft = new Draft
            {
                Year = year,
                Type = type,
                IsSnakeDraft = isSnakeDraft,
                CreatedAt = DateTime.UtcNow,
                IsActive = true,
                DraftOrder = draftOrder,
                Rounds = new List<DraftRound>(),
                // Initialize current pick tracking
                CurrentRound = 1,
                CurrentPick = 1,
                CurrentOverallPick = 1,
                // Initialize active pick tracking (matches current initially)
                ActiveRound = 1,
                ActivePick = 1,
                ActiveOverallPick = 1
            };

            int totalManagers = draftOrder.Length;
            
            // Generate initial rounds with overall pick numbers
            for (int i = 1; i <= initialRounds; i++)
            {
                var roundPicks = new DraftPosition[totalManagers];
                
                for (int j = 0; j < totalManagers; j++)
                {
                    var originalPosition = draftOrder[j];
                    var newPosition = new DraftPosition
                    {
                        ManagerId = originalPosition.ManagerId,
                        PickNumber = originalPosition.PickNumber,
                        IsComplete = false
                    };

                    if (isSnakeDraft && i % 2 == 0)
                    {
                        // Even rounds (snake back)
                        newPosition.OverallPickNumber = (i * totalManagers) - j;
                        roundPicks[totalManagers - 1 - j] = newPosition;  // Reverse array position
                    }
                    else
                    {
                        // Odd rounds (normal order)
                        newPosition.OverallPickNumber = ((i - 1) * totalManagers) + j + 1;
                        roundPicks[j] = newPosition;  // Normal array position
                    }
                }

                draft.Rounds.Add(new DraftRound
                {
                    RoundNumber = i,
                    Picks = roundPicks
                });
            }

            await _drafts.InsertOneAsync(draft);
            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating draft");
            throw;
        }
    }

    /// <summary>
    /// Permanently deletes a draft from the system
    /// </summary>
    /// <param name="id">The ID of the draft to delete</param>
    /// <exception cref="Exception">Thrown when deletion fails or is not acknowledged</exception>
    public async Task DeleteAsync(string id)
    {
        try
        {
            var result = await _drafts.DeleteOneAsync(d => d.Id == id);
            if (!result.IsAcknowledged)
            {
                throw new Exception($"Failed to delete draft {id}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting draft: {DraftId}", id);
            throw;
        }
    }

    /// <summary>
    /// Removes the last round from a draft
    /// </summary>
    /// <remarks>
    /// Removes the highest-numbered round from the draft.
    /// Cannot remove the last remaining round.
    /// </remarks>
    /// <param name="draftId">The ID of the draft to modify</param>
    /// <returns>The updated draft</returns>
    /// <exception cref="InvalidOperationException">Thrown when draft not found or attempting to remove only round or round has completed picks</exception>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<Draft> RemoveRoundAsync(string draftId)
    {
        try
        {
            var draft = await GetByIdAsync(draftId);
            if (draft == null)
            {
                throw new InvalidOperationException("Draft not found");
            }

            if (draft.Rounds.Count <= 1)
            {
                throw new InvalidOperationException("Cannot remove the only round");
            }

            // Find if there are any completed picks in the round
            if (draft.Rounds.Last().Picks.Any(p => p.IsComplete))
            {
                throw new InvalidOperationException("Cannot remove round with completed picks");
            }

            draft.Rounds.RemoveAt(draft.Rounds.Count - 1);

            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing round from draft: {DraftId}", draftId);
            throw;
        }
    }
}
