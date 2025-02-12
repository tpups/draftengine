using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using DraftEngine.Services;

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
    public async Task<ActionResult<ApiResponse<Trade>>> CreateTrade([FromBody] CreateTradeRequest request)
    {
        try
        {
            _logger.LogInformation("Creating trade with {PartyCount} parties", request.Parties.Count);
            foreach (var party in request.Parties)
            {
                _logger.LogInformation("Party {ManagerId} has {AssetCount} assets", party.ManagerId, party.Assets.Count);
                foreach (var asset in party.Assets)
                {
                    _logger.LogInformation("Asset: Type {Type}, DraftId {DraftId}, OverallPick {OverallPick}", 
                        asset.Type, asset.DraftId, asset.OverallPickNumber);
                }
            }

            // Log the raw request for debugging
            _logger.LogInformation("Raw trade request: {Request}", System.Text.Json.JsonSerializer.Serialize(request));

            // Log the parties and assets
            foreach (var party in request.Parties)
            {
                _logger.LogInformation("Party {ManagerId} details:", party.ManagerId);
                foreach (var asset in party.Assets)
                {
                    _logger.LogInformation("  Asset - Type: {Type} (raw: {RawType}), DraftId: {DraftId}", 
                        asset.Type, (int)asset.Type, asset.DraftId);
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

            var trade = await _tradeService.CreateTrade(request.Parties, request.Notes);
            _logger.LogInformation("Trade created successfully with ID: {TradeId}", trade.Id);
            _debugService.LogToFrontend(LogLevel.Information, $"Trade created successfully with ID: {trade.Id}");
            return Ok(ApiResponse<Trade>.Create(trade));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation creating trade");
            _debugService.LogToFrontend(LogLevel.Warning, $"Invalid operation creating trade: {ex.Message}");
            return BadRequest(new { error = ex.Message });
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

public class CreateTradeRequest
{
    public List<TradeParty> Parties { get; set; } = new();
    public string? Notes { get; set; }
}
