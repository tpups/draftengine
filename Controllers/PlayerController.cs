using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using DraftEngine.Services;

namespace DraftEngine.Controllers
{
    /// <summary>
    /// Controller for managing baseball player data and operations
    /// </summary>
    /// <remarks>
    /// This controller provides endpoints for:
    /// - Basic CRUD operations on player records
    /// - Player filtering and search operations
    /// - Draft-related player operations
    /// - Personal tracking and notes
    /// - Data import operations (CSV, JSON)
    /// - Birthdate verification through MLB Stats API
    /// 
    /// Key Features:
    /// - Comprehensive player management
    /// - Draft status tracking
    /// - Personal notes and rankings
    /// - Bulk import capabilities
    /// - Data verification and validation
    /// 
    /// Error Handling:
    /// - Returns appropriate HTTP status codes
    /// - Provides detailed error messages
    /// - Logs errors for debugging
    /// - Validates input parameters
    /// </remarks>
    [ApiController]
    [Route("[controller]")]
    [Produces("application/json")]
    [ApiExplorerSettings(GroupName = "v1")]
    public class PlayerController : ControllerBase
    {
        private readonly PlayerService _playerService;
        private readonly DraftService _draftService;
        private readonly ILogger<PlayerController> _logger;

        public PlayerController(
            PlayerService playerService, 
            DraftService draftService,
            ILogger<PlayerController> logger)
        {
            _playerService = playerService;
            _draftService = draftService;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves a paginated list of all players from the database
        /// </summary>
        /// <remarks>
        /// Returns a paginated list of all players, including:
        /// - Basic player information
        /// - Draft status
        /// - Rankings and grades
        /// - Personal notes and highlights
        /// 
        /// Pagination parameters:
        /// - pageNumber: The page number to retrieve (1-based)
        /// - pageSize: The number of items per page
        /// </remarks>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>Paginated list of all players in the database</returns>
        /// <response code="200">Successfully retrieved the list of players</response>
        /// <response code="500">If there was an internal server error</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> Get(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get all players (Page {Page}, Size {Size})", 
                    pageNumber, pageSize);

                var result = await _playerService.GetPaginatedAsync(pageNumber, pageSize);
                
