using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Services;
using MongoDB.Bson;
using DraftEngine.Models.Data;
using Microsoft.Extensions.Options;
using DraftEngine.Models.Configuration;

namespace DraftEngine.Controllers;

[ApiController]
[Route("[controller]")]
public class DraftController : ControllerBase
{
    private readonly DraftService _draftService;
    private readonly PlayerService _playerService;
    private readonly ILogger<DraftController> _logger;
    private readonly bool _enableConsoleLogging;

    public DraftController(
        DraftService draftService,
        PlayerService playerService,
        ILogger<DraftController> logger,
        IOptions<DebugOptions> debugOptions)
    {
        _draftService = draftService;
        _playerService = playerService;
        _logger = logger;
        _enableConsoleLogging = debugOptions.Value.EnableConsoleLogging;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllDrafts()
    {
        try
        {
            var drafts = await _draftService.GetAllDraftsAsync();
            return Ok(new { value = drafts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all drafts");
            return StatusCode(500, new { message = "Error getting all drafts" });
        }
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveDraft()
    {
        try
        {
            var draft = await _draftService.GetActiveDraftAsync();
            return Ok(new { 
                value = draft,
                debugSettings = new { 
                    enableConsoleLogging = _enableConsoleLogging 
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active draft");
            return StatusCode(500, new { message = "Error getting active draft" });
        }
    }

    [HttpGet("currentPick")]
    public async Task<IActionResult> GetCurrentPick()
    {
        try
        {
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                return NotFound(new { message = "No active draft found" });
            }

            var currentPick = await _draftService.GetCurrentPickAsync();
            return Ok(new { value = currentPick });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current pick");
            return StatusCode(500, new { message = "Error getting current pick" });
        }
    }

    [HttpPost("advancePick")]
    public async Task<IActionResult> AdvanceCurrentPick([FromBody] AdvancePickRequest request)
    {
        try
        {
            if (_enableConsoleLogging) Console.WriteLine("Starting advance pick operation");
            _logger.LogInformation("Starting advance pick operation");
            
            var currentPick = await _draftService.GetCurrentPickAsync();
            if (currentPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No current pick found");
                _logger.LogWarning("No current pick found");
                return NotFound(new { message = "No current pick found" });
            }
            if (_enableConsoleLogging) Console.WriteLine($"Current pick: Round {currentPick.Round}, Pick {currentPick.Pick}");
            _logger.LogInformation("Current pick: Round {round}, Pick {pick}", currentPick.Round, currentPick.Pick);

            var nextPick = await _draftService.GetNextPickAsync(currentPick.Round, currentPick.Pick, request?.SkipCompleted ?? false);
            if (nextPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No next pick available");
                _logger.LogWarning("No next pick available");
                return BadRequest(new { message = "No next pick available" });
            }
            if (_enableConsoleLogging) Console.WriteLine($"Found next pick: Round {nextPick.Round}, Pick {nextPick.Pick}");
            _logger.LogInformation("Found next pick: Round {round}, Pick {pick}", nextPick.Round, nextPick.Pick);

            // Update both current and active pick
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No active draft found");
                return NotFound(new { message = "No active draft found" });
            }

            // Set active pick to current pick
            draft.CurrentRound = currentPick.Round;
            draft.CurrentPick = currentPick.Pick;
            await _draftService.UpdateAsync(draft);

            // Update current pick to next pick
            var updatedPick = await _draftService.UpdateCurrentPickAsync(nextPick.Round, nextPick.Pick);
            if (updatedPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("Failed to update current pick");
                _logger.LogError("Failed to update current pick");
                return BadRequest(new { message = "Failed to update current pick" });
            }
            if (_enableConsoleLogging) Console.WriteLine($"Successfully updated to Round {updatedPick.Round}, Pick {updatedPick.Pick}");
            _logger.LogInformation("Successfully updated to Round {round}, Pick {pick}", updatedPick.Round, updatedPick.Pick);

            return Ok(new { value = updatedPick });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error advancing current pick");
            return StatusCode(500, new { message = "Error advancing current pick" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateDraft([FromBody] CreateDraftRequest request)
    {
        try
        {
            var draft = await _draftService.CreateDraftAsync(
                request.Year,
                request.Type,
                request.IsSnakeDraft,
                request.InitialRounds,
                request.DraftOrder);
            return Ok(new { value = draft });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when creating draft");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating draft");
            return StatusCode(500, new { message = "Error creating draft" });
        }
    }

    [HttpPost("{draftId}/pick")]
    public async Task<IActionResult> MarkPickComplete(string draftId, [FromBody] MarkPickRequest request)
    {
        try
        {
            if (_enableConsoleLogging) Console.WriteLine($"Marking pick complete for draft {draftId}, round {request.RoundNumber}, manager {request.ManagerId}");
            
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("Draft not found");
                return NotFound(new { message = "Draft not found" });
            }

            var round = draft.Rounds.FirstOrDefault(r => r.RoundNumber == request.RoundNumber);
            if (round == null)
            {
                if (_enableConsoleLogging) Console.WriteLine($"Round {request.RoundNumber} not found");
                return NotFound(new { message = "Round not found" });
            }

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Current round picks:");
                foreach (var p in round.Picks)
                {
                    Console.WriteLine($"Pick {p.PickNumber}: IsComplete = {p.IsComplete}, ManagerId = {p.ManagerId}");
                }
            }

            // Find the current pick
            var currentPick = await _draftService.GetCurrentPickAsync();
            if (currentPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No current pick found");
                return NotFound(new { message = "No current pick found" });
            }

            // Find the specific pick we want to mark complete
            var pick = round.Picks.FirstOrDefault(p => p.PickNumber == currentPick.Pick);
            if (pick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine($"Pick {currentPick.Pick} not found in round {request.RoundNumber}");
                return NotFound(new { message = "Pick not found in round" });
            }

            if (pick.IsComplete)
            {
                if (_enableConsoleLogging) Console.WriteLine($"Pick {pick.PickNumber} is already complete");
                return BadRequest(new { message = "Pick is already complete" });
            }

            if (_enableConsoleLogging) Console.WriteLine($"Found pick {pick.PickNumber}");

            // Mark the pick as complete for the selected manager
            pick.ManagerId = request.ManagerId;
            pick.IsComplete = true;
            await _draftService.UpdateAsync(draft);

            if (_enableConsoleLogging) Console.WriteLine($"Successfully marked pick {pick.PickNumber} as complete");

            return Ok(new { value = draft });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking pick complete");
            return StatusCode(500, new { message = "Error marking pick complete" });
        }
    }

    [HttpPost("{draftId}/addRound")]
    public async Task<IActionResult> AddRound(string draftId)
    {
        try
        {
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                return NotFound(new { message = "Draft not found" });
            }

            var newRoundNumber = draft.Rounds.Count + 1;
            var newRound = new DraftRound
            {
                RoundNumber = newRoundNumber,
                Picks = draft.DraftOrder
                    .Select(dp => new DraftPosition
                    {
                        ManagerId = dp.ManagerId,
                        PickNumber = dp.PickNumber,
                        IsComplete = false
                    })
                    .ToArray()
            };

            draft.Rounds.Add(newRound);
            await _draftService.UpdateAsync(draft);

            return Ok(new { value = draft });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding round");
            return StatusCode(500, new { message = "Error adding round" });
        }
    }

    [HttpPost("{draftId}/removeRound")]
    public async Task<IActionResult> RemoveRound(string draftId)
    {
        try
        {
            var draft = await _draftService.RemoveRoundAsync(draftId);
            return Ok(new { value = draft });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation when removing round");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing round");
            return StatusCode(500, new { message = "Error removing round" });
        }
    }

    [HttpPost("{draftId}/reset")]
    public async Task<IActionResult> ResetDraft(string draftId)
    {
        try
        {
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                return NotFound(new { message = "Draft not found" });
            }

            // Reset all picks and current position
            foreach (var round in draft.Rounds)
            {
                foreach (var pick in round.Picks)
                {
                    pick.IsComplete = false;
                }
            }

            draft.CurrentRound = 1;
            draft.CurrentPick = 1;

            await _draftService.UpdateAsync(draft);

            // Reset all players' draft status
            await _playerService.ResetDraftStatusAsync();

            return Ok(new { value = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting draft");
            return StatusCode(500, new { message = "Error resetting draft" });
        }
    }

    [HttpDelete("{draftId}")]
    public async Task<IActionResult> DeleteDraft(string draftId)
    {
        try
        {
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                return NotFound(new { message = "Draft not found" });
            }

            await _draftService.DeleteAsync(draftId);
            return Ok(new { value = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting draft");
            return StatusCode(500, new { message = "Error deleting draft" });
        }
    }

    [HttpPost("updateActivePick")]
    public async Task<IActionResult> UpdateActivePick([FromBody] UpdateActivePickRequest request)
    {
        try
        {
            if (_enableConsoleLogging) Console.WriteLine($"Updating active pick to Round {request.Round}, Pick {request.Pick}");
            _logger.LogInformation("Updating active pick to Round {round}, Pick {pick}", request.Round, request.Pick);

            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No active draft found");
                return NotFound(new { message = "No active draft found" });
            }

            // Update active pick
            draft.CurrentRound = request.Round;
            draft.CurrentPick = request.Pick;
            await _draftService.UpdateAsync(draft);

            if (_enableConsoleLogging) Console.WriteLine($"Successfully updated active pick to Round {request.Round}, Pick {request.Pick}");
            _logger.LogInformation("Successfully updated active pick to Round {round}, Pick {pick}", request.Round, request.Pick);

            return Ok(new { value = draft });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating active pick");
            return StatusCode(500, new { message = "Error updating active pick" });
        }
    }
}
