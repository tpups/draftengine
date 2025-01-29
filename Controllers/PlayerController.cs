using Microsoft.AspNetCore.Mvc;

namespace DraftEngine.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class PlayerController : ControllerBase
    {
        private readonly PlayerService _playerService;

        public PlayerController(PlayerService playerService)
        {
            _playerService = playerService;
        }

        // Basic CRUD operations
        [HttpGet]
        public async Task<List<Player>> Get() =>
            await _playerService.GetAsync();

        [HttpGet("{id:length(24)}")]
        public async Task<ActionResult<Player>> Get(string id)
        {
            var player = await _playerService.GetAsync(id);

            if (player is null)
            {
                return NotFound();
            }

            return player;
        }

        [HttpPost]
        public async Task<IActionResult> Post(Player newPlayer)
        {
            await _playerService.CreateAsync(newPlayer);

            return CreatedAtAction(nameof(Get), new { id = newPlayer.Id }, newPlayer);
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
        [HttpGet("byLevel/{level}")]
        public async Task<List<Player>> GetByLevel(string level) =>
            await _playerService.GetByLevelAsync(level);

        [HttpGet("byTeam/{team}")]
        public async Task<List<Player>> GetByTeam(string team) =>
            await _playerService.GetByTeamAsync(team);

        [HttpGet("byPosition/{position}")]
        public async Task<List<Player>> GetByPosition(string position) =>
            await _playerService.GetByPositionAsync(position);

        [HttpGet("undrafted")]
        public async Task<List<Player>> GetUndrafted() =>
            await _playerService.GetUndraftedPlayersAsync();

        [HttpGet("highlighted")]
        public async Task<List<Player>> GetHighlighted() =>
            await _playerService.GetHighlightedPlayersAsync();

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
        public async Task<List<Player>> GetByAgeRange([FromQuery] int minAge, [FromQuery] int maxAge) =>
            await _playerService.GetByAgeRangeAsync(minAge, maxAge);

        [HttpGet("byETA/{year}")]
        public async Task<List<Player>> GetByETA(int year) =>
            await _playerService.GetByETAAsync(year);

        [HttpGet("byRiskLevel")]
        public async Task<List<Player>> GetByRiskLevel([FromQuery] string source, [FromQuery] string riskLevel) =>
            await _playerService.GetByRiskLevelAsync(source, riskLevel);
    }

    public class DraftInfo
    {
        public string DraftedBy { get; set; } = null!;
        public int Round { get; set; }
        public int Pick { get; set; }
    }
}
