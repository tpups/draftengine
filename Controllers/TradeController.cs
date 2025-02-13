using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using DraftEngine.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DraftEngine.Controllers;

[ApiController]
[Route("[controller]")]
public class TradeController : ControllerBase
{
    private readonly TradeService _tradeService;
    private readonly DraftService _draftService;
    private readonly ILogger<TradeController> _logger;
    private readonly DebugService _debugService;

    public TradeController(
        TradeService tradeService, 
        DraftService draftService,
        ILogger<TradeController> logger,
        DebugService debugService)
    {
        _tradeService = tradeService;
        _draftService = draftService;
        _logger = logger;
        _debugService = debugService;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Trade>>> CreateTrade()
    {
        try
        {
            _logger.LogInformation("=== Starting Trade Creation ===");
            _logger.LogInformation("Request Content Type: {ContentType}", Request.ContentType);
            _logger.LogInformation("Request Content Length: {ContentLength}", Request.ContentLength);

            // Read the request body directly
            using var reader = new StreamReader(Request.Body);
            var rawText = await reader.ReadToEndAsync();
            _logger.LogInformation("Raw request length: {Length}", rawText.Length);
            _logger.LogInformation("Raw request: {Request}", rawText);

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                WriteIndented = true,
                Converters = { new JsonStringEnumConverter() }
            };

            Trade? trade;
            try
            {
                trade = JsonSerializer.Deserialize<Trade>(rawText, options);
                _logger.LogInformation("Deserialization successful");
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON deserialization error: {Message}", ex.Message);
                return BadRequest(ApiResponse<Trade>.Create(null, $"Invalid trade format: {ex.Message}"));
            }
            if (trade == null)
            {
                _logger.LogError("Failed to deserialize trade request");
                return BadRequest(ApiResponse<Trade>.Create(null, "Invalid trade request"));
            }

            _logger.LogInformation("Deserialized trade object: {Trade}", JsonSerializer.Serialize(trade, options));
            _logger.LogInformation("Trade parties count: {Count}", trade.Parties?.Count ?? 0);
            _logger.LogInformation("Asset distribution: {Distribution}", 
                trade.AssetDistribution != null 
                    ? JsonSerializer.Serialize(trade.AssetDistribution, options) 
                    : "null");

            _logger.LogInformation("Creating trade with {PartyCount} parties", trade.Parties.Count);
            foreach (var party in trade.Parties)
            {
                _logger.LogInformation("Party {ManagerId} has {AssetCount} assets", party.ManagerId, party.Assets.Count);
                foreach (var asset in party.Assets)
                {
                    _logger.LogInformation("Asset: Type {Type}, DraftId {DraftId}, OverallPick {OverallPick}", 
                        asset.Type, asset.DraftId, asset.OverallPickNumber);
                }
            }

            // Log the raw request for debugging
            _logger.LogInformation("Raw trade request: {Request}", JsonSerializer.Serialize(trade));

            // Log the parties and assets
            foreach (var party in trade.Parties)
            {
                _logger.LogInformation("Party {ManagerId} details:", party.ManagerId);
                foreach (var asset in party.Assets)
                {
                    _logger.LogInformation("  Asset - Type: {Type} (raw: {RawType}), DraftId: {DraftId}", 
                        asset.Type, (int)asset.Type, asset.DraftId);
                }
            }

            // Log asset distribution if present
            if (trade.AssetDistribution != null)
            {
                _logger.LogInformation("Asset Distribution:");
                foreach (var (receivingManagerId, fromManagerAssets) in trade.AssetDistribution)
                {
                    _logger.LogInformation("  Manager {ManagerId} receives:", receivingManagerId);
                    foreach (var (fromManagerId, assets) in fromManagerAssets)
                    {
                        foreach (var asset in assets)
                        {
                            _logger.LogInformation("    - From {FromManagerId}: {AssetType} {PickNumber}",
                                fromManagerId,
                                asset.Type,
                                asset.OverallPickNumber);
                        }
                    }
                }
            }

            // Verify active draft exists
            var activeDraft = await _draftService.GetActiveDraftAsync();
            if (activeDraft == null)
            {
                _logger.LogError("No active draft found");
                _debugService.LogToFrontend(LogLevel.Error, "No active draft found when creating trade");
                return BadRequest(ApiResponse<Trade>.Create(null, "No active draft exists"));
            }

            trade.Status = TradeStatus.Completed;
            trade.Timestamp = DateTime.UtcNow;

            try
            {
                var createdTrade = await _tradeService.CreateTrade(trade);
                _logger.LogInformation("Trade created successfully with ID: {TradeId}", createdTrade.Id);
                _debugService.LogToFrontend(LogLevel.Information, $"Trade created successfully with ID: {createdTrade.Id}");
                return Ok(ApiResponse<Trade>.Create(createdTrade));
            }
            catch (TradeValidationException ex)
            {
                _logger.LogWarning(ex, "Trade validation error: {Message}", ex.Message);
                _debugService.LogToFrontend(LogLevel.Warning, $"Trade validation error: {ex.Message}");
                return BadRequest(new { error = ex.Message, type = "validation" });
            }
            catch (AssetDistributionException ex)
            {
                _logger.LogWarning(ex, "Asset distribution error: {Message}", ex.Message);
                _debugService.LogToFrontend(LogLevel.Warning, $"Asset distribution error: {ex.Message}");
                return BadRequest(new { error = ex.Message, type = "distribution" });
            }
            catch (DraftPickValidationException ex)
            {
                _logger.LogWarning(ex, "Draft pick validation error: {Message}", ex.Message);
                _debugService.LogToFrontend(LogLevel.Warning, $"Draft pick validation error: {ex.Message}");
                return BadRequest(new { error = ex.Message, type = "pick" });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Trade service error: {Message}, Stack trace: {StackTrace}", ex.Message, ex.StackTrace);
                _debugService.LogToFrontend(LogLevel.Warning, $"Trade service error: {ex.Message}");
                return BadRequest(new { error = ex.Message, type = "operation" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating trade");
            _debugService.LogToFrontend(LogLevel.Error, $"Error creating trade: {ex.Message}");
            return StatusCode(500, ApiResponse<Trade>.Create(null, "An error occurred creating the trade"));
        }
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<Trade>>>> GetTrades()
    {
        try
        {
            var trades = await _tradeService.GetTrades();
            return Ok(ApiResponse<List<Trade>>.Create(trades));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trades");
            _debugService.LogToFrontend(LogLevel.Error, $"Error getting trades: {ex.Message}");
            return StatusCode(500, ApiResponse<List<Trade>>.Create(null, "An error occurred retrieving trades"));
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> CancelTrade(string id)
    {
        try
        {
            _logger.LogInformation("Cancelling trade {TradeId}", id);

            // Verify active draft exists
            var activeDraft = await _draftService.GetActiveDraftAsync();
            if (activeDraft == null)
            {
                _logger.LogError("No active draft found");
                _debugService.LogToFrontend(LogLevel.Error, "No active draft found when cancelling trade");
                return BadRequest("No active draft exists");
            }

            await _tradeService.CancelTrade(id);
            _logger.LogInformation("Trade {TradeId} cancelled successfully", id);
            _debugService.LogToFrontend(LogLevel.Information, $"Trade {id} cancelled successfully");
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation deleting trade {TradeId}", id);
            _debugService.LogToFrontend(LogLevel.Warning, $"Invalid operation cancelling trade: {ex.Message}");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting trade {TradeId}", id);
            _debugService.LogToFrontend(LogLevel.Error, $"Error cancelling trade: {ex.Message}");
            return StatusCode(500, "An error occurred deleting the trade");
        }
    }

    [HttpDelete("{id}/permanent")]
    public async Task<ActionResult> DeleteTrade(string id)
    {
        try
        {
            _logger.LogInformation("Permanently deleting trade {TradeId}", id);

            await _tradeService.DeleteTrade(id);
            _logger.LogInformation("Trade {TradeId} permanently deleted", id);
            _debugService.LogToFrontend(LogLevel.Information, $"Trade {id} permanently deleted");
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation permanently deleting trade {TradeId}", id);
            _debugService.LogToFrontend(LogLevel.Warning, $"Invalid operation permanently deleting trade: {ex.Message}");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error permanently deleting trade {TradeId}", id);
            _debugService.LogToFrontend(LogLevel.Error, $"Error permanently deleting trade: {ex.Message}");
            return StatusCode(500, "An error occurred permanently deleting the trade");
        }
    }
}
