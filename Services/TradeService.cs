using DraftEngine.Models;
using MongoDB.Driver;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using System.Text.Json;

namespace DraftEngine.Services;

public class TradeValidationException : Exception
{
    public TradeValidationException(string message) : base(message) { }
}

public class AssetDistributionException : Exception 
{
    public AssetDistributionException(string message) : base(message) { }
}

public class DraftPickValidationException : Exception
{
    public DraftPickValidationException(string message) : base(message) { }
}

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
        if (dbContext == null) throw new ArgumentNullException(nameof(dbContext));
        if (draftService == null) throw new ArgumentNullException(nameof(draftService));
        if (logger == null) throw new ArgumentNullException(nameof(logger));

        _trades = dbContext.Trades ?? throw new InvalidOperationException("Trades collection is not initialized");
        _draftService = draftService;
        _logger = logger;

        _logger.LogInformation("TradeService initialized");
    }

    public async Task<List<Trade>> GetTrades()
    {
        return await _trades.Find(_ => true)
            .SortByDescending(t => t.Timestamp)
            .ToListAsync();
    }

    public async Task<bool> CanCancelTrade(string tradeId)
    {
        var trade = await _trades.Find(t => t.Id == tradeId).FirstOrDefaultAsync();
        if (trade == null)
            return false;

        // Get all completed trades after this trade
        var futureTrades = await _trades.Find(t => 
            t.Status == TradeStatus.Completed && 
            t.Timestamp > trade.Timestamp
        ).ToListAsync();

        if (!futureTrades.Any())
            return true;

        // Get all assets involved in this trade
        var tradeAssets = trade.Parties.SelectMany(p => p.Assets).ToList();

        // Check if any assets are involved in future completed trades
        foreach (var futureTrade in futureTrades)
        {
            var futureAssets = futureTrade.Parties.SelectMany(p => p.Assets);
            foreach (var asset in tradeAssets)
            {
                if (futureAssets.Any(fa => 
                    fa.Type == asset.Type &&
                    fa.DraftId == asset.DraftId &&
                    fa.OverallPickNumber == asset.OverallPickNumber))
                {
                    _logger.LogInformation(
                        "Trade {TradeId} cannot be cancelled because asset (Type: {Type}, DraftId: {DraftId}, Pick: {Pick}) is involved in future trade {FutureTradeId}",
                        tradeId, asset.Type, asset.DraftId, asset.OverallPickNumber, futureTrade.Id);
                    return false;
                }
            }
        }

        return true;
    }

    public async Task<Trade> CreateTrade(Trade trade)
    {
        try
        {
            _logger.LogInformation("=== Starting CreateTrade ===");
            _logger.LogInformation("Trade object received - ID: {Id}, Status: {Status}, Parties: {PartyCount}", 
                trade.Id ?? "New", trade.Status, trade.Parties?.Count ?? 0);

            if (trade == null)
            {
                _logger.LogError("Trade object is null");
                throw new TradeValidationException("Trade object cannot be null");
            }

            if (trade.Parties == null)
            {
                _logger.LogError("Trade parties is null");
                throw new TradeValidationException("Trade parties cannot be null");
            }

            // Log trade party count
            _logger.LogInformation("Processing trade with {PartyCount} parties", trade.Parties.Count);
            _logger.LogInformation("Asset distribution present: {HasDistribution}", trade.AssetDistribution != null);

            // Validate trade
            ValidateTrade(trade.Parties);

            // First verify all draft picks exist and are from the active draft
            foreach (var party in trade.Parties)
            {
                foreach (var asset in party.Assets.Where(a => a.Type == TradeAssetType.DraftPick))
                {
                    _logger.LogInformation("Looking for draft with ID: {DraftId}", asset.DraftId);
                    
                    // Ensure we have a valid ObjectId
                    if (!ObjectId.TryParse(asset.DraftId, out var draftObjectId))
                    {
                        _logger.LogError("Invalid draft ID format: {DraftId}", asset.DraftId);
                        throw new TradeValidationException($"Invalid draft ID format: {asset.DraftId}");
                    }

                    // Get the active draft
                    var activeDraft = await _draftService.GetActiveDraftAsync();
                    if (activeDraft == null)
                    {
                        _logger.LogError("No active draft found");
                        throw new TradeValidationException("No active draft exists");
                    }

                    // Verify this is the active draft
                    if (activeDraft.Id != asset.DraftId)
                    {
                        _logger.LogError("Trade draft {TradeDraft} does not match active draft {ActiveDraft}", 
                            asset.DraftId, activeDraft.Id);
                        throw new TradeValidationException($"Draft {asset.DraftId} is not the active draft");
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
                        throw new TradeValidationException($"Pick {asset.OverallPickNumber} not found in draft {asset.DraftId}");
                    }

                    // Check if pick is already completed
                    if (pick.IsComplete)
                    {
                        _logger.LogError("Pick {OverallPickNumber} in draft {DraftId} is already completed", 
                            asset.OverallPickNumber, asset.DraftId);
                        throw new TradeValidationException($"Pick {asset.OverallPickNumber} has already been used");
                    }

                    // Verify the manager owns this pick
                    var currentOwner = pick.TradedTo?.LastOrDefault() ?? pick.ManagerId;
                    if (currentOwner != party.ManagerId)
                    {
                        _logger.LogError("Manager {ManagerId} does not own pick {OverallPickNumber}. Current owner: {CurrentOwner}", 
                            party.ManagerId, asset.OverallPickNumber, currentOwner);
                        throw new TradeValidationException($"Manager {party.ManagerId} cannot trade pick {asset.OverallPickNumber} as they do not own it");
                    }

                    _logger.LogInformation("Found pick: Overall {OverallPickNumber}, Round Pick {PickNumber}", 
                        pick.OverallPickNumber, pick.PickNumber);
                }
            }

            // Handle asset distribution based on trade type
            if (trade.Parties.Count == 2)
            {
                _logger.LogInformation("Processing two-party trade");
                if (trade.AssetDistribution == null)
                {
                    _logger.LogInformation("Creating automatic asset distribution for two-party trade");
                    trade.AssetDistribution = new Dictionary<string, Dictionary<string, List<TradeAsset>>>
                    {
                        [trade.Parties[0].ManagerId] = new Dictionary<string, List<TradeAsset>>
                        {
                            [trade.Parties[1].ManagerId] = trade.Parties[1].Assets
                        },
                        [trade.Parties[1].ManagerId] = new Dictionary<string, List<TradeAsset>>
                        {
                            [trade.Parties[0].ManagerId] = trade.Parties[0].Assets
                        }
                    };
                }
            }
            else
            {
                _logger.LogInformation("Processing multi-party trade with {PartyCount} parties", trade.Parties.Count);
                if (trade.AssetDistribution == null)
                {
                    _logger.LogError("Multi-party trade requires explicit asset distribution");
                    throw new AssetDistributionException("Multi-party trades require explicit asset distribution configuration");
                }

                // Validate that each party is involved in the distribution
                foreach (var party in trade.Parties)
                {
                    if (!trade.AssetDistribution.ContainsKey(party.ManagerId))
                    {
                        _logger.LogError("Manager {ManagerId} is missing from asset distribution", party.ManagerId);
                        throw new AssetDistributionException($"Manager {party.ManagerId} is missing from asset distribution");
                    }

                    // Validate that each party receives assets from at least one other party
                    var receivedAssets = trade.AssetDistribution[party.ManagerId];
                    if (!receivedAssets.Any())
                    {
                        _logger.LogError("Manager {ManagerId} is not receiving assets from any party", party.ManagerId);
                        throw new AssetDistributionException($"Manager {party.ManagerId} must receive assets from at least one other party");
                    }

                    // Validate that assets are being received from parties in the trade
                    foreach (var fromManagerId in receivedAssets.Keys)
                    {
                        if (!trade.Parties.Any(p => p.ManagerId == fromManagerId))
                        {
                            _logger.LogError("Manager {ManagerId} is receiving assets from non-participant {FromManagerId}", 
                                party.ManagerId, fromManagerId);
                            throw new AssetDistributionException($"Invalid asset distribution: Manager {fromManagerId} is not part of the trade");
                        }

                        // Prevent managers from receiving assets from themselves
                        if (fromManagerId == party.ManagerId)
                        {
                            _logger.LogError("Manager {ManagerId} is receiving assets from themselves", party.ManagerId);
                            throw new AssetDistributionException($"Invalid asset distribution: Manager {party.ManagerId} cannot receive assets from themselves");
                        }
                    }
                }
            }

            // Validate and process asset distribution
            ValidateAssetDistribution(trade);

            try
            {
                await UpdateDraftPickOwnership(trade);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating draft pick ownership");
                throw;
            }

            // Log trade details
            LogTradeDetails(trade);

            // Save trade to database
            try 
            {
                await _trades.InsertOneAsync(trade);
                _logger.LogInformation("Trade saved successfully with ID: {TradeId}", trade.Id);

                // Verify trade was saved
                var savedTrade = await _trades.Find(t => t.Id == trade.Id).FirstOrDefaultAsync();
                if (savedTrade != null)
                {
                    _logger.LogInformation("Retrieved saved trade - ID: {Id}, Status: {Status}, Parties: {PartyCount}", 
                        savedTrade.Id, savedTrade.Status, savedTrade.Parties?.Count ?? 0);
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in CreateTrade: {Message}, Stack trace: {StackTrace}", ex.Message, ex.StackTrace);
            throw;
        }
    }

    public async Task CancelTrade(string tradeId)
    {
        var trade = await _trades.Find(t => t.Id == tradeId).FirstOrDefaultAsync();
        
        if (trade == null)
            throw new TradeValidationException("Trade not found");

        // Check if trade can be cancelled
        if (!await CanCancelTrade(tradeId))
        {
            throw new TradeValidationException("Cannot cancel trade because its assets are involved in more recent completed trades");
        }

        // Get active draft to verify it exists
        var activeDraft = await _draftService.GetActiveDraftAsync();
        if (activeDraft == null)
        {
            throw new TradeValidationException("No active draft exists");
        }

        // Verify all picks belong to active draft
        foreach (var party in trade.Parties)
        {
            foreach (var asset in party.Assets.Where(a => a.Type == TradeAssetType.DraftPick))
            {
                if (asset.DraftId != activeDraft.Id)
                {
                    throw new TradeValidationException($"Trade contains picks from draft {asset.DraftId} but active draft is {activeDraft.Id}");
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
            throw new TradeValidationException("Trade not found");

        // If trade is not cancelled, cancel it first
        if (trade.Status != TradeStatus.Cancelled)
        {
            _logger.LogInformation("Trade {TradeId} is not cancelled. Cancelling first...", tradeId);
            await CancelTrade(tradeId);
            
            // Refresh trade after cancellation
            trade = await _trades.Find(t => t.Id == tradeId).FirstOrDefaultAsync();
            if (trade == null)
                throw new TradeValidationException("Trade not found after cancellation");
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
        _logger.LogInformation("Starting trade validation with {PartyCount} parties", parties.Count);

        // Ensure we have at least two parties
        if (parties.Count < 2)
        {
            _logger.LogError("Trade validation failed: Not enough parties ({Count})", parties.Count);
            throw new TradeValidationException("Trade must involve at least two managers");
        }

        // Log party details
        foreach (var party in parties)
        {
            _logger.LogInformation("Validating party {ManagerId}:", party.ManagerId);
            _logger.LogInformation("  Assets: {AssetCount}", party.Assets.Count);
            foreach (var asset in party.Assets)
            {
                _logger.LogInformation("  - Type: {Type}, DraftId: {DraftId}, OverallPick: {OverallPick}",
                    asset.Type,
                    asset.DraftId,
                    asset.OverallPickNumber);
            }
        }

        // Ensure each manager has at least one trade asset
        var partiesWithNoAssets = parties.Where(party => party.Assets.Count == 0).ToList();
        if (partiesWithNoAssets.Any())
        {
            var managerIds = string.Join(", ", partiesWithNoAssets.Select(p => p.ManagerId));
            _logger.LogError("Trade validation failed: Managers with no assets: {ManagerIds}", managerIds);
            throw new TradeValidationException($"Each manager must include at least one trade asset. Missing assets from: {managerIds}");
        }

        // For multi-party trades, validate circular trades
        if (parties.Count > 2)
        {
            _logger.LogInformation("Validating multi-party trade with {PartyCount} parties", parties.Count);
            _logger.LogInformation("Total assets involved: {AssetCount}", 
                parties.Sum(p => p.Assets.Count));

            // Ensure each party is giving assets to at least one other party
            foreach (var party in parties)
            {
                var assetsGivenUp = party.Assets.Count;
                _logger.LogInformation("Manager {ManagerId} is giving up {AssetCount} assets", 
                    party.ManagerId, assetsGivenUp);

                if (assetsGivenUp == 0)
                {
                    _logger.LogError("Manager {ManagerId} is not giving up any assets", party.ManagerId);
                    throw new TradeValidationException($"In a multi-party trade, each manager must give up at least one asset. Manager {party.ManagerId} is not contributing any assets.");
                }
            }
        }

        _logger.LogInformation("Trade validation completed successfully");
    }

    private void ValidateAssetDistribution(Trade trade)
    {
        _logger.LogInformation("Starting asset distribution validation");

        if (trade.AssetDistribution == null)
        {
            _logger.LogError("Asset distribution is null");
            throw new AssetDistributionException("Asset distribution is required for trades");
        }

        // Validate all managers are included in distribution
        var managersReceivingAssets = trade.AssetDistribution.Keys.ToList();
        _logger.LogInformation("Managers receiving assets: {ManagerIds}", string.Join(", ", managersReceivingAssets));

        var managersNotReceiving = trade.Parties
            .Select(p => p.ManagerId)
            .Except(managersReceivingAssets)
            .ToList();

        if (managersNotReceiving.Any())
        {
            _logger.LogError("Some managers are not receiving assets: {ManagerIds}", string.Join(", ", managersNotReceiving));
            throw new AssetDistributionException(
                $"The following managers must receive at least one asset: {string.Join(", ", managersNotReceiving)}"
            );
        }

        // For multi-party trades, only validate that each manager gives and receives at least one asset
        foreach (var party in trade.Parties)
        {
            var assetsGivenUp = party.Assets.Count;
            var assetsReceived = trade.AssetDistribution
                .Where(kvp => kvp.Key == party.ManagerId)
                .SelectMany(kvp => kvp.Value)
                .Sum(kvp => kvp.Value.Count);

            _logger.LogInformation("Manager {ManagerId}: Giving up {GivenUp} assets, Receiving {Received} assets",
                party.ManagerId,
                assetsGivenUp,
                assetsReceived);

            if (assetsGivenUp == 0)
            {
                _logger.LogError("Manager {ManagerId} is not giving up any assets", party.ManagerId);
                throw new AssetDistributionException($"Manager {party.ManagerId} must give up at least one asset");
            }

            if (assetsReceived == 0)
            {
                _logger.LogError("Manager {ManagerId} is not receiving any assets", party.ManagerId);
                throw new AssetDistributionException($"Manager {party.ManagerId} must receive at least one asset");
            }
        }

        // Validate total assets match between contributed and distributed
        var totalContributedAssets = trade.Parties.Sum(p => p.Assets.Count);
        var totalDistributedAssets = trade.AssetDistribution
            .SelectMany(kvp => kvp.Value)
            .Sum(kvp => kvp.Value.Count);

        if (totalContributedAssets != totalDistributedAssets)
        {
            _logger.LogError("Total asset count mismatch: {ContributedCount} contributed vs {DistributedCount} distributed",
                totalContributedAssets,
                totalDistributedAssets);
            throw new AssetDistributionException("Total number of assets must match between contributed and distributed assets");
        }

        // Validate all assets are properly distributed
        var allContributedAssets = trade.Parties.SelectMany(p => p.Assets).ToList();
        var allDistributedAssets = trade.AssetDistribution
            .SelectMany(kvp => kvp.Value)
            .SelectMany(kvp => kvp.Value)
            .ToList();

        if (allContributedAssets.Count != allDistributedAssets.Count)
        {
            _logger.LogError("Asset count mismatch: {ContributedCount} contributed vs {DistributedCount} distributed",
                allContributedAssets.Count,
                allDistributedAssets.Count);
            throw new AssetDistributionException("All contributed assets must be distributed");
        }

        // Validate that distributed assets match exactly with contributed assets
        foreach (var party in trade.Parties)
        {
            var contributedAssets = party.Assets;
            
            // Find all assets being distributed by this manager
            var distributedAssets = new List<TradeAsset>();
            foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
            {
                if (fromManagerAssets.TryGetValue(party.ManagerId, out var assets))
                {
                    distributedAssets.AddRange(assets);
                }
            }

            _logger.LogInformation("Manager {ManagerId} distribution:", party.ManagerId);
            _logger.LogInformation("  Contributed: {ContributedCount} assets", contributedAssets.Count);
            _logger.LogInformation("  Distributing: {DistributedCount} assets", distributedAssets.Count);

            // Check that all contributed assets are being distributed
            foreach (var asset in contributedAssets)
            {
                var matchingDistributedAsset = distributedAssets.FirstOrDefault(a =>
                    a.Type == asset.Type &&
                    a.DraftId == asset.DraftId &&
                    a.OverallPickNumber == asset.OverallPickNumber);

                if (matchingDistributedAsset == null)
                {
                    _logger.LogError("Asset mismatch for manager {ManagerId} - Type: {Type}, DraftId: {DraftId}, Pick: {Pick} is contributed but not distributed",
                        party.ManagerId, asset.Type, asset.DraftId, asset.OverallPickNumber);
                    throw new AssetDistributionException($"Asset mismatch: Manager {party.ManagerId} has contributed assets that are not being distributed");
                }
            }

            // Check that all distributed assets were contributed
            foreach (var asset in distributedAssets)
            {
                var matchingContributedAsset = contributedAssets.FirstOrDefault(a =>
                    a.Type == asset.Type &&
                    a.DraftId == asset.DraftId &&
                    a.OverallPickNumber == asset.OverallPickNumber);

                if (matchingContributedAsset == null)
                {
                    _logger.LogError("Asset mismatch for manager {ManagerId} - Type: {Type}, DraftId: {DraftId}, Pick: {Pick} is distributed but not contributed",
                        party.ManagerId, asset.Type, asset.DraftId, asset.OverallPickNumber);
                    throw new AssetDistributionException($"Asset mismatch: Manager {party.ManagerId} is distributing assets they haven't contributed");
                }
            }

            // Validate that assets are being distributed to other managers
            foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
            {
                if (fromManagerAssets.ContainsKey(party.ManagerId))
                {
                    var assetsToManager = fromManagerAssets[party.ManagerId];
                    foreach (var asset in assetsToManager)
                    {
                        _logger.LogInformation("  - To {ReceivingManagerId}: {AssetType} {OverallPickNumber}",
                            receivingManagerId,
                            asset.Type,
                            asset.OverallPickNumber);
                    }
                }
            }
        }

        // Log distribution details
        foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
        {
            _logger.LogInformation("Manager {ManagerId} is receiving:", receivingManagerId);
            foreach (var (fromManagerId, assets) in fromManagerAssets)
            {
                foreach (var asset in assets)
                {
                    _logger.LogInformation("  - From {FromManagerId}: {AssetType} {PickNumber}",
                        fromManagerId,
                        asset.Type,
                        asset.OverallPickNumber);
                }
            }
        }
    }

    private async Task UpdateDraftPickOwnership(Trade trade)
    {
        try
        {
            _logger.LogInformation("Starting UpdateDraftPickOwnership - Trade ID: {Id}, Status: {Status}, Parties: {PartyCount}", 
                trade.Id ?? "New", trade.Status, trade.Parties?.Count ?? 0);

            if (trade.AssetDistribution == null)
            {
                _logger.LogError("Asset distribution is null");
                throw new AssetDistributionException("Asset distribution is required");
            }

            // Validate all draft picks exist before making any changes
            foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
            {
                foreach (var (fromManagerId, assets) in fromManagerAssets)
                {
                    foreach (var asset in assets.Where(a => a.Type == TradeAssetType.DraftPick))
                    {
                        if (string.IsNullOrEmpty(asset.DraftId))
                        {
                            _logger.LogError("Draft pick missing DraftId");
                            throw new DraftPickValidationException("Draft pick is missing DraftId");
                        }

                        if (!asset.OverallPickNumber.HasValue)
                        {
                            _logger.LogError("Draft pick missing OverallPickNumber");
                            throw new DraftPickValidationException("Draft pick is missing OverallPickNumber");
                        }

                        var pick = await _draftService.GetPickByOverallNumberAsync(asset.DraftId, asset.OverallPickNumber.Value);
                        if (pick == null)
                        {
                            _logger.LogError("Draft pick not found: Draft {DraftId}, Overall {OverallPickNumber}",
                                asset.DraftId, asset.OverallPickNumber);
                            throw new DraftPickValidationException($"Draft pick not found: Overall #{asset.OverallPickNumber}");
                        }

                        if (pick.IsComplete)
                        {
                            _logger.LogError("Draft pick already used: Draft {DraftId}, Overall {OverallPickNumber}",
                                asset.DraftId, asset.OverallPickNumber);
                            throw new DraftPickValidationException($"Draft pick #{asset.OverallPickNumber} has already been used");
                        }
                    }
                }
            }

            foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
            {
                _logger.LogInformation("Processing assets for receiving manager {ReceivingManagerId}", receivingManagerId);
                
                foreach (var (fromManagerId, assets) in fromManagerAssets)
                {
                    _logger.LogInformation("Processing assets from manager {FromManagerId}", fromManagerId);
                    
                    foreach (var asset in assets)
                    {
                        if (asset.Type == TradeAssetType.DraftPick)
                        {
                            try
                            {
                                _logger.LogInformation("Updating pick ownership: Receiving {ReceivingManagerId}, From {FromManagerId}, Type: {Type}, DraftId: {DraftId}, Pick: {Pick}",
                                    receivingManagerId,
                                    fromManagerId,
                                    asset.Type,
                                    asset.DraftId,
                                    asset.OverallPickNumber);

                                if (string.IsNullOrEmpty(asset.DraftId))
                                {
                                    _logger.LogError("Asset has no DraftId");
                                    throw new TradeValidationException("Asset is missing DraftId");
                                }

                                if (!asset.OverallPickNumber.HasValue)
                                {
                                    _logger.LogError("Asset has no OverallPickNumber");
                                    throw new TradeValidationException("Asset is missing OverallPickNumber");
                                }

                                await UpdateDraftPickTradedTo(asset, receivingManagerId);
                                _logger.LogInformation("Successfully updated pick ownership");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error updating pick ownership - Type: {Type}, DraftId: {DraftId}, Pick: {Pick}", 
                                    asset.Type, asset.DraftId, asset.OverallPickNumber);
                                throw;
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in UpdateDraftPickOwnership");
            throw;
        }
    }

    private async Task RevertDraftPickOwnership(Trade trade)
    {
        if (trade.AssetDistribution == null)
        {
            throw new TradeValidationException("Cannot revert trade without asset distribution information");
        }

        foreach (var fromManagerAssets in trade.AssetDistribution.Values)
        {
            foreach (var assets in fromManagerAssets.Values)
            {
                foreach (var asset in assets)
                {
                    if (asset.Type == TradeAssetType.DraftPick)
                    {
                        await RevertDraftPickTradedTo(asset);
                    }
                }
            }
        }
    }

    private async Task UpdateDraftPickTradedTo(TradeAsset asset, string newManagerId)
    {
        if (!asset.OverallPickNumber.HasValue)
        {
            _logger.LogError("Trade asset missing overall pick number");
            throw new TradeValidationException("Trade asset missing overall pick number");
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
            throw new TradeValidationException("Trade asset missing overall pick number");
        }

        _logger.LogInformation("Reverting pick ownership: Draft {DraftId}, Pick {OverallPickNumber}", 
            asset.DraftId, asset.OverallPickNumber);

        await _draftService.UpdatePickOwnershipAsync(asset.DraftId!, asset.OverallPickNumber.Value, isRevert: true);
    }
    
    private void LogTradeDetails(Trade trade)
    {
        var isMultiParty = trade.Parties.Count > 2;
        var logLevel = isMultiParty ? LogLevel.Information : LogLevel.Debug;

        _logger.Log(logLevel, "Trade Details:");
        _logger.Log(logLevel, "  Type: {TradeType} Party Trade", isMultiParty ? "Multi" : "Two");
        _logger.Log(logLevel, "  Parties: {PartyCount}", trade.Parties.Count);
        _logger.Log(logLevel, "  Status: {Status}", trade.Status);
        _logger.Log(logLevel, "  Timestamp: {Timestamp}", trade.Timestamp);

        // Log contributing assets
        _logger.Log(logLevel, "  Contributing Assets:");
        foreach (var party in trade.Parties)
        {
            _logger.Log(logLevel, "    Manager {ManagerId}:", party.ManagerId);
            foreach (var asset in party.Assets)
            {
                _logger.Log(logLevel, "      - {AssetType} {PickNumber} (Overall: {OverallPickNumber})",
                    asset.Type,
                    asset.PickNumber,
                    asset.OverallPickNumber);
            }
        }

        // Log asset distribution
        _logger.Log(logLevel, "  Asset Distribution:");
        if (trade.AssetDistribution != null)
        {
            foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
            {
                _logger.Log(logLevel, "    Manager {ManagerId} receives:", receivingManagerId);
                foreach (var (fromManagerId, assets) in fromManagerAssets)
                {
                    foreach (var asset in assets)
                    {
                        _logger.Log(logLevel, "      - From {FromManagerId}: {AssetType} {PickNumber} (Overall: {OverallPickNumber})",
                            fromManagerId,
                            asset.Type,
                            asset.PickNumber,
                            asset.OverallPickNumber);
                    }
                }
            }

            if (isMultiParty)
            {
                // Summarize asset movement for multi-party trades
                _logger.LogInformation("  Asset Movement Summary:");
                foreach (var party in trade.Parties)
                {
                    var assetsGivenUp = party.Assets.Count;
                    var assetsReceived = trade.AssetDistribution
                        .Where(kvp => kvp.Key == party.ManagerId)
                        .SelectMany(kvp => kvp.Value.Values)
                        .SelectMany(assets => assets)
                        .Count();

                    _logger.LogInformation("    Manager {ManagerId}: Gave {GivenUp} assets, Received {Received} assets",
                        party.ManagerId,
                        assetsGivenUp,
                        assetsReceived);
                }
            }
        }
        else
        {
            _logger.LogWarning("    No asset distribution provided");
        }
    }
}
