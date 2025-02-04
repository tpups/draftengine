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
    /// Gets the current pick in the active draft
    /// </summary>
    /// <remarks>
    /// Returns information about the current pick in the draft, including round number, pick number, and overall pick number.
    /// </remarks>
    /// <response code="200">Returns the current pick information</response>
    /// <response code="404">No active draft found</response>
    /// <response code="500">Internal server error retrieving current pick</response>
    [HttpGet("currentPick")]
    [ProducesResponseType(typeof(ApiResponse<CurrentPickResponse>), 200)]
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
    /// Advances the current pick to the next available pick
    /// </summary>
    /// <remarks>
    /// Moves the current pick forward based on the provided request. Can optionally skip completed picks.
    /// Includes detailed logging of the pick advancement process when console logging is enabled.
    /// </remarks>
    /// <param name="request">Contains options for pick advancement, including whether to skip completed picks</param>
    /// <response code="200">Returns the updated pick information</response>
    /// <response code="400">No next pick available or failed to update pick state</response>
    /// <response code="404">No current pick found</response>
    /// <response code="500">Internal server error advancing pick</response>
    [HttpPost("advancePick")]
    [ProducesResponseType(typeof(ApiResponse<CurrentPickResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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
            if (_enableConsoleLogging) Console.WriteLine($"Current pick: Round {currentPick.Round}, Pick {currentPick.Pick}, Overall {currentPick.OverallPickNumber}");
            _logger.LogInformation("Current pick: Round {round}, Pick {pick}, Overall {overall}", 
                currentPick.Round, currentPick.Pick, currentPick.OverallPickNumber);

            var nextPick = await _draftService.GetNextPickAsync(currentPick.Round, currentPick.Pick, request?.SkipCompleted ?? false);
            if (nextPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No next pick available");
                _logger.LogWarning("No next pick available");
                return BadRequest(new { message = "No next pick available" });
            }
            if (_enableConsoleLogging) Console.WriteLine($"Found next pick: Round {nextPick.Round}, Pick {nextPick.Pick}, Overall {nextPick.OverallPickNumber}");
            _logger.LogInformation("Found next pick: Round {round}, Pick {pick}, Overall {overall}", 
                nextPick.Round, nextPick.Pick, nextPick.OverallPickNumber);

            // Update pick state using our new method
            var updatedPick = await _draftService.UpdateCurrentPickAsync(
                nextPick.Round,
                nextPick.Pick,
                nextPick.OverallPickNumber
            );
            if (updatedPick == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("Failed to update pick state");
                _logger.LogError("Failed to update pick state");
                return BadRequest(new { message = "Failed to update pick state" });
            }

            if (_enableConsoleLogging)
            {
                Console.WriteLine($"Successfully updated pick state");
                Console.WriteLine($"New pick: Round {updatedPick.Round}, Pick {updatedPick.Pick}, Overall {updatedPick.OverallPickNumber}");
            }
            _logger.LogInformation("Successfully updated to Round {round}, Pick {pick}, Overall {overall}", 
                updatedPick.Round, updatedPick.Pick, updatedPick.OverallPickNumber);

            return Ok(new { value = updatedPick });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error advancing pick");
            return StatusCode(500, new { message = "Error advancing pick" });
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
    /// Marks a pick as complete in the specified draft
    /// </summary>
    /// <remarks>
    /// Completes a pick by assigning a player to a manager and advancing the draft state.
    /// Updates both the draft state and player's draft status.
    /// </remarks>
    /// <param name="draftId">The ID of the draft</param>
    /// <param name="request">Pick completion details including round, manager, and player</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="400">Pick is already complete</response>
    /// <response code="404">Draft, round, or pick not found</response>
    /// <response code="500">Internal server error marking pick complete</response>
    [HttpPost("{draftId}/pick")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

            // Save the draft to persist the completed pick
            await _draftService.UpdateAsync(draft);

            // Get next pick to advance to
            var nextPick = await _draftService.GetNextPickAsync(request.RoundNumber, pick.PickNumber, false);
            if (nextPick != null)
            {
                // Update pick state using our new method
                await _draftService.UpdateCurrentPickAsync(nextPick.Round, nextPick.Pick, nextPick.OverallPickNumber);
            }

            // Mark the player as drafted in this draft
            await _playerService.MarkAsDrafted(request.PlayerId, new DraftPickRequest
            {
                DraftedBy = request.ManagerId,
                Round = request.RoundNumber,
                Pick = pick.PickNumber
            }, draftId);

            if (_enableConsoleLogging) Console.WriteLine($"Successfully marked pick {pick.PickNumber} as complete");

            // Get updated draft after pick state changes
            draft = await _draftService.GetByIdAsync(draftId);
            return Ok(new { value = draft });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking pick complete");
            return StatusCode(500, new { message = "Error marking pick complete" });
        }
    }

    /// <summary>
    /// Adds a new round to an existing draft
    /// </summary>
    /// <remarks>
    /// Creates a new round with picks for each manager, handling snake draft ordering if enabled.
    /// Automatically calculates pick numbers and overall pick numbers.
    /// </remarks>
    /// <param name="draftId">The ID of the draft to add a round to</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error adding round</response>
    [HttpPost("{draftId}/addRound")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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
            var totalManagers = draft.DraftOrder.Length;
            var roundPicks = new DraftPosition[totalManagers];

            for (int j = 0; j < totalManagers; j++)
            {
                var originalPosition = draft.DraftOrder[j];
                var newPosition = new DraftPosition
                {
                    ManagerId = originalPosition.ManagerId,
                    PickNumber = originalPosition.PickNumber,
                    IsComplete = false
                };

                if (draft.IsSnakeDraft && newRoundNumber % 2 == 0)
                {
                    // Even rounds (snake back)
                    newPosition.OverallPickNumber = (newRoundNumber * totalManagers) - j;
                    roundPicks[totalManagers - 1 - j] = newPosition;  // Reverse array position
                }
                else
                {
                    // Odd rounds (normal order)
                    newPosition.OverallPickNumber = ((newRoundNumber - 1) * totalManagers) + j + 1;
                    roundPicks[j] = newPosition;  // Normal array position
                }
            }

            var newRound = new DraftRound
            {
                RoundNumber = newRoundNumber,
                Picks = roundPicks
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

    /// <summary>
    /// Removes the last round from a draft
    /// </summary>
    /// <remarks>
    /// Removes the highest numbered round from the draft. Cannot remove rounds that contain completed picks.
    /// </remarks>
    /// <param name="draftId">The ID of the draft to remove a round from</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="400">Cannot remove round with completed picks</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error removing round</response>
    [HttpPost("{draftId}/removeRound")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 400)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

    /// <summary>
    /// Resets a draft to its initial state
    /// </summary>
    /// <remarks>
    /// Clears all completed picks, resets pick tracking to round 1, pick 1, and resets draft status for all players.
    /// Both current and active picks are reset to the start.
    /// </remarks>
    /// <param name="draftId">The ID of the draft to reset</param>
    /// <response code="200">Returns true if reset successful</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error resetting draft</response>
    [HttpPost("{draftId}/reset")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
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

            // Reset pick tracking to initial state
            draft.CurrentRound = 1;
            draft.CurrentPick = 1;
            draft.CurrentOverallPick = 1;
            draft.ActiveRound = 1;
            draft.ActivePick = 1;
            draft.ActiveOverallPick = 1;

            await _draftService.UpdateAsync(draft);

            // Reset draft status for players in this draft
            await _playerService.ResetDraftStatusAsync(draftId);

            return Ok(new { value = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting draft");
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
    /// <param name="draftId">The ID of the draft to delete</param>
    /// <response code="200">Returns true if deletion successful</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error deleting draft</response>
    [HttpDelete("{draftId}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> DeleteDraft(string draftId)
    {
        try
        {
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                return NotFound(new { message = "Draft not found" });
            }

            // Reset draft status for players before deleting the draft
            await _playerService.ResetDraftStatusAsync(draftId);
            await _draftService.DeleteAsync(draftId);
            return Ok(new { value = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting draft");
            return StatusCode(500, new { message = "Error deleting draft" });
        }
    }

    /// <summary>
    /// Toggles the active status of a draft
    /// </summary>
    /// <remarks>
    /// Activates or deactivates a draft. When activating a draft, any currently active draft will be deactivated
    /// as only one draft can be active at a time.
    /// </remarks>
    /// <param name="draftId">The ID of the draft to toggle active status</param>
    /// <response code="200">Returns the updated Draft object</response>
    /// <response code="404">Draft not found</response>
    /// <response code="500">Internal server error toggling draft status</response>
    [HttpPost("{draftId}/toggleActive")]
    [ProducesResponseType(typeof(ApiResponse<Draft>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 404)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public async Task<IActionResult> ToggleActive(string draftId)
    {
        try
        {
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                return NotFound(new { message = "Draft not found" });
            }

            // If we're activating this draft, deactivate any other active draft
            if (!draft.IsActive)
            {
                var activeDraft = await _draftService.GetActiveDraftAsync();
                if (activeDraft != null)
                {
                    activeDraft.IsActive = false;
                    await _draftService.UpdateAsync(activeDraft);
                }
            }

            // Toggle the active status
            draft.IsActive = !draft.IsActive;
            await _draftService.UpdateAsync(draft);

            return Ok(new { value = draft });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling draft active status");
            return StatusCode(500, new { message = "Error toggling draft active status" });
        }
    }

    /// <summary>
    /// Updates the active pick in the current draft
    /// </summary>
    /// <remarks>
    /// Sets the active pick to a specific round and pick number. Used for manual pick selection and navigation.
    /// Updates both the active pick state and refreshes the draft state.
    /// </remarks>
    /// <param name="request">Contains the round, pick, and overall pick number to set as active</param>
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
            if (_enableConsoleLogging) Console.WriteLine($"Updating active pick to Round {request.Round}, Pick {request.Pick}");
            _logger.LogInformation("Updating active pick to Round {round}, Pick {pick}", request.Round, request.Pick);

            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                if (_enableConsoleLogging) Console.WriteLine("No active draft found");
                return NotFound(new { message = "No active draft found" });
            }

            // Update pick state using our new method
            var updatedPick = await _draftService.UpdateCurrentPickAsync(request.Round, request.Pick, request.OverallPickNumber);
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
}
