using MongoDB.Driver;
using DraftEngine.Models;
using DraftEngine.Models.Data;

namespace DraftEngine.Services;

public class DraftService
{
    private readonly IMongoCollection<Draft> _drafts;
    private readonly ILogger<DraftService> _logger;

    public DraftService(MongoDbContext dbContext, ILogger<DraftService> logger)
    {
        _drafts = dbContext.Database.GetCollection<Draft>("drafts");
        _logger = logger;
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
                Rounds = new List<DraftRound>()
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
            var result = await _drafts.ReplaceOneAsync(d => d.Id == draft.Id, draft);
            if (!result.IsAcknowledged)
            {
                throw new Exception($"Failed to update draft {draft.Id}");
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
}
