using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using DraftEngine.Models.Data;

namespace DraftEngine.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PlayerController : ControllerBase
    {
        private readonly PlayerService _playerService;
        private readonly ILogger<PlayerController> _logger;

        public PlayerController(PlayerService playerService, ILogger<PlayerController> logger)
        {
            _playerService = playerService;
            _logger = logger;
        }

        // Basic CRUD operations
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<Player>>>> Get()
        {
            var players = await _playerService.GetAsync();
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<ApiResponse<Player>>> Get(string id)
        {
            var player = await _playerService.GetAsync(id);

            if (player is null)
            {
                return NotFound();
            }

            return Ok(ApiResponse<Player>.Create(player));
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Player newPlayer)
        {
            try
            {
                _logger.LogInformation("Received player data: {PlayerData}", 
                    JsonConvert.SerializeObject(newPlayer, Formatting.Indented));

                // Initialize collections and required fields if they're null
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

        [HttpPut("{id:length(24)}")]
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

        [HttpDelete("{id:length(24)}")]
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

        // Filtering endpoints
        private JsonSerializerSettings GetJsonSettings() => new JsonSerializerSettings
        {
            ContractResolver = new CamelCasePropertyNamesContractResolver(),
            Formatting = Formatting.Indented,
            NullValueHandling = NullValueHandling.Include
        };

        [HttpGet("byLevel/{level}")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByLevel(string level)
        {
            var players = await _playerService.GetByLevelAsync(level);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("byTeam/{team}")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByTeam(string team)
        {
            var players = await _playerService.GetByTeamAsync(team);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("byPosition/{position}")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByPosition(string position)
        {
            var players = await _playerService.GetByPositionAsync(position);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("undrafted")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetUndrafted()
        {
            var players = await _playerService.GetUndraftedPlayersAsync();
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("highlighted")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetHighlighted()
        {
            var players = await _playerService.GetHighlightedPlayersAsync();
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        // Draft management endpoints
        [HttpPost("{id:length(24)}/draft")]
        public async Task<IActionResult> MarkAsDrafted(string id, [FromBody] DraftInfo draftInfo)
        {
            var success = await _playerService.MarkAsDraftedAsync(id, draftInfo.DraftedBy, draftInfo.Round, draftInfo.Pick);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        [HttpPost("{id:length(24)}/undraft")]
        public async Task<IActionResult> UndraftPlayer(string id)
        {
            var success = await _playerService.UndraftPlayerAsync(id);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        // Personal tracking endpoints
        [HttpPost("{id:length(24)}/toggleHighlight")]
        public async Task<IActionResult> ToggleHighlight(string id)
        {
            var success = await _playerService.ToggleHighlightAsync(id);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        [HttpPut("{id:length(24)}/notes")]
        public async Task<IActionResult> UpdateNotes(string id, [FromBody] string notes)
        {
            var success = await _playerService.UpdateNotesAsync(id, notes);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        [HttpPut("{id:length(24)}/personalRank")]
        public async Task<IActionResult> UpdatePersonalRank(string id, [FromBody] int rank)
        {
            var success = await _playerService.UpdatePersonalRankAsync(id, rank);
            
            if (!success)
                return NotFound();

            return NoContent();
        }

        // Advanced filtering endpoints
        [HttpGet("byAge")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByAgeRange([FromQuery] int minAge, [FromQuery] int maxAge)
        {
            var players = await _playerService.GetByAgeRangeAsync(minAge, maxAge);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("byETA/{year}")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByETA(int year)
        {
            var players = await _playerService.GetByETAAsync(year);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        [HttpGet("byRiskLevel")]
        public async Task<ActionResult<ApiResponse<List<Player>>>> GetByRiskLevel([FromQuery] string source, [FromQuery] string riskLevel)
        {
            var players = await _playerService.GetByRiskLevelAsync(source, riskLevel);
            return Ok(ApiResponse<List<Player>>.Create(players));
        }

        // Batch operations
        [HttpPost("batch")]
        public async Task<IActionResult> BatchImport([FromBody] List<Player> players)
        {
            try
            {
                _logger.LogInformation("Received batch import request with {Count} players", players.Count);

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
                return Ok(new { message = $"Successfully imported {players.Count} players" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing players batch");
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class DraftInfo
    {
        public string DraftedBy { get; set; } = null!;
        public int Round { get; set; }
        public int Pick { get; set; }
    }
}
