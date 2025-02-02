using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using DraftEngine.Models.Data;

namespace DraftEngine.Controllers
{
    /// <summary>
    /// Controller for managing baseball player data
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    [Produces("application/json")]
    [ApiExplorerSettings(GroupName = "v1")]
    public class PlayerController : ControllerBase
    {
        private readonly PlayerService _playerService;
        private readonly ILogger<PlayerController> _logger;

        public PlayerController(PlayerService playerService, ILogger<PlayerController> logger)
        {
            _playerService = playerService;
            _logger = logger;
        }

        /// <summary>
        /// Get all players
        /// </summary>
        /// <returns>List of all players in the database</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> Get()
        {
            var players = await _playerService.GetAsync();
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get a specific player by ID
        /// </summary>
        /// <param name="id">The ID of the player to retrieve</param>
        /// <returns>The requested player</returns>
        /// <response code="200">Returns the requested player</response>
        /// <response code="404">If the player is not found</response>
        [HttpGet("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiResponse<Player>>> Get(string id)
        {
            var player = await _playerService.GetAsync(id);

            if (player is null)
            {
                return NotFound();
            }

            return Ok(ApiResponse<Player>.Create(player));
        }

        /// <summary>
        /// Create a new player
        /// </summary>
        /// <param name="newPlayer">The player to create</param>
        /// <returns>The created player</returns>
        /// <response code="201">Returns the newly created player</response>
        /// <response code="400">If the player data is invalid</response>
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
            var player = await _playerService.GetAsync(id);

            if (player is null)
            {
                return NotFound();
            }

            updatedPlayer.Id = player.Id;

            await _playerService.UpdateAsync(id, updatedPlayer);

            return NoContent();
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
            var player = await _playerService.GetAsync(id);

            if (player is null)
            {
                return NotFound();
            }

            await _playerService.RemoveAsync(id);

            return NoContent();
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
        /// Get players by competition level
        /// </summary>
        /// <param name="level">The competition level (e.g., MLB, AAA, AA)</param>
        /// <returns>List of players at the specified level</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet("byLevel/{level}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByLevel(string level)
        {
            var players = await _playerService.GetByLevelAsync(level);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get players by team
        /// </summary>
        /// <param name="team">The team abbreviation (e.g., NYY, LAD)</param>
        /// <returns>List of players on the specified team</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet("byTeam/{team}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByTeam(string team)
        {
            var players = await _playerService.GetByTeamAsync(team);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get players by position
        /// </summary>
        /// <param name="position">The position (e.g., SS, OF, SP)</param>
        /// <returns>List of players at the specified position</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet("byPosition/{position}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByPosition(string position)
        {
            var players = await _playerService.GetByPositionAsync(position);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get all undrafted players
        /// </summary>
        /// <returns>List of players who haven't been drafted</returns>
        /// <response code="200">Returns the list of undrafted players</response>
        [HttpGet("undrafted")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetUndrafted()
        {
            var players = await _playerService.GetUndraftedPlayersAsync();
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get all highlighted players
        /// </summary>
        /// <returns>List of players marked as highlighted</returns>
        /// <response code="200">Returns the list of highlighted players</response>
        [HttpGet("highlighted")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetHighlighted()
        {
            var players = await _playerService.GetHighlightedPlayersAsync();
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        // Draft management endpoints
        /// <summary>
        /// Mark a player as drafted
        /// </summary>
        /// <param name="id">The ID of the player to mark as drafted</param>
        /// <param name="draftInfo">Information about the draft selection</param>
        /// <returns>No content</returns>
        /// <response code="204">If the player was successfully marked as drafted</response>
        /// <response code="404">If the player is not found</response>
        [HttpPost("{id:length(24)}/draft")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> MarkAsDrafted(string id, [FromBody] DraftInfo draftInfo)
        {
            var success = await _playerService.MarkAsDraftedAsync(id, draftInfo.DraftedBy, draftInfo.Round, draftInfo.Pick);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// Remove draft status from a player
        /// </summary>
        /// <param name="id">The ID of the player to undraft</param>
        /// <returns>No content</returns>
        /// <response code="204">If the player was successfully undrafted</response>
        /// <response code="404">If the player is not found</response>
        [HttpPost("{id:length(24)}/undraft")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UndraftPlayer(string id)
        {
            var success = await _playerService.UndraftPlayerAsync(id);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// Reset draft status for all players
        /// </summary>
        /// <returns>A message indicating how many players were reset</returns>
        /// <response code="200">Returns the number of players reset</response>
        [HttpPost("reset-draft-status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> ResetDraftStatus()
        {
            var count = await _playerService.ResetDraftStatusAsync();
            return Ok(new { message = $"Reset draft status for {count} players" });
        }

        // Personal tracking endpoints
        /// <summary>
        /// Toggle highlight status for a player
        /// </summary>
        /// <param name="id">The ID of the player to toggle highlight for</param>
        /// <returns>No content</returns>
        /// <response code="204">If the highlight status was successfully toggled</response>
        /// <response code="404">If the player is not found</response>
        [HttpPost("{id:length(24)}/toggleHighlight")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleHighlight(string id)
        {
            var success = await _playerService.ToggleHighlightAsync(id);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// Update personal notes for a player
        /// </summary>
        /// <param name="id">The ID of the player to update notes for</param>
        /// <param name="notes">The new notes text</param>
        /// <returns>No content</returns>
        /// <response code="204">If the notes were successfully updated</response>
        /// <response code="404">If the player is not found</response>
        [HttpPut("{id:length(24)}/notes")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateNotes(string id, [FromBody] string notes)
        {
            var success = await _playerService.UpdateNotesAsync(id, notes);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// Update personal ranking for a player
        /// </summary>
        /// <param name="id">The ID of the player to update ranking for</param>
        /// <param name="rank">The new rank value</param>
        /// <returns>No content</returns>
        /// <response code="204">If the rank was successfully updated</response>
        /// <response code="404">If the player is not found</response>
        [HttpPut("{id:length(24)}/personalRank")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdatePersonalRank(string id, [FromBody] int rank)
        {
            var success = await _playerService.UpdatePersonalRankAsync(id, rank);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        // Advanced filtering endpoints
        /// <summary>
        /// Get players within a specified age range
        /// </summary>
        /// <param name="minAge">Minimum age (inclusive)</param>
        /// <param name="maxAge">Maximum age (inclusive)</param>
        /// <returns>List of players within the age range</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet("byAge")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByAgeRange([FromQuery] int minAge, [FromQuery] int maxAge)
        {
            var players = await _playerService.GetByAgeRangeAsync(minAge, maxAge);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get players by estimated time of arrival (ETA)
        /// </summary>
        /// <param name="year">The ETA year to filter by</param>
        /// <returns>List of players with the specified ETA</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet("byETA/{year}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByETA(int year)
        {
            var players = await _playerService.GetByETAAsync(year);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Get players by risk level from a specific source
        /// </summary>
        /// <param name="source">The source of the risk assessment</param>
        /// <param name="riskLevel">The risk level to filter by</param>
        /// <returns>List of players with the specified risk level</returns>
        /// <response code="200">Returns the list of players</response>
        [HttpGet("byRiskLevel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByRiskLevel([FromQuery] string source, [FromQuery] string riskLevel)
        {
            var players = await _playerService.GetByRiskLevelAsync(source, riskLevel);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        /// <summary>
        /// Verify and update player birthdates using MLB Stats API
        /// </summary>
        /// <param name="request">The verification request parameters</param>
        /// <returns>Results of the birthdate verification process</returns>
        /// <response code="200">Returns the verification results</response>
        /// <response code="400">If there was an error during verification</response>
        [HttpPost("verify-birthdates")]
        [ProducesResponseType(typeof(ApiResponse<BirthDateVerificationResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyBirthDates([FromBody] BirthDateVerificationRequest request)
        {
            try
            {
                _logger.LogInformation("Starting birthdate verification. Include existing: {IncludeExisting}", 
                    request.IncludeExisting);

                var result = await _playerService.VerifyBirthDatesAsync(request.IncludeExisting);
                
                _logger.LogInformation("Birthdate verification completed. " +
                    "Total: {Total}, Updated: {Updated}, Failed: {Failed}", 
                    result.TotalPlayers, result.UpdatedCount, result.FailedCount);

                return Ok(ApiResponse<BirthDateVerificationResult>.Create(result));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during birthdate verification");
                return BadRequest(ApiResponse<string>.Create(ex.Message));
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

                if (request.File.Length == 0)
                {
                    return BadRequest(new { error = "File is empty" });
                }

                using var reader = new StreamReader(request.File.OpenReadStream());
                var csvContent = await reader.ReadToEndAsync();

                var records = CsvPlayerImport.ParseCsvContent(csvContent, request.PlayerCount);

                if (records.Count == 0)
                {
                    return BadRequest(new { error = "No valid records found in CSV" });
                }

                if (records.Count < request.PlayerCount)
                {
                    return BadRequest(new { error = $"Requested {request.PlayerCount} players but CSV only contains {records.Count} valid records" });
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
                return Ok(new { message = $"Successfully imported {players.Count} players from {request.File.FileName}" });
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
                _logger.LogInformation("Received batch import request with {Count} players", players.Count);

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
                return Ok(new { message = $"Successfully imported {players.Count} players" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing players batch");
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    /// <summary>
    /// Information about a player's draft selection
    /// </summary>
    public class DraftInfo
    {
        /// <summary>
        /// The team that drafted the player
        /// </summary>
        public string DraftedBy { get; set; } = null!;

        /// <summary>
        /// The round in which the player was drafted
        /// </summary>
        public int Round { get; set; }

        /// <summary>
        /// The pick number within the round
        /// </summary>
        public int Pick { get; set; }
    }
}
