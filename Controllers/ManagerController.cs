using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using DraftEngine.Services;
using Newtonsoft.Json;

namespace DraftEngine.Controllers
{
    /// <summary>
    /// Controller for managing draft managers
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    [Produces("application/json")]
    [ApiExplorerSettings(GroupName = "v1")]
    public class ManagerController : ControllerBase
    {
        private readonly ManagerService _managerService;
        private readonly ILogger<ManagerController> _logger;

        public ManagerController(ManagerService managerService, ILogger<ManagerController> logger)
        {
            _managerService = managerService;
            _logger = logger;
        }

        /// <summary>
        /// Get all managers
        /// </summary>
        /// <returns>List of all managers in the database</returns>
        /// <response code="200">Returns the list of managers</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Manager>>>> GetAll()
        {
            var managers = await _managerService.GetAllAsync();
            return Ok(ApiResponse<List<Manager>>.Create(managers));
        }

        /// <summary>
        /// Get a specific manager by ID
        /// </summary>
        /// <param name="id">The ID of the manager to retrieve</param>
        /// <returns>The requested manager</returns>
        /// <response code="200">Returns the requested manager</response>
        /// <response code="404">If the manager is not found</response>
        [HttpGet("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ApiResponse<Manager>>> GetById(string id)
        {
            var manager = await _managerService.GetByIdAsync(id);

            if (manager is null)
            {
                return NotFound(ApiResponse<Manager>.Create(null, $"Manager with ID {id} not found"));
            }

            return Ok(ApiResponse<Manager>.Create(manager));
        }

        /// <summary>
        /// Create a new manager
        /// </summary>
        /// <param name="manager">The manager to create</param>
        /// <returns>The created manager</returns>
        /// <response code="201">Returns the newly created manager</response>
        /// <response code="400">If the manager data is invalid or a user manager already exists</response>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] Manager manager)
        {
            try
            {
                _logger.LogInformation("Received manager data: {ManagerData}", 
                    JsonConvert.SerializeObject(manager, Formatting.Indented));

                var createdManager = await _managerService.CreateAsync(manager);
                return CreatedAtAction(nameof(GetById), new { id = createdManager.Id }, 
                    ApiResponse<Manager>.Create(createdManager));
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Error creating manager: User manager already exists");
                return BadRequest(ApiResponse<Manager>.Create(null, "A user manager already exists. Only one manager can be marked as the current user."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating manager");
                return BadRequest(ApiResponse<Manager>.Create(null, "Error creating manager"));
            }
        }

        /// <summary>
        /// Update an existing manager
        /// </summary>
        /// <param name="id">The ID of the manager to update</param>
        /// <param name="manager">The updated manager data</param>
        /// <returns>No content</returns>
        /// <response code="204">If the manager was successfully updated</response>
        /// <response code="400">If a user manager already exists</response>
        /// <response code="404">If the manager is not found</response>
        [HttpPut("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string id, Manager manager)
        {
            try
            {
                var existingManager = await _managerService.GetByIdAsync(id);
                if (existingManager is null)
                {
                    return NotFound(ApiResponse<Manager>.Create(null, $"Manager with ID {id} not found"));
                }

                manager.Id = id;
                await _managerService.UpdateAsync(id, manager);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Error updating manager: User manager already exists");
                return BadRequest(ApiResponse<Manager>.Create(null, "A user manager already exists. Only one manager can be marked as the current user."));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating manager");
                return BadRequest(ApiResponse<Manager>.Create(null, "Error updating manager"));
            }
        }

        /// <summary>
        /// Delete a specific manager
        /// </summary>
        /// <param name="id">The ID of the manager to delete</param>
        /// <returns>No content</returns>
        /// <response code="204">If the manager was successfully deleted</response>
        /// <response code="404">If the manager is not found</response>
        [HttpDelete("{id:length(24)}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(string id)
        {
            var manager = await _managerService.GetByIdAsync(id);
            if (manager is null)
            {
                return NotFound(ApiResponse<Manager>.Create(null, $"Manager with ID {id} not found"));
            }

            await _managerService.DeleteAsync(id);
            return NoContent();
        }
    }
}
