using DraftEngine.Models;
using MongoDB.Driver;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;

namespace DraftEngine.Services;

public class TradeService
{
    private readonly IMongoCollection<Trade> _trades;
    private readonly DraftService _draftService;
    private readonly ILogger<TradeService> _logger;

    public TradeService(
        MongoDbContext dbContext, 
        DraftService draftService,
        ILogger<TradeService> logger)
    {
        _trades = dbContext.Trades;
        _draftService = draftService;
        _logger = logger;
    }

    public async Task<List<Trade>> GetTrades()
    {
        return await _trades.Find(_ => true)
            .SortByDescending(t => t.Timestamp)
            .ToListAsync();
    }

    public async Task<Trade> CreateTrade(List<TradeParty> parties, string? notes = null)
    {
        // Validate trade
        ValidateTrade(parties);

        // First verify all draft picks exist and are from the active draft
        foreach (var party in parties)
        {
            foreach (var asset in party.Assets.Where(a => a.Type == TradeAssetType.DraftPick))
            {
                _logger.LogInformation("Looking for draft with ID: {DraftId}", asset.DraftId);
                
                // Ensure we have a valid ObjectId
                if (!ObjectId.TryParse(asset.DraftId, out var draftObjectId))
                {
                    _logger.LogError("Invalid draft ID format: {DraftId}", asset.DraftId);
                    throw new InvalidOperationException($"Invalid draft ID format: {asset.DraftId}");
                }

                // Get the active draft
                var activeDraft = await _draftService.GetActiveDraftAsync();
                if (activeDraft == null)
                {
                    _logger.LogError("No active draft found");
                    throw new InvalidOperationException("No active draft exists");
                }

                // Verify this is the active draft
                if (activeDraft.Id != asset.DraftId)
                {
                    _logger.LogError("Trade draft {TradeDraft} does not match active draft {ActiveDraft}", 
                        asset.DraftId, activeDraft.Id);
                    throw new InvalidOperationException($"Draft {asset.DraftId} is not the active draft");
                }

                _logger.LogInformation("Found draft: {DraftId}, Year: {Year}, Type: {Type}", 
                    activeDraft.Id, activeDraft.Year, activeDraft.Type);

                // Find the pick in the rounds
                var pick = activeDraft.Rounds
                    .SelectMany(r => r.Picks)
                    .FirstOrDefault(p => p.OverallPickNumber == asset.OverallPickNumber);

                if (pick == null)
                {
                    _logger.LogError("Pick {OverallPickNumber} not found in draft {DraftId}", 
                        asset.OverallPickNumber, asset.DraftId);
                    throw new InvalidOperationException($"Pick {asset.OverallPickNumber} not found in draft {asset.DraftId}");
                }

                // Check if pick is already completed
                if (pick.IsComplete)
                {
                    _logger.LogError("Pick {OverallPickNumber} in draft {DraftId} is already completed", 
                        asset.OverallPickNumber, asset.DraftId);
                    throw new InvalidOperationException($"Pick {asset.OverallPickNumber} has already been used");
                }

                _logger.LogInformation("Found pick: Overall {OverallPickNumber}, Round Pick {PickNumber}", 
                    pick.OverallPickNumber, pick.PickNumber);
            }
        }

        var trade = new Trade
        {
            Timestamp = DateTime.UtcNow,
            Notes = notes,
            Status = TradeStatus.Completed,
            Parties = parties
        };

        // Update draft picks
        await UpdateDraftPickOwnership(trade);

        // Log trade before saving
        _logger.LogInformation("Saving trade to database: {Trade}", System.Text.Json.JsonSerializer.Serialize(trade));
        _logger.LogInformation("Trade details:");
        _logger.LogInformation("  Status: {Status} (raw: {RawStatus})", trade.Status, (int)trade.Status);
        foreach (var party in trade.Parties)
        {
            foreach (var asset in party.Assets)
            {
                _logger.LogInformation("  Asset - Type: {Type} (raw: {RawType}), DraftId: {DraftId}", 
                    asset.Type, (int)asset.Type, asset.DraftId);
            }
        }

        // Save trade to database
        try 
        {
            await _trades.InsertOneAsync(trade);
            _logger.LogInformation("Trade saved successfully with ID: {TradeId}", trade.Id);

            // Verify trade was saved
            var savedTrade = await _trades.Find(t => t.Id == trade.Id).FirstOrDefaultAsync();
            if (savedTrade != null)
            {
                _logger.LogInformation("Retrieved saved trade: {Trade}", System.Text.Json.JsonSerializer.Serialize(savedTrade));
            }
            else
            {
                var error = "Trade was not found after saving";
                _logger.LogError(error);
                throw new InvalidOperationException(error);
            }
        }
        catch (Exception ex)
        {
            var error = $"Failed to save trade: {ex.Message}";
            _logger.LogError(ex, error);
            throw new InvalidOperationException(error);
        }

        return trade;
    }

