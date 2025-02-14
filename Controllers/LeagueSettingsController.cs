using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using DraftEngine.Services;

namespace DraftEngine.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeagueSettingsController : ControllerBase
    {
        private readonly LeagueSettingsService _settingsService;
        private readonly ILogger<LeagueSettingsController> _logger;

        public LeagueSettingsController(
            LeagueSettingsService settingsService,
            ILogger<LeagueSettingsController> logger)
        {
            _settingsService = settingsService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<LeagueSettings>> GetSettings()
        {
            try
            {
                var settings = await _settingsService.GetSettingsAsync();
                return Ok(new ApiResponse<LeagueSettings>(settings));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting league settings");
                return StatusCode(500, "Error retrieving league settings");
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateSettings(LeagueSettings settings)
        {
            try
            {
                await _settingsService.UpdateSettingsAsync(settings);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating league settings");
                return StatusCode(500, "Error updating league settings");
            }
        }
    }
}
