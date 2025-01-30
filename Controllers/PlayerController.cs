using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

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
        public async Task<ActionResult<List<Player>>> Get()
        {
            var players = await _playerService.GetAsync();
            return Ok(players);
        }

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<Player>> Get(string id)
        {
            var player = await _playerService.GetAsync(id);

            if (player is null)
            {
                return NotFound();
            }

            return Ok(player);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Player newPlayer)
        {
            try
            {
                _logger.LogInformation("Received player data: {PlayerData}", 
                    JsonConvert.SerializeObject(newPlayer, Formatting.Indented));

                // Initialize collections if they're null
                newPlayer.Position ??= Array.Empty<string>();
                newPlayer.Rank ??= new Dictionary<string, int>();
                newPlayer.ProspectRank ??= new Dictionary<string, int>();
                newPlayer.ProspectRisk ??= new Dictionary<string, string>();
                newPlayer.ScoutingGrades ??= new Dictionary<string, ScoutingGrades>();

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
        public async Task<ActionResult<List<Player>>> GetByLevel(string level)
        {
            var players = await _playerService.GetByLevelAsync(level);
            return Ok(players);
        }

        [HttpGet("byTeam/{team}")]
        public async Task<ActionResult<List<Player>>> GetByTeam(string team)
        {
            var players = await _playerService.GetByTeamAsync(team);
            return Ok(players);
        }

        [HttpGet("byPosition/{position}")]
        public async Task<ActionResult<List<Player>>> GetByPosition(string position)
        {
            var players = await _playerService.GetByPositionAsync(position);
            return Ok(players);
        }

        [HttpGet("undrafted")]
        public async Task<ActionResult<List<Player>>> GetUndrafted()
        {
            var players = await _playerService.GetUndraftedPlayersAsync();
            return Ok(players);
        }

        [HttpGet("highlighted")]
        public async Task<ActionResult<List<Player>>> GetHighlighted()
        {
            var players = await _playerService.GetHighlightedPlayersAsync();
            return Ok(players);
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
        public async Task<ActionResult<List<Player>>> GetByAgeRange([FromQuery] int minAge, [FromQuery] int maxAge)
        {
            var players = await _playerService.GetByAgeRangeAsync(minAge, maxAge);
            return Ok(players);
        }

        [HttpGet("byETA/{year}")]
        public async Task<ActionResult<List<Player>>> GetByETA(int year)
        {
            var players = await _playerService.GetByETAAsync(year);
            return Ok(players);
        }

        [HttpGet("byRiskLevel")]
        public async Task<ActionResult<List<Player>>> GetByRiskLevel([FromQuery] string source, [FromQuery] string riskLevel)
        {
            var players = await _playerService.GetByRiskLevelAsync(source, riskLevel);
            return Ok(players);
        }
    }

    public class DraftInfo
    {
        public string DraftedBy { get; set; } = null!;
        public int Round { get; set; }
        public int Pick { get; set; }
    }
}