    public async Task CancelTrade(string tradeId)
    {
        var trade = await _trades.Find(t => t.Id == tradeId).FirstOrDefaultAsync();
        
        if (trade == null)
            throw new InvalidOperationException("Trade not found");

        // Get active draft to verify it exists
        var activeDraft = await _draftService.GetActiveDraftAsync();
        if (activeDraft == null)
        {
            throw new InvalidOperationException("No active draft exists");
        }

        // Verify all picks belong to active draft
        foreach (var party in trade.Parties)
        {
            foreach (var asset in party.Assets.Where(a => a.Type == TradeAssetType.DraftPick))
            {
                if (asset.DraftId != activeDraft.Id)
                {
                    throw new InvalidOperationException($"Trade contains picks from draft {asset.DraftId} but active draft is {activeDraft.Id}");
                }
            }
        }

        // Revert draft pick ownership
        try
        {
            await RevertDraftPickOwnership(trade);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reverting pick ownership for trade {TradeId}", tradeId);
            throw new InvalidOperationException($"Failed to revert pick ownership: {ex.Message}");
        }

        // Update trade status to Cancelled
        trade.Status = TradeStatus.Cancelled;
        var updateResult = await _trades.ReplaceOneAsync(t => t.Id == tradeId, trade);
        
        if (!updateResult.IsAcknowledged || updateResult.ModifiedCount == 0)
        {
            var error = $"Failed to update trade {tradeId} status to Cancelled";
            _logger.LogError(error);
            throw new InvalidOperationException(error);
        }
        
        _logger.LogInformation("Successfully updated trade {TradeId} status to Cancelled", tradeId);
    }

    public async Task DeleteTrade(string tradeId)
    {
        var trade = await _trades.Find(t => t.Id == tradeId).FirstOrDefaultAsync();
        
        if (trade == null)
            throw new InvalidOperationException("Trade not found");

        // If trade is not cancelled, cancel it first
        if (trade.Status != TradeStatus.Cancelled)
        {
            _logger.LogInformation("Trade {TradeId} is not cancelled. Cancelling first...", tradeId);
            await CancelTrade(tradeId);
            
            // Refresh trade after cancellation
            trade = await _trades.Find(t => t.Id == tradeId).FirstOrDefaultAsync();
            if (trade == null)
                throw new InvalidOperationException("Trade not found after cancellation");
        }

        _logger.LogInformation("Permanently deleting trade {TradeId}", tradeId);
        var deleteResult = await _trades.DeleteOneAsync(t => t.Id == tradeId);
        
        if (!deleteResult.IsAcknowledged || deleteResult.DeletedCount == 0)
        {
            var error = $"Failed to delete trade {tradeId}";
            _logger.LogError(error);
            throw new InvalidOperationException(error);
        }
        
        _logger.LogInformation("Successfully deleted trade {TradeId}", tradeId);
    }

    private void ValidateTrade(List<TradeParty> parties)
    {
        // Ensure each manager has at least one trade asset
        if (parties.Any(party => party.Assets.Count == 0))
            throw new InvalidOperationException("Each manager must include at least one trade asset");
    }

    private async Task UpdateDraftPickOwnership(Trade trade)
    {
        foreach (var party in trade.Parties)
        {
            foreach (var asset in party.Assets.Where(a => a.Type == TradeAssetType.DraftPick))
            {
                // Find the corresponding draft pick and update its TradedTo
                var targetParty = trade.Parties.First(p => p != party);
                await UpdateDraftPickTradedTo(asset, targetParty.ManagerId);
            }
        }
    }

    private async Task RevertDraftPickOwnership(Trade trade)
    {
        foreach (var party in trade.Parties)
        {
            foreach (var asset in party.Assets.Where(a => a.Type == TradeAssetType.DraftPick))
            {
                await RevertDraftPickTradedTo(asset);
            }
        }
    }

    private async Task UpdateDraftPickTradedTo(TradeAsset asset, string newManagerId)
    {
        if (!asset.OverallPickNumber.HasValue)
        {
            _logger.LogError("Trade asset missing overall pick number");
            throw new InvalidOperationException("Trade asset missing overall pick number");
        }

        _logger.LogInformation("Updating pick ownership: Draft {DraftId}, Pick {OverallPickNumber}, New Owner {NewManagerId}", 
            asset.DraftId, asset.OverallPickNumber, newManagerId);

        await _draftService.UpdatePickOwnershipAsync(asset.DraftId!, asset.OverallPickNumber.Value, newManagerId);
    }

    private async Task RevertDraftPickTradedTo(TradeAsset asset)
    {
        if (!asset.OverallPickNumber.HasValue)
        {
            _logger.LogError("Trade asset missing overall pick number");
            throw new InvalidOperationException("Trade asset missing overall pick number");
        }

        _logger.LogInformation("Reverting pick ownership: Draft {DraftId}, Pick {OverallPickNumber}", 
            asset.DraftId, asset.OverallPickNumber);

        await _draftService.UpdatePickOwnershipAsync(asset.DraftId!, asset.OverallPickNumber.Value, isRevert: true);
    }
}
