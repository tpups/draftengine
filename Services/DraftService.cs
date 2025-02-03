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

    public async Task<CurrentPickResponse?> GetCurrentPickAsync()
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // If we have current pick stored, use it
            if (draft.CurrentRound.HasValue && draft.CurrentPick.HasValue)
            {
                return new CurrentPickResponse
                {
                    Round = draft.CurrentRound.Value,
                    Pick = draft.CurrentPick.Value
                };
            }

            // Otherwise find first incomplete pick
            foreach (var round in draft.Rounds.OrderBy(r => r.RoundNumber))
            {
                var picks = round.RoundNumber % 2 == 0 && draft.IsSnakeDraft
                    ? round.Picks.OrderByDescending(p => p.PickNumber)
                    : round.Picks.OrderBy(p => p.PickNumber);

                foreach (var pick in picks)
                {
                    if (!pick.IsComplete)
                    {
                        return new CurrentPickResponse
                        {
                            Round = round.RoundNumber,
                            Pick = pick.PickNumber
                        };
                    }
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current pick");
            throw;
        }
    }

    public async Task<CurrentPickResponse?> GetNextPickAsync(int currentRound, int currentPick, bool skipCompleted = false)
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find current round
            var round = draft.Rounds.FirstOrDefault(r => r.RoundNumber == currentRound);
            if (round == null) return null;

            // Get picks in order for current round
            var picks = round.Picks.OrderBy(p => p.PickNumber).ToList();
            if (_enableConsoleLogging) Console.WriteLine($"Current round {currentRound} picks:");
            _logger.LogInformation("Current round {round} picks:", currentRound);

            foreach (var pick in picks)
            {
                if (_enableConsoleLogging) Console.WriteLine($"Pick {pick.PickNumber}: IsComplete = {pick.IsComplete}, ManagerId = {pick.ManagerId}");
                _logger.LogInformation("Pick {number}: IsComplete = {complete}, ManagerId = {manager}", 
                    pick.PickNumber, pick.IsComplete, pick.ManagerId);
            }

            if (_enableConsoleLogging)
            {
                Console.WriteLine("All picks in order:");
                foreach (var p in picks)
                {
                    Console.WriteLine($"  Index {picks.IndexOf(p)}: Pick {p.PickNumber}");
                }
            }

            var currentPickIndex = picks.FindIndex(p => p.PickNumber == currentPick);
            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Current pick value we're searching for: {currentPick}");
                Console.WriteLine($"Found at index: {currentPickIndex}");
                if (currentPickIndex >= 0 && currentPickIndex < picks.Count - 1)
                {
                    Console.WriteLine($"Next pick would be: {picks[currentPickIndex + 1].PickNumber}");
                }
            }
            _logger.LogInformation("Looking for next pick after index {index} (pick {pick})", 
                currentPickIndex, currentPick);

            // Find next pick based on skipCompleted flag
            var nextPickIndex = currentPickIndex + 1;
            while (nextPickIndex < picks.Count)
            {
                var nextPick = picks[nextPickIndex];
                if (!skipCompleted || !nextPick.IsComplete)
                {
                    if (_enableConsoleLogging) Console.WriteLine($"Found next pick: {nextPick.PickNumber}");
                    _logger.LogInformation("Found next pick: {pick}", nextPick.PickNumber);
                    return new CurrentPickResponse
                    {
                        Round = currentRound,
                        Pick = nextPick.PickNumber
                    };
                }
                nextPickIndex++;
            }

            if (_enableConsoleLogging) Console.WriteLine("No incomplete picks found in current round");
            _logger.LogInformation("No incomplete picks found in current round");

            // If no next pick in current round, try next rounds
            for (int roundNum = currentRound + 1; roundNum <= draft.Rounds.Count; roundNum++)
            {
                var nextRound = draft.Rounds.FirstOrDefault(r => r.RoundNumber == roundNum);
                if (nextRound != null)
                {
                    var roundPicks = (nextRound.RoundNumber % 2 == 0 && draft.IsSnakeDraft)
                        ? nextRound.Picks.OrderByDescending(p => p.PickNumber)
                        : nextRound.Picks.OrderBy(p => p.PickNumber);

                    foreach (var pick in roundPicks)
                    {
                        if (!skipCompleted || !pick.IsComplete)
                        {
                            return new CurrentPickResponse
                            {
                                Round = nextRound.RoundNumber,
                                Pick = pick.PickNumber
                            };
                        }
                    }
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting next pick");
            throw;
        }
    }

    public async Task<CurrentPickResponse?> UpdateCurrentPickAsync(int round, int pick)
    {
        try
        {
            var draft = await GetActiveDraftAsync();
            if (draft == null) return null;

            // Find the round
            var draftRound = draft.Rounds.FirstOrDefault(r => r.RoundNumber == round);
            if (draftRound == null) return null;

            // Find the pick
            var draftPick = draftRound.Picks.FirstOrDefault(p => p.PickNumber == pick);
            if (draftPick == null) return null;

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Updating current pick from Round {draft.CurrentRound}, Pick {draft.CurrentPick} to Round {round}, Pick {pick}");
            }

            // Update the draft in MongoDB with the new current pick
            var filter = Builders<Draft>.Filter.Eq(d => d.Id, draft.Id);
            var update = Builders<Draft>.Update
                .Set(d => d.CurrentRound, round)
                .Set(d => d.CurrentPick, pick);

            var result = await _drafts.UpdateOneAsync(filter, update);
            if (!result.IsAcknowledged)
            {
                throw new Exception($"Failed to update current pick for draft {draft.Id}");
            }

            // Update the draft object
            draft.CurrentRound = round;
            draft.CurrentPick = pick;

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Current pick updated successfully to Round {round}, Pick {pick}");
                Console.WriteLine($"Draft state: Active Round {draft.CurrentRound}, Active Pick {draft.CurrentPick}, Current Round {round}, Current Pick {pick}");
            }

            return new CurrentPickResponse
            {
                Round = round,
                Pick = pick
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating current pick");
            throw;
        }
    }

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
                CurrentRound = 1,
                CurrentPick = 1
            };

            // Generate initial rounds
            for (int i = 1; i <= initialRounds; i++)
            {
                var picks = i % 2 == 0 && isSnakeDraft 
                    ? draftOrder.Reverse().ToArray() 
                    : draftOrder.ToArray();

                draft.Rounds.Add(new DraftRound
                {
                    RoundNumber = i,
                    Picks = picks
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
                    Console.WriteLine($"Updating active pick from Round {currentDraft.CurrentRound}, Pick {currentDraft.CurrentPick} to Round {draft.CurrentRound}, Pick {draft.CurrentPick}");
                }
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
                    Console.WriteLine($"Active pick updated successfully to Round {draft.CurrentRound}, Pick {draft.CurrentPick}");
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
