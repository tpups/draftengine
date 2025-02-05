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

    /// <summary>
    /// Retrieves all drafts in the system
    /// </summary>
    /// <remarks>
    /// Returns a complete list of all drafts, including inactive and completed drafts.
    /// </remarks>
    /// <response code="200">Returns list of Draft objects</response>
    /// <response code="500">Internal server error retrieving drafts</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<Draft>>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

    /// <summary>
    /// Retrieves the currently active draft
    /// </summary>
    /// <remarks>
    /// Returns the draft marked as active in the system. Only one draft can be active at a time.
    /// Also returns debug settings if console logging is enabled.
    /// </remarks>
    /// <response code="200">Returns the active Draft object with debug settings</response>
    /// <response code="500">Internal server error retrieving active draft</response>
    [HttpGet("active")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

    /// <summary>
    /// Gets the active pick in the active draft
    /// </summary>
    /// <remarks>
    /// Returns information about the active pick in the draft, including round number, pick number, and overall pick number.
    /// </remarks>
    /// <response code="200">Returns the active pick information</response>
    /// <response code="404">No active draft found</response>
    /// <response code="500">Internal server error retrieving active pick</response>
    [HttpGet("activePick")]
    [ProducesResponseType(typeof(ApiResponse<PickResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> GetActivePick()
    {
        try
        {
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                return NotFound(new { message = "No active draft found" });
            }

            var activePick = await _draftService.GetActivePickAsync();
            return Ok(new { value = activePick });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active pick");
            return StatusCode(500, new { message = "Error getting active pick" });
        }
    }

    /// <summary>
    /// Gets the current pick in the active draft
    /// </summary>
    /// <remarks>
    /// Returns information about the current pick in the draft, including round number, pick number, and overall pick number.
    /// </remarks>
    /// <response code="200">Returns the current pick information</response>
    /// <response code="404">No active draft found</response>
    /// <response code="500">Internal server error retrieving current pick</response>
    [HttpGet("currentPick")]
    [ProducesResponseType(typeof(ApiResponse<PickResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

    
    /// <summary>
    /// Updates the active pick in the current draft
    /// </summary>
    /// <remarks>
    /// Sets the active pick using an overall pick number. Used for pick selection and navigation.
    /// Updates both the active pick state and refreshes the draft state.
    /// 
    /// Pick State Updates:
    /// - Updates active pick to the specified overall pick number
    /// - Maintains draft integrity and pick sequence
    /// - Preserves current pick tracking for draft progress
    /// </remarks>
    /// <param name="request">Contains the overall pick number to set as active</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="400">Failed to update pick state</response>
    /// <response code="404">No active draft found</response>
    /// <response code="500">Internal server error updating pick state</response>
    [HttpPost("updateActivePick")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> UpdateActivePick([FromBody] UpdateActivePickRequest request)
    {
        try
        {
            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Updating active pick to overall pick {request.OverallPickNumber}");
            }

            _logger.LogInformation("Updating active pick to overall pick {OverallPickNumber}", request.OverallPickNumber);

            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No active draft found");
                return NotFound(new { message = "No active draft found" });
            }

            // Update pick state
            var updatedPick = await _draftService.UpdatePickStateAsync(request.OverallPickNumber);
            if (updatedPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("Failed to update pick state");
                return BadRequest(new { message = "Failed to update pick state" });
            }

            // Get updated draft
            draft = await _draftService.GetByIdAsync(draft.Id!);

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Successfully updated pick state");
                Console.WriteLine($"Current: Round {draft.CurrentRound}, Pick {draft.CurrentPick}, Overall {draft.CurrentOverallPick}");
                Console.WriteLine($"Active: Round {draft.ActiveRound}, Pick {draft.ActivePick}, Overall {draft.ActiveOverallPick}");
            }

            return Ok(new { value = draft });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating pick state");
            return StatusCode(500, new { message = "Error updating pick state" });
        }
    }


    /// <summary>
    /// Creates a new draft
    /// </summary>
    /// <remarks>
    /// Creates a draft with specified settings including year, type, snake draft option, initial rounds, and draft order.
    /// </remarks>
    /// <param name="request">Draft creation parameters including year, type, rounds, and order</param>
    /// <response code="200">Returns the newly created Draft object</response>
    /// <response code="400">Invalid draft creation parameters</response>
    /// <response code="500">Internal server error creating draft</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

    /// <summary>
    /// Marks a pick as complete in the active draft
    /// </summary>
    /// <remarks>
    /// Completes a pick by assigning a player to a manager and advancing the draft state.
    /// Updates both the draft state and player's draft status.
    /// 
    /// Draft Status Updates:
    /// - Adds a new draft status to the player's draftStatuses array
    /// - Each status contains the draft ID, manager ID, round, pick, and overall pick number
    /// - Multiple draft statuses allow tracking a player across different drafts
    /// - Draft status is immutable once created
    /// </remarks>
    /// <param name="request">Pick completion details including round, manager, and player</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="400">Pick is already complete</response>
    /// <response code="404">No active draft found or pick not found</response>
    /// <response code="500">Internal server error marking pick complete</response>
    [HttpPost("pick")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> MarkPickComplete([FromBody] MarkPickRequest request)
    {
        try
        {
            Draft? existingDraft = await _draftService.GetActiveDraftAsync();
            if (existingDraft == null)
            {
                _logger.LogWarning("No active draft found");
                return NotFound(new { message = "No active draft found" });
            }
            var round = existingDraft?.Rounds.FirstOrDefault(r => r.Picks.Any(p => p.OverallPickNumber == request.OverallPickNumber));
            if (round == null)
            {
                _logger.LogWarning("Round not found: {RoundNumber}", round?.RoundNumber);
                return NotFound(new { message = "Round not found" });
            }
            DraftPosition? pick = existingDraft?.Rounds.SelectMany(r => r.Picks).FirstOrDefault(p => p.OverallPickNumber == request.OverallPickNumber);
            if (pick == null)
            {
                _logger.LogWarning("Pick {OverallPick} not found", request.OverallPickNumber);
                return NotFound(new { message = "Pick not found in draft" });
            }

            if (pick.IsComplete)
            {
                _logger.LogWarning("Round {RoundNumber} pick {PickNumber} is already complete", round?.RoundNumber, pick?.PickNumber);
                return BadRequest(new { message = "Pick is already complete" });
            }            
            if (_enableConsoleLogging)
            {
                Console.WriteLine("Marking pick [round {RoundNumber} pick {PickNumber} ({OverallPick} overall)] complete in active draft", round?.RoundNumber, pick?.PickNumber, pick?.OverallPickNumber);
            }
            // Get the current pick so we can determine if completed pick is also current pick
            PickResponse? currentPick = await _draftService.GetCurrentPickAsync();
            if (currentPick == null)
            {
                _logger.LogWarning("No current pick found");
                return NotFound(new { message = "No current pick found" });
            }


            // If the completed pick is the current pick, advance to the next pick
            // We can use overall pick number to determine the next pick
            if (currentPick.OverallPickNumber == pick.OverallPickNumber)
            {
                // We should handle the case where the current pick is the last pick in the draft
                await _draftService.UpdatePickStateAsync(pick.OverallPickNumber + 1, true);
            }
            // else
            // If not current pick, we don't change state, but we still mark the pick as complete        
            // Mark the player as drafted in the active draft
            var success = await _playerService.MarkAsDrafted(request.PlayerId, new DraftPickRequest
            {
                DraftedBy = request.ManagerId,
                Round = round.RoundNumber,
                Pick = pick.PickNumber,
                OverallPick = pick.OverallPickNumber
            });

            if (!success)
            {
                _logger.LogWarning("Failed to mark player {PlayerId} as drafted", request.PlayerId);
                return StatusCode(500, new { message = "Failed to mark player as drafted" });
            }

            _logger.LogInformation(
                "Completed pick {PickNumber} in round {RoundNumber} of {DraftType} draft", pick.PickNumber, round.RoundNumber, existingDraft.IsSnakeDraft ? "snake" : "standard");

            // Get updated draft
            var draft = await _draftService.GetActiveDraftAsync();
            return Ok(new { value = draft });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Cannot complete pick: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to complete pick");
            return StatusCode(500, new { message = "Error completing pick" });
        }
    }

    /// <summary>
    /// Adds a new round to an existing draft
    /// </summary>
    /// <remarks>
    /// Creates a new round with picks for each manager, handling the following:
    /// - Maintains snake draft ordering if enabled
    /// - Automatically calculates pick numbers and overall pick numbers
    /// - Preserves draft order consistency
    /// - Maintains pick sequence integrity
    /// 
    /// Round Addition Rules:
    /// - All picks in new round start as incomplete
    /// - Pick numbers follow draft order pattern
    /// - Overall pick numbers maintain sequence
    /// - Snake draft rounds reverse manager order
    /// </remarks>
    /// <param name="id">The ID of the draft to add a round to</param>
    /// <response code="200">Returns the updated Draft object with the new round</response>
    /// <response code="400">Invalid operation (e.g., draft state prevents round addition)</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error adding round</response>
    [HttpPost("{id}/addRound")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> AddRound(string id)
    {
        try
        {
            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Adding round to draft {id}");
            }

            var existingDraft = await _draftService.GetByIdAsync(id);
            if (existingDraft == null)
            {
                _logger.LogWarning("Draft not found: {DraftId}", id);
                return NotFound(new { message = "Draft not found" });
            }

            var draft = await _draftService.AddRemoveRoundAsync(id, true);
            
            _logger.LogInformation(
                "Added round {RoundNumber} to {DraftType} draft", 
                draft.Rounds.Count,
                draft.IsSnakeDraft ? "snake" : "standard");

            return Ok(new { value = draft });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Cannot add round: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add round");
            return StatusCode(500, new { message = "Error adding round" });
        }
    }

    /// <summary>
    /// Removes the last round from an existing draft
    /// </summary>
    /// <remarks>
    /// Removes the highest numbered round from the draft with strict validation:
    /// - Cannot remove the only remaining round
    /// - Cannot remove a round with any completed picks
    /// - Maintains draft integrity by preventing destructive modifications
    /// </remarks>
    /// <param name="id">The unique identifier of the draft to remove a round from</param>
    /// <returns>The updated draft with the last round removed</returns>
    [HttpPost("{id}/removeRound")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> RemoveRound(string id)
    {
        try
        {
            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Removing round from draft {id}");
            }

            var existingDraft = await _draftService.GetByIdAsync(id);
            if (existingDraft == null)
            {
                _logger.LogWarning("Draft not found: {DraftId}", id);
                return NotFound(new { message = "Draft not found" });
            }

            var draft = await _draftService.AddRemoveRoundAsync(id, false);
            
            _logger.LogInformation(
                "Removed round {RoundNumber} from {DraftType} draft", 
                draft.Rounds.Count + 1,
                draft.IsSnakeDraft ? "snake" : "standard");

            return Ok(new { value = draft });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Cannot remove round: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove round");
            return StatusCode(500, new { message = "Error removing round" });
        }
    }

    /// <summary>
    /// Toggles the active status of a draft
    /// </summary>
    /// <remarks>
    /// Activates or deactivates a draft. When activating a draft, any currently active draft will be deactivated
    /// as only one draft can be active at a time.
    /// </remarks>
    /// <param name="id">The ID of the draft to toggle active status</param>
    /// <response code="200">Returns true if toggle successful</response>
    /// <response code="400">Invalid operation (e.g., cannot toggle draft with active picks)</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error toggling draft status</response>
    [HttpPost("{id}/toggleActive")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> ToggleActive(string id)
    {
        try
        {
            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Toggling active status for draft {id}");
            }

            var existingDraft = await _draftService.GetByIdAsync(id);
            if (existingDraft == null)
            {
                _logger.LogWarning("Draft not found: {DraftId}", id);
                return NotFound(new { message = "Draft not found" });
            }

            await _draftService.ToggleActiveAsync(id);
            
            _logger.LogInformation(
                "{Action} {DraftType} draft {DraftId}", 
                existingDraft.IsActive ? "Deactivated" : "Activated",
                existingDraft.IsSnakeDraft ? "snake" : "standard",
                id);

            return Ok(new { value = true });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Cannot toggle draft: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to toggle draft status");
            return StatusCode(500, new { message = "Error toggling draft status" });
        }
    }

    /// <summary>
    /// Resets a draft to its initial state
    /// </summary>
    /// <remarks>
    /// Resets a draft to its initial state with the following validations and operations:
    /// - Draft must exist and be active
    /// - Clears all completed picks
    /// - Resets pick tracking to round 1, pick 1
    /// - Resets draft status for all players
    /// - Both current and active picks are reset to the start
    /// </remarks>
    /// <param name="id">The ID of the draft to reset</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="400">Draft is not active</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error resetting draft</response>
    [HttpPost("{id}/reset")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> ResetDraft(string id)
    {
        try
        {
            var existingDraft = await _draftService.GetByIdAsync(id);
            if (existingDraft == null)
            {
                _logger.LogWarning("Draft not found: {DraftId}", id);
                return NotFound(new { message = "Draft not found" });
            }
            if (!existingDraft.IsActive)
            {
                _logger.LogWarning("Draft {Year} {Type} {DraftId} is not active", existingDraft.Year, existingDraft.Type, id);
                return BadRequest(new { message = "Draft is not active" });
            }

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Resetting draft {existingDraft.Year} {existingDraft.Type} {id}");
            }

            // Reset player statuses
            var playersResult = await _playerService.ResetDraftStatusAsync(id);

            // Reset the draft itself
            var draftResult = await _draftService.ResetAsync(id);
            
            _logger.LogInformation(
                "Reset {DraftType} draft with {RoundCount} rounds", 
                draftResult.IsSnakeDraft ? "snake" : "standard",
                draftResult.Rounds.Count);

            return Ok(new { value = draftResult });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Cannot reset draft: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reset draft");
            return StatusCode(500, new { message = "Error resetting draft" });
        }
    }    

    /// <summary>
    /// Deletes a draft and resets associated player draft statuses
    /// </summary>
    /// <remarks>
    /// Permanently removes the draft from the system and clears draft status for all players that were drafted.
    /// This operation cannot be undone.
    /// </remarks>
    /// <param name="id">The ID of the draft to delete</param>
    /// <response code="200">Returns true if deletion successful</response>
    /// <response code="400">Invalid operation (e.g., cannot delete active draft)</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error deleting draft</response>
    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> DeleteDraft(string id)
    {
        try
        {
            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Deleting draft {id}");
            }

            var existingDraft = await _draftService.GetByIdAsync(id);
            if (existingDraft == null)
            {
                _logger.LogWarning("Draft not found: {DraftId}", id);
                return NotFound(new { message = "Draft not found" });
            }
            
            // Reset draft status for players before deleting the draft
            await _playerService.ResetDraftStatusAsync(id);
            
            // Delete the draft
            await _draftService.DeleteAsync(id);
            
            _logger.LogInformation(
                "Deleted {DraftType} draft with {RoundCount} rounds", 
                existingDraft.IsSnakeDraft ? "snake" : "standard",
                existingDraft.Rounds.Count);

            return Ok(new { value = true });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Cannot delete draft: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete draft");
            return StatusCode(500, new { message = "Error deleting draft" });
        }
    }
}
