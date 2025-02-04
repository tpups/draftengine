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
    /// Gets information about the current pick in the active draft
    /// </summary>
    /// <remarks>
    /// Searches through all rounds to find the pick matching the draft's CurrentOverallPick number.
    /// Returns null if no active draft exists or if no matching pick is found (e.g., at end of draft).
    /// </remarks>
    /// <returns>Current pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<CurrentPickResponse?> GetCurrentPickAsync()
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find pick with matching overall number
            foreach (var round in draft.Rounds)
            {
                var pick = round.Picks.FirstOrDefault(p => p.OverallPickNumber == draft.CurrentOverallPick);
                if (pick != null)
                {
                    return new CurrentPickResponse
                    {
                        Round = round.RoundNumber,
                        Pick = pick.PickNumber,
                        OverallPickNumber = pick.OverallPickNumber
                    };
                }
            }

            // If we didn't find the exact overall number (e.g., at end of draft),
            // return null to indicate no more picks
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current pick");
            throw;
        }
    }

    /// <summary>
    /// Finds the next available pick after the specified pick
    /// </summary>
    /// <remarks>
    /// Uses overall pick numbers to determine the next pick in sequence.
    /// When skipCompleted is true, skips over picks that are already complete.
    /// Returns null if no next pick is available or if at the end of the draft.
    /// </remarks>
    /// <param name="currentRound">The current round number</param>
    /// <param name="currentPick">The current pick number within the round</param>
    /// <param name="skipCompleted">Whether to skip over completed picks when finding the next pick</param>
    /// <returns>Next pick information including round, pick number, and overall pick number</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<CurrentPickResponse?> GetNextPickAsync(int currentRound, int currentPick, bool skipCompleted = false)
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find current pick's overall number
            var currentPicks = draft.Rounds
                .Where(r => r.RoundNumber == currentRound)
                .SelectMany(r => r.Picks)
                .Where(p => p.PickNumber == currentPick)
                .ToList();

            var currentOverallNumber = currentPicks.FirstOrDefault()?.OverallPickNumber;
            if (currentOverallNumber == null) return null;

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Looking for next pick after overall number: {currentOverallNumber}");
            }

            // Find next pick in overall sequence
            var allPicks = draft.Rounds
                .SelectMany(r => r.Picks.Select(p => new { 
                    Round = r.RoundNumber, 
                    Pick = p 
                }))
                .Where(rp => rp.Pick.OverallPickNumber > currentOverallNumber &&
                            (!skipCompleted || !rp.Pick.IsComplete))
                .OrderBy(rp => rp.Pick.OverallPickNumber)
                .ToList();

            var nextPick = allPicks.FirstOrDefault();

            if (nextPick != null)
            {
                if (_enableConsoleLogging)
                {
                    Console.WriteLine($"Found next pick: Round {nextPick.Round}, Pick {nextPick.Pick.PickNumber} (Overall: {nextPick.Pick.OverallPickNumber})");
                }

                return new CurrentPickResponse
                {
                    Round = nextPick.Round,
                    Pick = nextPick.Pick.PickNumber,
                    OverallPickNumber = nextPick.Pick.OverallPickNumber
                };
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
    /// 
    /// 2. Current Pick (Draft Progress):
    ///    - Only updates when advancing forward
    ///    - Tracks actual draft progress
    ///    - Cannot move backward beyond the last completed pick + 1
    ///    
    /// State Management Rules:
    /// - Active pick always updates to target position
    /// - Current pick updates if:
    ///   a) Moving forward (overallPickNumber > currentOverallPick)
    ///   b) Current pick is too far ahead of completed picks
    /// - When moving backward, current pick may reset to earliest available pick
    /// </remarks>
    /// <param name="round">Target round number</param>
    /// <param name="pick">Target pick number within the round</param>
    /// <param name="overallPickNumber">Target overall pick number</param>
    /// <returns>Updated pick information if successful, null if target pick not found</returns>
    /// <exception cref="Exception">Thrown when database operation fails</exception>
    public async Task<CurrentPickResponse?> UpdateCurrentPickAsync(int round, int pick, int overallPickNumber)
    {
        try
        {
            // Get fresh draft state
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find the target pick
            var draftRound = draft.Rounds.FirstOrDefault(r => r.RoundNumber == round);
            if (draftRound == null) return null;

            var draftPick = draftRound.Picks.FirstOrDefault(p => p.PickNumber == pick);
            if (draftPick == null) return null;

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Updating pick state for Round {round}, Pick {pick}");
                Console.WriteLine($"Current state - Current: {draft.CurrentOverallPick}, Active: {draft.ActiveOverallPick}");
            }

            var filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
            UpdateDefinition<Draft> updateDefinition;

            // Always update active position to target pick
            updateDefinition = Builders<Draft>.Update
                .Set(d => d.ActiveRound, round)
                .Set(d => d.ActivePick, pick)
                .Set(d => d.ActiveOverallPick, overallPickNumber);

            // Update current pick if advancing past the current overall pick
            if (overallPickNumber > draft.CurrentOverallPick)
            {
                updateDefinition = Builders<Draft>.Update.Combine(
                    updateDefinition,
                    Builders<Draft>.Update
                        .Set(d => d.CurrentRound, round)
                        .Set(d => d.CurrentPick, pick)
                        .Set(d => d.CurrentOverallPick, overallPickNumber)
                );
            }
            // Otherwise, we might be going backwards, so check to see if we need to reset the current pick values
            else
            {
                // Check if current pick is too far ahead of completed picks
                var highestCompletedPick = draft.Rounds
                    .SelectMany(r => r.Picks)
                    .Where(p => p.IsComplete)
                    .OrderByDescending(p => p.OverallPickNumber)
                    .FirstOrDefault();

                // if there are no completed picks, draft has not started
                bool draftStarted = highestCompletedPick != null;

                var nextPickAfterHighest = highestCompletedPick != null ? highestCompletedPick.OverallPickNumber + 1 : 1;
                if (draft.CurrentOverallPick > nextPickAfterHighest)
                {
                    // Find pick with new overall number
                    var newCurrentOverall = Math.Max(
                        overallPickNumber,
                        nextPickAfterHighest
                    );

                    var newCurrentPick = draft.Rounds
                        .SelectMany(r => r.Picks)
                        .FirstOrDefault(p => p.OverallPickNumber == newCurrentOverall);

                    if (newCurrentPick != null)
                    {
                        var newCurrentRound = draft.Rounds
                            .First(r => r.Picks.Contains(newCurrentPick))
                            .RoundNumber;

                        updateDefinition = Builders<Draft>.Update.Combine(
                            updateDefinition,
                            Builders<Draft>.Update
                                .Set(d => d.CurrentRound, newCurrentRound)
                                .Set(d => d.CurrentPick, newCurrentPick.PickNumber)
                                .Set(d => d.CurrentOverallPick, newCurrentOverall)
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

            return new CurrentPickResponse
            {
                Round = round,
                Pick = pick,
                OverallPickNumber = overallPickNumber
            };
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
    /// Updates a draft's state in the database
    /// </summary>
    /// <remarks>
    /// Handles synchronization between current and active pick states:
    /// - When current pick advances, active pick automatically follows
    /// - Logs detailed state changes when console logging is enabled
    /// - Validates update acknowledgment from database
    /// </remarks>
    /// <param name="draft">The draft to update</param>
    /// <returns>The updated draft</returns>
    /// <exception cref="Exception">Thrown when update fails or is not acknowledged</exception>
    public async Task<Draft> UpdateAsync(Draft draft)
    {
        try
        {
            // Get current state for logging
            var currentDraft = await GetByIdAsync(draft.Id!);
            if (_enableConsoleLogging && currentDraft != null)
            {
                if (currentDraft.CurrentRound != draft.CurrentRound || currentDraft.CurrentPick != draft.CurrentPick)
                {
                    Console.WriteLine($"Updating pick state from:");
                    Console.WriteLine($"Current: Round {currentDraft.CurrentRound}, Pick {currentDraft.CurrentPick}, Overall {currentDraft.CurrentOverallPick}");
                    Console.WriteLine($"Active: Round {currentDraft.ActiveRound}, Pick {currentDraft.ActivePick}, Overall {currentDraft.ActiveOverallPick}");
                    Console.WriteLine($"to:");
                    Console.WriteLine($"Current: Round {draft.CurrentRound}, Pick {draft.CurrentPick}, Overall {draft.CurrentOverallPick}");
                    Console.WriteLine($"Active: Round {draft.ActiveRound}, Pick {draft.ActivePick}, Overall {draft.ActiveOverallPick}");
                }
            }

            // When updating current pick, also update active pick to match
            if (draft.CurrentOverallPick > currentDraft?.CurrentOverallPick)
            {
                draft.ActiveRound = draft.CurrentRound;
                draft.ActivePick = draft.CurrentPick;
                draft.ActiveOverallPick = draft.CurrentOverallPick;
            }

            var result = await _drafts.ReplaceOneAsync(d => d.Id == draft.Id, draft);
            if (!result.IsAcknowledged)
            {
                throw new Exception($"Failed to update draft {draft.Id}");
            }

            if (_enableConsoleLogging && currentDraft != null)
            {
                if (currentDraft.CurrentRound != draft.CurrentRound || currentDraft.CurrentPick != draft.CurrentPick)
                {
                    Console.WriteLine($"Pick state updated successfully");
                }
            }

            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating draft: {DraftId}", draft.Id);
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
    /// <exception cref="InvalidOperationException">Thrown when draft not found or attempting to remove last round</exception>
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
                throw new InvalidOperationException("Cannot remove the last round");
            }

            draft.Rounds.RemoveAt(draft.Rounds.Count - 1);
            await UpdateAsync(draft);
            return draft;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing round from draft: {DraftId}", draftId);
            throw;
        }
    }
}