                _logger.LogInformation(
                    "Retrieved {Total} players (Page {Page} of {TotalPages})", 
                    result.TotalCount, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all players");
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves a specific player by their unique identifier
        /// </summary>
        /// <remarks>
        /// Returns detailed player information including:
        /// - Basic player details (name, position, team)
        /// - Draft status and history
        /// - Rankings from various sources
        /// - Scouting grades and risk assessments
        /// - Personal notes and rankings
        /// 
        /// The ID must be a valid 24-character MongoDB ObjectId
        /// </remarks>
        /// <param name="id">The unique identifier of the player to retrieve</param>
        /// <returns>The requested player's complete information</returns>
        /// <response code="200">Successfully retrieved the player</response>
        /// <response code="404">If no player was found with the specified ID</response>
        /// <response code="400">If the ID format is invalid</response>
        [HttpGet("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiResponse<Player>>> Get(string id)
        {
            try
            {
                _logger.LogInformation("Attempting to get player {PlayerId}", id);

                var player = await _playerService.GetAsync(id);

                if (player is null)
                {
                    _logger.LogWarning("Player {PlayerId} not found", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                _logger.LogInformation("Successfully retrieved player {PlayerId}", id);
                return Ok(ApiResponse<Player>.Create(player));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Creates a new player record in the database
        /// </summary>
        /// <remarks>
        /// Creates a new player with the following behavior:
        /// - Initializes all required collections and fields
        /// - Sets creation timestamp
        /// - Handles duplicate detection based on name and birthdate
        /// - Merges data if duplicate is found
        /// 
        /// Required fields:
        /// - Name
        /// - Position (array, can be empty)
        /// 
        /// Optional fields are initialized to empty collections if null:
        /// - ExternalIds (dictionary)
        /// - Rank (dictionary)
        /// - ProspectRank (dictionary)
        /// - ProspectRisk (dictionary)
        /// - ScoutingGrades (dictionary)
        /// - PersonalGrades
        /// </remarks>
        /// <param name="newPlayer">The player data to create</param>
        /// <returns>The newly created player record</returns>
        /// <response code="201">Successfully created the player</response>
        /// <response code="400">If the player data is invalid or missing required fields</response>
        /// <response code="500">If there was an error saving to the database</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Post([FromBody] Player newPlayer)
        {
            try
            {
                _logger.LogInformation("Received player data: {PlayerData}", 
                    JsonConvert.SerializeObject(newPlayer, Formatting.Indented));

                // Initialize collections and required fields if they're null
                newPlayer.LastUpdated = DateTime.UtcNow;
                newPlayer.ExternalIds ??= new Dictionary<string, string>();
                newPlayer.Position ??= Array.Empty<string>();
                newPlayer.Rank ??= new Dictionary<string, int>();
                newPlayer.ProspectRank ??= new Dictionary<string, int>();
                newPlayer.ProspectRisk ??= new Dictionary<string, string>();
                newPlayer.ScoutingGrades ??= new Dictionary<string, ScoutingGrades>();
                newPlayer.PersonalGrades ??= new ScoutingGrades();
                newPlayer.PersonalRiskAssessment ??= string.Empty;

                await _playerService.CreateAsync(newPlayer);
                return CreatedAtAction(nameof(Get), new { id = newPlayer.Id }, newPlayer);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating player");
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing player
        /// </summary>
        /// <param name="id">The ID of the player to update</param>
        /// <param name="updatedPlayer">The updated player data</param>
        /// <returns>No content</returns>
        /// <response code="204">If the player was successfully updated</response>
        /// <response code="404">If the player is not found</response>
        [HttpPut("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string id, Player updatedPlayer)
        {
            try
            {
                _logger.LogInformation("Attempting to update player {PlayerId}", id);

                var player = await _playerService.GetAsync(id);

                if (player is null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to update", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                updatedPlayer.Id = player.Id;
                updatedPlayer.LastUpdated = DateTime.UtcNow;

                await _playerService.UpdateAsync(id, updatedPlayer);

                _logger.LogInformation("Successfully updated player {PlayerId}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Delete a specific player
        /// </summary>
        /// <param name="id">The ID of the player to delete</param>
        /// <returns>No content</returns>
        /// <response code="204">If the player was successfully deleted</response>
        /// <response code="404">If the player is not found</response>
        [HttpDelete("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                _logger.LogInformation("Attempting to delete player {PlayerId}", id);

                var player = await _playerService.GetAsync(id);

                if (player is null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to delete", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                // Check if player is drafted in any active draft
                var activeDraft = await _draftService.GetActiveDraftAsync();
                if (activeDraft != null && player.DraftStatuses?.Any(ds => ds.DraftId == activeDraft.Id) == true)
                {
                    _logger.LogWarning("Cannot delete player {PlayerId} as they are drafted in active draft {DraftId}", id, activeDraft.Id);
                    return Conflict(ApiResponse<string>.Create("Cannot delete player as they are drafted in the active draft"));
                }

                await _playerService.RemoveAsync(id);

                _logger.LogInformation("Successfully deleted player {PlayerId}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Deletes all players from the database
        /// </summary>
        /// <returns>A message indicating how many players were deleted</returns>
        /// <response code="200">Returns the number of players deleted</response>
        /// <response code="400">If there was an error deleting players</response>
        [HttpDelete("deleteall")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteAll()
        {
            try
            {
                _logger.LogInformation("Attempting to delete all players");
                var deletedCount = await _playerService.DeleteAllAsync();
                _logger.LogInformation("Successfully deleted {Count} players", deletedCount);
                return Ok(new { message = $"Successfully deleted {deletedCount} players" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting all players");
                return BadRequest(new { error = ex.Message });
            }
        }

        // Filtering endpoints
        private JsonSerializerSettings GetJsonSettings() => new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver(),
            Formatting = Formatting.Indented,
            NullValueHandling = NullValueHandling.Include
        };

        /// <summary>
        /// Retrieves players by their competition level
        /// </summary>
        /// <remarks>
        /// Returns players at a specific competition level:
        /// - MLB (Major League Baseball)
        /// - AAA (Triple-A)
        /// - AA (Double-A)
        /// - A+ (High-A)
        /// - A (Single-A)
        /// - ROK (Rookie Ball)
        /// 
        /// Results include all player information and are sorted by name.
        /// Returns an empty list if no players are found at the specified level.
        /// </remarks>
        /// <param name="level">The competition level to filter by</param>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>List of players at the specified level</returns>
        /// <response code="200">Successfully retrieved the list of players</response>
        /// <response code="400">If the level parameter is invalid</response>
        [HttpGet("byLevel/{level}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> GetByLevel(
            string level,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get players at level {Level} (Page {Page}, Size {Size})", 
                    level, pageNumber, pageSize);

                if (string.IsNullOrWhiteSpace(level))
                {
                    _logger.LogWarning("No competition level provided");
                    return BadRequest(ApiResponse<string>.Create("Competition level is required"));
                }

                var result = await _playerService.GetByLevelPaginatedAsync(level, pageNumber, pageSize);
                
                _logger.LogInformation(
                    "Found {Total} players at level {Level} (Page {Page} of {TotalPages})", 
                    result.TotalCount, level, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving players at level {Level}", level);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves players by their team affiliation
        /// </summary>
        /// <remarks>
        /// Returns players affiliated with a specific MLB team:
        /// - Uses standard MLB team abbreviations (e.g., NYY, LAD, BOS)
        /// - Includes both major league and minor league players
        /// - Results are sorted by level (MLB first, then minors)
        /// - Returns an empty list if no players are found
        /// 
        /// Team abbreviations are case-insensitive.
        /// </remarks>
        /// <param name="team">The three-letter MLB team abbreviation</param>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>List of players on the specified team</returns>
        /// <response code="200">Successfully retrieved the list of players</response>
        /// <response code="400">If the team abbreviation is invalid</response>
        [HttpGet("byTeam/{team}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> GetByTeam(
            string team,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get players for team {Team} (Page {Page}, Size {Size})", 
                    team, pageNumber, pageSize);

                if (string.IsNullOrWhiteSpace(team))
                {
                    _logger.LogWarning("No team abbreviation provided");
                    return BadRequest(ApiResponse<string>.Create("Team abbreviation is required"));
                }

                if (team.Length != 3)
                {
                    _logger.LogWarning("Invalid team abbreviation length: {Team}", team);
                    return BadRequest(ApiResponse<string>.Create("Team abbreviation must be 3 characters"));
                }

                var result = await _playerService.GetByTeamPaginatedAsync(team.ToUpperInvariant(), pageNumber, pageSize);
                
                _logger.LogInformation(
                    "Found {Total} players for team {Team} (Page {Page} of {TotalPages})", 
                    result.TotalCount, team, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving players for team {Team}", team);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves players by their primary or secondary position
        /// </summary>
        /// <remarks>
        /// Returns players who can play a specific position:
        /// 
        /// Position codes:
        /// - Infield: 1B, 2B, 3B, SS
        /// - Outfield: LF, CF, RF, OF (any outfield)
        /// - Battery: C, SP, RP
        /// - General: UTIL (utility players), DH
        /// 
        /// Players may appear in multiple position searches if they:
        /// - Have multiple positions listed
        /// - Are utility players
        /// - Have positional flexibility
        /// 
        /// Results are sorted by primary position first.
        /// </remarks>
        /// <param name="position">The position code to filter by</param>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>List of players at the specified position</returns>
        /// <response code="200">Successfully retrieved the list of players</response>
        /// <response code="400">If the position code is invalid</response>
        [HttpGet("byPosition/{position}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> GetByPosition(
            string position,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get players at position {Position} (Page {Page}, Size {Size})", 
                    position, pageNumber, pageSize);

                if (string.IsNullOrWhiteSpace(position))
                {
                    _logger.LogWarning("No position code provided");
                    return BadRequest(ApiResponse<string>.Create("Position code is required"));
                }

                // Validate position code
                var validPositions = new[] { "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "C", "SP", "RP", "UTIL", "DH" };
                if (!validPositions.Contains(position.ToUpperInvariant()))
                {
                    _logger.LogWarning("Invalid position code provided: {Position}", position);
                    return BadRequest(ApiResponse<string>.Create("Invalid position code. Valid codes are: " + string.Join(", ", validPositions)));
                }

                var result = await _playerService.GetByPositionPaginatedAsync(position.ToUpperInvariant(), pageNumber, pageSize);
                
                _logger.LogInformation(
                    "Found {Total} players at position {Position} (Page {Page} of {TotalPages})", 
                    result.TotalCount, position, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving players at position {Position}", position);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves all players who have not been drafted in the active draft
        /// </summary>
        /// <remarks>
        /// Returns players who:
        /// - Have no draft status for the active draft
        /// - Are available to be drafted
        /// - May have been drafted in previous drafts
        /// 
        /// Results are sorted by:
        /// 1. Personal rank (if set)
        /// 2. Default ranking source
        /// 3. Name
        /// 
        /// This endpoint is commonly used during draft operations to:
        /// - Show available players
        /// - Filter draft pools
        /// - Prepare draft boards
        /// </remarks>
        /// <returns>List of players available for drafting</returns>
        /// <response code="200">Successfully retrieved the list of undrafted players</response>
        /// <response code="400">If there is no active draft</response>
        [HttpGet("undrafted")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> GetUndrafted(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get undrafted players (Page {Page}, Size {Size})", 
                    pageNumber, pageSize);

                // Verify active draft exists
                var draft = await _draftService.GetActiveDraftAsync();
                if (draft == null)
                {
                    _logger.LogWarning("No active draft found when attempting to get undrafted players");
                    return BadRequest(ApiResponse<string>.Create("No active draft found"));
                }

                var result = await _playerService.GetUndraftedPlayersPaginatedAsync(pageNumber, pageSize);
                
                _logger.LogInformation(
                    "Found {Total} undrafted players (Page {Page} of {TotalPages})", 
                    result.TotalCount, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving undrafted players");
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves all players marked as highlighted for special tracking
        /// </summary>
        /// <remarks>
        /// Returns players that have been highlighted for:
        /// - Personal interest
        /// - Draft targeting
        /// - Special monitoring
        /// - Watch list inclusion
        /// 
        /// Results are sorted by:
        /// 1. Personal rank (if set)
        /// 2. Default ranking source
        /// 3. Name
        /// 
        /// Highlighting is a personal tracking feature that:
        /// - Persists across sessions
        /// - Is independent of draft status
        /// - Can be toggled on/off
        /// - Helps organize draft preparation
        /// </remarks>
        /// <returns>List of highlighted players</returns>
        /// <response code="200">Successfully retrieved the list of highlighted players</response>
        [HttpGet("highlighted")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> GetHighlighted(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get highlighted players (Page {Page}, Size {Size})", 
                    pageNumber, pageSize);

                var result = await _playerService.GetHighlightedPlayersPaginatedAsync(pageNumber, pageSize);
                
                _logger.LogInformation(
                    "Found {Total} highlighted players (Page {Page} of {TotalPages})", 
                    result.TotalCount, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving highlighted players");
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        // Draft management endpoints
        /// <summary>
        /// Marks a player as drafted in the active draft
        /// </summary>
        /// <remarks>
        /// Updates a player's draft status with the following behavior:
        /// - Verifies an active draft exists
        /// - Validates the player exists and can be drafted
        /// - Records the draft details (manager, round, pick)
        /// - Updates the player's draft status
        /// - Maintains draft history for multiple drafts
        /// 
        /// Draft Status Updates:
        /// - Removes any existing status for this draft
        /// - Adds new status with current draft details
        /// - Records overall pick number
        /// - Preserves status from other drafts
        /// 
        /// The operation will fail if:
        /// - No active draft exists
        /// - Player is not found
        /// - Player is already drafted in this draft
        /// - Draft pick details are invalid
        /// </remarks>
        /// <param name="id">The unique identifier of the player to mark as drafted</param>
        /// <param name="request">Draft pick details including manager, round, and pick numbers</param>
        /// <returns>No content on success</returns>
        /// <response code="204">Successfully marked the player as drafted</response>
        /// <response code="400">If no active draft exists or the request is invalid</response>
        /// <response code="404">If the player was not found</response>
        /// <response code="409">If the player is already drafted in this draft</response>
        [HttpPost("{id:length(24)}/draft")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> MarkAsDrafted(string id, [FromBody] DraftPickRequest request)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to mark player {PlayerId} as drafted in round {Round} pick {Pick} ({OverallPick} overall) by manager {ManagerId}", 
                    id, request.Round, request.Pick, request.OverallPick, request.DraftedBy);

                // Get the active draft
                var draft = await _draftService.GetActiveDraftAsync();
                if (draft == null)
                {
                    _logger.LogWarning("No active draft found when attempting to mark player {PlayerId} as drafted", id);
                    return BadRequest(ApiResponse<string>.Create("No active draft found"));
                }

                // Verify player exists
                var player = await _playerService.GetAsync(id);
                if (player == null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to mark as drafted", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                // Check if player is already drafted in this draft
                if (player.DraftStatuses?.Any(ds => ds.DraftId == draft.Id) == true)
                {
                    _logger.LogWarning("Player {PlayerId} is already drafted in draft {DraftId}", id, draft.Id);
                    return Conflict(ApiResponse<string>.Create("Player is already drafted in this draft"));
                }

                var success = await _playerService.MarkAsDraftedAsync(id, request);
                if (!success)
                {
                    _logger.LogError("Failed to mark player {PlayerId} as drafted", id);
                    return StatusCode(500, ApiResponse<string>.Create("Failed to update player draft status"));
                }

                _logger.LogInformation("Successfully marked player {PlayerId} as drafted", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking player {PlayerId} as drafted", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Removes a player's draft status from the active draft
        /// </summary>
        /// <remarks>
        /// Undrafts a player with the following behavior:
        /// - Verifies an active draft exists
        /// - Validates the player exists
        /// - Removes only the draft status for the active draft
        /// - Preserves draft history from other drafts
        /// - Updates related draft statistics
        /// 
        /// This operation:
        /// - Makes the player available for drafting again
        /// - Does not affect other draft records
        /// - Updates pick availability
        /// - Maintains draft integrity
        /// 
        /// The operation will fail if:
        /// - No active draft exists
        /// - Player is not found
        /// - Player is not drafted in the active draft
        /// </remarks>
        /// <param name="id">The unique identifier of the player to undraft</param>
        /// <returns>No content on success</returns>
        /// <response code="204">Successfully removed the player's draft status</response>
        /// <response code="400">If no active draft exists</response>
        /// <response code="404">If the player was not found</response>
        /// <response code="409">If the player is not drafted in the active draft</response>
        [HttpPost("{id:length(24)}/undraft")]
        [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UndraftPlayer(string id)
        {
            try
            {
                _logger.LogInformation("Attempting to undraft player {PlayerId}", id);

                // Get the active draft
                var draft = await _draftService.GetActiveDraftAsync();
                if (draft == null)
                {
                    _logger.LogWarning("No active draft found when attempting to undraft player {PlayerId}", id);
                    return BadRequest(ApiResponse<string>.Create("No active draft found"));
                }

                // Verify player exists
                var player = await _playerService.GetAsync(id);
                if (player == null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to undraft", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                // Check if player is drafted in this draft
                if (player.DraftStatuses?.Any(ds => ds.DraftId == draft.Id) != true)
                {
                    _logger.LogWarning("Player {PlayerId} is not drafted in draft {DraftId}", id, draft.Id);
                    return Conflict(ApiResponse<string>.Create("Player is not drafted in this draft"));
                }

                var success = await _playerService.UndraftPlayerAsync(id);
                if (!success)
                {
                    _logger.LogError("Failed to undraft player {PlayerId}", id);
                    return StatusCode(500, ApiResponse<string>.Create("Failed to update player draft status"));
                }

                _logger.LogInformation("Successfully undrafted player {PlayerId}", id);
                return Ok(ApiResponse<bool>.Create(true));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error undrafting player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Resets draft status for all players in a specific draft
        /// </summary>
        /// <remarks>
        /// Performs a bulk reset operation that:
        /// - Removes draft status entries for the specified draft
        /// - Preserves draft history from other drafts
        /// - Updates all affected players
        /// - Maintains data consistency
        /// 
        /// This operation is typically used when:
        /// - Restarting a draft
        /// - Correcting draft errors
        /// - Testing draft scenarios
        /// - Clearing draft history
        /// 
        /// The operation:
        /// - Is atomic (all or nothing)
        /// - Logs all changes
        /// - Returns count of affected players
        /// - Maintains data integrity
        /// </remarks>
        /// <param name="draftId">The unique identifier of the draft to reset</param>
        /// <returns>Message indicating how many players were reset</returns>
        /// <response code="200">Successfully reset draft status, returns count of affected players</response>
        /// <response code="400">If the draft ID is invalid</response>
        /// <response code="404">If the specified draft was not found</response>
        [HttpPost("{draftId}/reset-draft-status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ResetDraftStatus(string draftId)
        {
            try
            {
                _logger.LogInformation("Attempting to reset draft status for draft {DraftId}", draftId);

                // Verify draft exists
                var draft = await _draftService.GetByIdAsync(draftId);
                if (draft == null)
                {
                    _logger.LogWarning("Draft {DraftId} not found when attempting to reset status", draftId);
                    return NotFound(ApiResponse<string>.Create("Draft not found"));
                }

                var count = await _playerService.ResetDraftStatusAsync(draftId);
                
                _logger.LogInformation("Successfully reset draft status for {Count} players in draft {DraftId}", count, draftId);
                return Ok(ApiResponse<string>.Create($"Reset draft status for {count} players"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting draft status for draft {DraftId}", draftId);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        // Personal tracking endpoints
        /// <summary>
        /// Toggles the highlight status for a player
        /// </summary>
        /// <remarks>
        /// Updates a player's highlight status with the following behavior:
        /// - If currently highlighted, removes highlight
        /// - If not highlighted, adds highlight
        /// - Updates timestamp
        /// - Maintains other player attributes
        /// 
        /// Highlighting is used for:
        /// - Draft preparation
        /// - Player tracking
        /// - Watch list management
        /// - Personal organization
        /// 
        /// The highlight status:
        /// - Persists across sessions
        /// - Is independent of draft status
        /// - Can be toggled repeatedly
        /// - Does not affect other player attributes
        /// </remarks>
        /// <param name="id">The unique identifier of the player to toggle highlight for</param>
        /// <returns>No content on success</returns>
        /// <response code="204">Successfully toggled the highlight status</response>
        /// <response code="404">If the player was not found</response>
        /// <response code="500">If there was an error updating the player</response>
        [HttpPost("{id:length(24)}/toggleHighlight")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleHighlight(string id)
        {
            try
            {
                _logger.LogInformation("Attempting to toggle highlight status for player {PlayerId}", id);

                // Verify player exists
                var player = await _playerService.GetAsync(id);
                if (player == null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to toggle highlight", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                var success = await _playerService.ToggleHighlightAsync(id);
                if (!success)
                {
                    _logger.LogError("Failed to toggle highlight status for player {PlayerId}", id);
                    return StatusCode(500, ApiResponse<string>.Create("Failed to update player highlight status"));
                }

                _logger.LogInformation("Successfully toggled highlight status for player {PlayerId} to {Status}", 
                    id, !player.IsHighlighted);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling highlight status for player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Updates the personal notes for a player
        /// </summary>
        /// <remarks>
        /// Updates a player's personal notes with the following behavior:
        /// - Replaces existing notes with new content
        /// - Updates timestamp
        /// - Maintains other player attributes
        /// 
        /// Personal notes are used for:
        /// - Scouting observations
        /// - Draft strategy notes
        /// - Player development tracking
        /// - Personal reminders
        /// 
        /// Notes handling:
        /// - Can be any length
        /// - Support markdown formatting
        /// - Can be cleared by passing empty string
        /// - Are private to the system
        /// </remarks>
        /// <param name="id">The unique identifier of the player to update notes for</param>
        /// <param name="notes">The new notes content</param>
        /// <returns>No content on success</returns>
        /// <response code="204">Successfully updated the notes</response>
        /// <response code="404">If the player was not found</response>
        /// <response code="500">If there was an error updating the player</response>
        [HttpPut("{id:length(24)}/notes")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateNotes(string id, [FromBody] string notes)
        {
            try
            {
                _logger.LogInformation("Attempting to update notes for player {PlayerId}", id);

                // Verify player exists
                var player = await _playerService.GetAsync(id);
                if (player == null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to update notes", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                var success = await _playerService.UpdateNotesAsync(id, notes);
                if (!success)
                {
                    _logger.LogError("Failed to update notes for player {PlayerId}", id);
                    return StatusCode(500, ApiResponse<string>.Create("Failed to update player notes"));
                }

                _logger.LogInformation("Successfully updated notes for player {PlayerId}", id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating notes for player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Updates the personal ranking for a player
        /// </summary>
        /// <remarks>
        /// Updates a player's personal rank with the following behavior:
        /// - Sets new rank value
        /// - Updates timestamp
        /// - Maintains other player attributes
        /// 
        /// Personal rankings are used for:
        /// - Draft board organization
        /// - Player prioritization
        /// - Custom sorting
        /// - Draft strategy planning
        /// 
        /// Ranking behavior:
        /// - Can be any positive integer
        /// - Lower numbers indicate higher rank
        /// - Multiple players can have same rank
        /// - Can be cleared by setting to 0
        /// - Used for sorting in various views
        /// </remarks>
        /// <param name="id">The unique identifier of the player to update ranking for</param>
        /// <param name="rank">The new rank value (0 or positive integer)</param>
        /// <returns>No content on success</returns>
        /// <response code="204">Successfully updated the rank</response>
        /// <response code="400">If the rank value is negative</response>
        /// <response code="404">If the player was not found</response>
        /// <response code="500">If there was an error updating the player</response>
        [HttpPut("{id:length(24)}/personalRank")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdatePersonalRank(string id, [FromBody] int rank)
        {
            try
            {
                _logger.LogInformation("Attempting to update personal rank for player {PlayerId} to {Rank}", id, rank);

                if (rank < 0)
                {
                    _logger.LogWarning("Invalid rank value {Rank} provided for player {PlayerId}", rank, id);
                    return BadRequest(ApiResponse<string>.Create("Rank value must be 0 or positive"));
                }

                // Verify player exists
                var player = await _playerService.GetAsync(id);
                if (player == null)
                {
                    _logger.LogWarning("Player {PlayerId} not found when attempting to update rank", id);
                    return NotFound(ApiResponse<string>.Create("Player not found"));
                }

                var success = await _playerService.UpdatePersonalRankAsync(id, rank);
                if (!success)
                {
                    _logger.LogError("Failed to update personal rank for player {PlayerId}", id);
                    return StatusCode(500, ApiResponse<string>.Create("Failed to update player rank"));
                }

                _logger.LogInformation("Successfully updated personal rank for player {PlayerId} to {Rank}", id, rank);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating personal rank for player {PlayerId}", id);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        // Advanced filtering endpoints
        /// <summary>
        /// Retrieves a paginated list of players within a specified age range
        /// </summary>
        /// <remarks>
        /// Returns players whose age falls within the specified range:
        /// - Age is calculated as of current date
        /// - Both minimum and maximum ages are inclusive
        /// - Age is calculated to one decimal place
        /// - Players with no birthdate are excluded
        /// 
        /// Results are sorted by:
        /// 1. Age (youngest to oldest)
        /// 2. Level (highest to lowest)
        /// 3. Name (alphabetically)
        /// 
        /// This endpoint is commonly used for:
        /// - Age-based analysis
        /// - Prospect evaluation
        /// - Draft pool filtering
        /// - Development tracking
        /// </remarks>
        /// <param name="minAge">Minimum age in years (inclusive)</param>
        /// <param name="maxAge">Maximum age in years (inclusive)</param>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>Paginated list of players within the specified age range</returns>
        /// <response code="200">Successfully retrieved the list of players</response>
        /// <response code="400">If the age range is invalid</response>
        [HttpGet("byAge")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> GetByAgeRange(
            [FromQuery] int minAge, 
            [FromQuery] int maxAge,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Attempting to get players between ages {MinAge} and {MaxAge} (Page {Page}, Size {Size})", 
                    minAge, maxAge, pageNumber, pageSize);

                if (minAge < 0 || maxAge < 0)
                {
                    _logger.LogWarning("Invalid age range provided: {MinAge} to {MaxAge}", minAge, maxAge);
                    return BadRequest(ApiResponse<string>.Create("Age values must be non-negative"));
                }

                if (minAge > maxAge)
                {
                    _logger.LogWarning("Invalid age range: minimum ({MinAge}) greater than maximum ({MaxAge})", 
                        minAge, maxAge);
                    return BadRequest(ApiResponse<string>.Create("Minimum age cannot be greater than maximum age"));
                }

                var minDate = DateTime.Today.AddYears(-maxAge);
                var maxDate = DateTime.Today.AddYears(-minAge);
                var filter = Builders<Player>.Filter.And(
                    Builders<Player>.Filter.Gte(p => p.BirthDate, minDate),
                    Builders<Player>.Filter.Lte(p => p.BirthDate, maxDate)
                );

                var result = await _playerService.GetPaginatedAsync(pageNumber, pageSize, filter);
                
                _logger.LogInformation(
                    "Found {Total} players between ages {MinAge} and {MaxAge} (Page {Page} of {TotalPages})", 
                    result.TotalCount, minAge, maxAge, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving players by age range {MinAge} to {MaxAge}", minAge, maxAge);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Verifies and updates player birthdates using MLB Stats API
        /// </summary>
        /// <remarks>
        /// Performs birthdate verification with the following behavior:
        /// - Checks MLB Stats API for each player with an MLBAM ID
        /// - Updates birthdates that differ from API data
        /// - Optionally includes players with existing birthdates
        /// - Maintains verification history
        /// 
        /// Verification Process:
        /// - Retrieves player info from MLB Stats API
        /// - Validates and parses birthdate data
        /// - Updates player records if needed
        /// - Tracks success/failure for each player
        /// 
        /// The operation:
        /// - Can be run multiple times
        /// - Is safe for concurrent access
        /// - Logs all changes
        /// - Provides detailed results
        /// 
        /// Common use cases:
        /// - Initial data population
        /// - Data verification
        /// - Error correction
        /// - Bulk updates
        /// </remarks>
        /// <param name="request">Parameters controlling the verification process</param>
        /// <returns>Detailed results of the verification process</returns>
        /// <response code="200">Successfully completed verification</response>
        /// <response code="400">If the request is invalid</response>
        /// <response code="500">If there was an error during verification</response>
        /// <summary>
        /// Updates position stats for players using MLB Stats API
        /// </summary>
        /// <remarks>
        /// For each player with an MLB ID and debut date:
        /// - Fetches fielding stats for each season from debut through 2024
        /// - Records games played at each position per season
        /// - Updates player record with position history
        /// - Maintains detailed update history
        /// 
        /// The operation:
        /// - Can be run multiple times
        /// - Is safe for concurrent access
        /// - Logs all changes
        /// - Provides detailed results
        /// </remarks>
        /// <param name="request">Parameters controlling the update process</param>
        /// <returns>Detailed results of the update process</returns>
        /// <response code="200">Successfully completed update</response>
        /// <response code="400">If the request is invalid</response>
        /// <response code="500">If there was an error during update</response>
        [HttpPost("update-positions")]
        [ProducesResponseType(typeof(ApiResponse<PositionUpdateResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdatePositionStats([FromBody] PositionUpdateRequest request)
        {
            try
            {
                _logger.LogInformation("Starting position stats update process. Include existing: {IncludeExisting}", 
                    request.IncludeExisting);

                var result = await _playerService.UpdatePositionStatsAsync(request.IncludeExisting);
                
                _logger.LogInformation(
                    "Position stats update completed. Total: {Total}, Processed: {Processed}, " + 
                    "Updated: {Updated}, Failed: {Failed}, Skipped: {Skipped}", 
                    result.TotalPlayers,
                    result.ProcessedCount,
                    result.UpdatedCount,
                    result.FailedCount,
                    result.TotalPlayers - result.ProcessedCount);

                if (result.Errors.Any())
                {
                    _logger.LogWarning("Update completed with {Count} errors", result.Errors.Count);
                    foreach (var error in result.Errors)
                    {
                        _logger.LogWarning("Update error: {Error}", error);
                    }
                }

                return Ok(ApiResponse<PositionUpdateResult>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during position stats update process");
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        [HttpPost("verify-birthdates")]
        [ProducesResponseType(typeof(ApiResponse<BirthDateVerificationResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyBirthDates([FromBody] BirthDateVerificationRequest request)
        {
            try
            {
                _logger.LogInformation("Starting birthdate verification process. Include existing: {IncludeExisting}", 
                    request.IncludeExisting);

                // Get total player count for progress tracking
                var totalPlayers = (await _playerService.GetAsync()).Count;
                _logger.LogInformation("Found {Count} total players to process", totalPlayers);

                var result = await _playerService.VerifyBirthDatesAsync(request.IncludeExisting);
                
                _logger.LogInformation(
                    "Birthdate verification completed. Total: {Total}, Processed: {Processed}, " + 
                    "Updated: {Updated}, Failed: {Failed}, Skipped: {Skipped}", 
                    result.TotalPlayers,
                    result.ProcessedCount,
                    result.UpdatedCount,
                    result.FailedCount,
                    result.TotalPlayers - result.ProcessedCount);

                if (result.Errors.Any())
                {
                    _logger.LogWarning("Verification completed with {Count} errors", result.Errors.Count);
                    foreach (var error in result.Errors)
                    {
                        _logger.LogWarning("Verification error: {Error}", error);
                    }
                }

                if (result.Updates.Any())
                {
                    _logger.LogInformation("Successfully updated {Count} player birthdates", 
                        result.Updates.Count(u => u.WasUpdated));
                }

                return Ok(ApiResponse<BirthDateVerificationResult>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during birthdate verification process");
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        /// <summary>
        /// Searches for players by name
        /// </summary>
        /// <remarks>
        /// Returns players whose names match the search term:
        /// - Case-insensitive search
        /// - Partial matches supported
        /// - Results are paginated
        /// - Sorted by relevance
        /// 
        /// Common use cases:
        /// - Quick player lookup
        /// - Draft preparation
        /// - Player comparison
        /// </remarks>
        /// <param name="searchTerm">The term to search for in player names</param>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>List of players matching the search term</returns>
        /// <response code="200">Successfully retrieved matching players</response>
        /// <response code="400">If the search term is empty or invalid</response>
        [HttpGet("search")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<PaginatedResult<Player>>>> SearchPlayers(
            [FromQuery] string? searchTerm = null,
            [FromQuery] bool excludeDrafted = false,
            [FromQuery] string[] teams = null,
            [FromQuery] int minAge = 18,
            [FromQuery] int maxAge = 40,
            [FromQuery] string[] levels = null,
            [FromQuery] string playerType = "all",
            [FromQuery] string position = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 100)
        {
            try
            {
                _logger.LogInformation(
                    "Searching for players with term '{SearchTerm}' (Page {Page}, Size {Size})", 
                    searchTerm, pageNumber, pageSize);


                if (playerType != "all" && playerType != "pitchers" && playerType != "hitters")
                {
                    _logger.LogWarning("Invalid player type provided: {PlayerType}", playerType);
                    return BadRequest(ApiResponse<string>.Create("Player type must be 'all', 'pitchers', or 'hitters'"));
                }

                var result = await _playerService.SearchPlayersPaginatedAsync(
                    searchTerm, 
                    excludeDrafted,
                    teams,
                    minAge,
                    maxAge,
                    levels,
                    playerType,
                    position,
                    pageNumber, 
                    pageSize);
                
                _logger.LogInformation(
                    "Found {Total} players matching '{SearchTerm}' (Page {Page} of {TotalPages})", 
                    result.TotalCount, searchTerm, result.CurrentPage, result.TotalPages);
                return Ok(ApiResponse<PaginatedResult<Player>>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching players with term '{SearchTerm}'", searchTerm);
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }

        // Import operations
    /// <summary>
    /// Import players from a CSV file
    /// </summary>
    /// <param name="request">The import request containing the CSV file and import parameters</param>
    /// <returns>A message indicating the import result</returns>
    /// <response code="200">Returns success message with number of players imported</response>
    /// <response code="400">If the file is empty or invalid</response>
    [HttpPost("importcsv")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ImportCsv([FromForm] CsvImportRequest request)
        {
            try
            {
                _logger.LogInformation("Received CSV import request: {FileName}, Source: {Source}, Type: {Type}, Count: {Count}", 
                    request.File.FileName, request.DataSource, request.DataType, request.PlayerCount);

                if (request.File == null || request.File.Length == 0)
                {
                    _logger.LogWarning("Empty or missing file in CSV import request");
                    return BadRequest(ApiResponse<string>.Create("CSV file is required and cannot be empty"));
                }

                if (string.IsNullOrWhiteSpace(request.DataSource))
                {
                    _logger.LogWarning("Missing data source in CSV import request");
                    return BadRequest(ApiResponse<string>.Create("Data source is required"));
                }

                if (string.IsNullOrWhiteSpace(request.DataType))
                {
                    _logger.LogWarning("Missing data type in CSV import request");
                    return BadRequest(ApiResponse<string>.Create("Data type is required"));
                }

                if (request.PlayerCount <= 0)
                {
                    _logger.LogWarning("Invalid player count in CSV import request: {Count}", request.PlayerCount);
                    return BadRequest(ApiResponse<string>.Create("Player count must be greater than 0"));
                }

                using var reader = new StreamReader(request.File.OpenReadStream());
                var csvContent = await reader.ReadToEndAsync();

                var records = CsvPlayerImport.ParseCsvContent(csvContent, request.PlayerCount);

                if (records.Count == 0)
                {
                    _logger.LogWarning("No valid records found in CSV file: {FileName}", request.File.FileName);
                    return BadRequest(ApiResponse<string>.Create("No valid records found in CSV file"));
                }

                if (records.Count < request.PlayerCount)
                {
                    _logger.LogWarning("Insufficient records in CSV file. Expected: {Expected}, Found: {Found}", 
                        request.PlayerCount, records.Count);
                    return BadRequest(ApiResponse<string>.Create(
                        $"Insufficient records in CSV file. Expected {request.PlayerCount} players but found only {records.Count}"));
                }

                var importDate = DateTime.UtcNow;
                var players = records.Select(r => CsvPlayerImport.MapToPlayer(r, request.DataSource, request.DataType, importDate)).ToList();

                // Initialize collections and required fields for each player
                foreach (var player in players)
                {
                    player.Position ??= Array.Empty<string>();
                    player.Rank ??= new Dictionary<string, int>();
                    player.ProspectRank ??= new Dictionary<string, int>();
                    player.ProspectRisk ??= new Dictionary<string, string>();
                    player.ScoutingGrades ??= new Dictionary<string, ScoutingGrades>();
                    player.PersonalGrades ??= new ScoutingGrades();
                    player.PersonalRiskAssessment ??= string.Empty;
                }

                await _playerService.CreateManyAsync(players);
                _logger.LogInformation("Successfully imported {Count} players from {FileName}", 
                    players.Count, request.File.FileName);
                return Ok(ApiResponse<string>.Create(
                    $"Successfully imported {players.Count} players from {request.File.FileName}"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing CSV file");
                return BadRequest(new { error = ex.Message });
            }
        }

        // Batch operations
        /// <summary>
        /// Import multiple players in a single batch operation
        /// </summary>
        /// <param name="players">List of players to import</param>
        /// <returns>A message indicating the import result</returns>
        /// <response code="200">Returns success message with number of players imported</response>
        /// <response code="400">If the player data is invalid</response>
        [HttpPost("batch")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> BatchImport([FromBody] List<Player> players)
        {
            try
            {
                _logger.LogInformation("Received batch import request with {Count} players", players?.Count ?? 0);

                if (players == null || players.Count == 0)
                {
                    _logger.LogWarning("Empty or missing player list in batch import request");
                    return BadRequest(ApiResponse<string>.Create("Player list is required and cannot be empty"));
                }

                // Validate required fields
                var invalidPlayers = players.Where(p => string.IsNullOrWhiteSpace(p.Name)).ToList();
                if (invalidPlayers.Any())
                {
                    _logger.LogWarning("Found {Count} players missing required name field", invalidPlayers.Count);
                    return BadRequest(ApiResponse<string>.Create("All players must have a name"));
                }

                var now = DateTime.UtcNow;
                // Initialize collections and required fields for each player
                foreach (var player in players)
                {
                    player.LastUpdated = now;
                    player.ExternalIds ??= new Dictionary<string, string>();
                    player.Position ??= Array.Empty<string>();
                    player.Rank ??= new Dictionary<string, int>();
                    player.ProspectRank ??= new Dictionary<string, int>();
                    player.ProspectRisk ??= new Dictionary<string, string>();
                    player.ScoutingGrades ??= new Dictionary<string, ScoutingGrades>();
                    player.PersonalGrades ??= new ScoutingGrades();
                    player.PersonalRiskAssessment ??= string.Empty;
                }

                await _playerService.CreateManyAsync(players);

                _logger.LogInformation("Successfully imported {Count} players in batch", players.Count);
                return Ok(ApiResponse<string>.Create($"Successfully imported {players.Count} players"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing players batch");
                return StatusCode(500, ApiResponse<string>.Create($"Internal server error: {ex.Message}"));
            }
        }
    }
}
