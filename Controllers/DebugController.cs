using Microsoft.AspNetCore.Mvc;
using DraftEngine.Services;
using DraftEngine.Models.Data;

namespace DraftEngine.Controllers;

[ApiController]
[Route("[controller]")]
public class DebugController : ControllerBase
{
    private readonly DebugService _debugService;
    private readonly ILogger<DebugController> _logger;

    public DebugController(
        DebugService debugService,
        ILogger<DebugController> logger)
    {
        _debugService = debugService;
        _logger = logger;
    }

    /// <summary>
    /// Gets recent debug logs
    /// </summary>
    /// <remarks>
    /// Returns an array of log entries from the debug service's buffer
    /// </remarks>
    /// <response code="200">Returns array of log entries</response>
    /// <response code="500">Internal server error retrieving logs</response>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(ApiResponse<LogEntry[]>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public IActionResult GetLogs()
    {
        try
        {
            var logs = _debugService.GetRecentLogs();
            return Ok(new { value = logs });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving debug logs");
            return StatusCode(500, new { message = "Error retrieving debug logs" });
        }
    }

    /// <summary>
    /// Clears all debug logs
    /// </summary>
    /// <remarks>
    /// Removes all log entries from the debug service's buffer
    /// </remarks>
    /// <response code="200">Returns success status</response>
    /// <response code="500">Internal server error clearing logs</response>
    [HttpPost("clear")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public IActionResult ClearLogs()
    {
        try
        {
            _debugService.ClearLogs();
            return Ok(new { value = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing debug logs");
            return StatusCode(500, new { message = "Error clearing debug logs" });
        }
    }

    /// <summary>
    /// Logs a new debug message
    /// </summary>
    /// <remarks>
    /// Adds a new log entry to the debug service's buffer
    /// </remarks>
    /// <response code="200">Returns success status</response>
    /// <response code="500">Internal server error logging message</response>
    [HttpPost("log")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<string>), 500)]
    public IActionResult LogMessage([FromBody] LogEntry entry)
    {
        try
        {
            _debugService.AddLog(entry);
            return Ok(new { value = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging debug message");
            return StatusCode(500, new { message = "Error logging debug message" });
        }
    }
}
