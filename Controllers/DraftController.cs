using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Services;
using MongoDB.Bson;
using DraftEngine.Models.Data;

namespace DraftEngine.Controllers;

[ApiController]
[Route("[controller]")]
public class DraftController : ControllerBase
{
    private readonly DraftService _draftService;
    private readonly PlayerService _playerService;
    private readonly ILogger<DraftController> _logger;

    public DraftController(
        DraftService draftService,
        PlayerService playerService,
        ILogger<DraftController> logger)
    {
        _draftService = draftService;
        _playerService = playerService;
        _logger = logger;
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
            return Ok(new { value = draft });
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
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                return NotFound(new { message = "Draft not found" });
            }

            var round = draft.Rounds.FirstOrDefault(r => r.RoundNumber == request.RoundNumber);
            if (round == null)
            {
                return NotFound(new { message = "Round not found" });
            }

            var pick = round.Picks.FirstOrDefault(p => p.ManagerId == request.ManagerId);
            if (pick == null)
            {
                return NotFound(new { message = "Pick not found" });
            }

            pick.IsComplete = true;
            await _draftService.UpdateAsync(draft);

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

            // Reset all picks
            foreach (var round in draft.Rounds)
            {
                foreach (var pick in round.Picks)
                {
                    pick.IsComplete = false;
                }
            }

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
}
