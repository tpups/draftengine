using Microsoft.AspNetCore.Mvc;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using DraftEngine.Services;
using Newtonsoft.Json;

namespace DraftEngine.Controllers
{
    /// <summary>
    /// Controller for managing team managers
    /// </summary>
    /// <remarks>
    /// This controller provides endpoints for:
    /// - Basic CRUD operations on manager records
    /// - User manager designation and validation
    /// - Manager name uniqueness enforcement
    /// 
    /// Key Features:
    /// - Single user manager enforcement
    /// - Unique manager names
    /// - Comprehensive error handling
    /// - Detailed logging
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
        /// Get all managers from the database
        /// </summary>
        /// <remarks>
        /// Returns all managers, including:
        /// - Basic manager information
        /// - User manager status
        /// - Email (if provided)
        /// 
        /// Results are typically used for:
        /// - Displaying manager list
        /// - Draft participant selection
        /// - User identification
        /// </remarks>
        /// <returns>List of all managers in the database</returns>
        /// <response code="200">Returns the list of managers</response>
        /// <response code="500">If there was an internal server error</response>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<ActionResult<ApiResponse<List<Manager>>>> GetAll()
        {
            var managers = await _managerService.GetAllAsync();
            return Ok(ApiResponse<List<Manager>>.Create(managers));
        }

        /// <summary>
        /// Get a specific manager by their unique identifier
        /// </summary>
        /// <remarks>
        /// Returns detailed manager information including:
        /// - Basic manager details (name, email)
        /// - User manager status
        /// - System-assigned ID
        /// 
        /// The ID must be a valid 24-character MongoDB ObjectId
        /// </remarks>
        /// <param name="id">The unique identifier of the manager to retrieve</param>
        /// <returns>The requested manager's complete information</returns>
        /// <response code="200">Returns the requested manager</response>
        /// <response code="404">If the manager is not found</response>
        /// <response code="500">If there was an internal server error</response>
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
        /// Create a new manager in the database
        /// </summary>
        /// <remarks>
        /// Creates a new manager with the following validation:
        /// - Ensures unique manager name
        /// - Validates user manager designation
        /// - Initializes required fields
        /// 
        /// User Manager Rules:
        /// - Only one manager can be designated as the user manager
        /// - Attempting to create a second user manager will fail
        /// - User manager status cannot be changed through updates
        /// 
        /// Required Fields:
        /// - Name (must be unique)
        /// - IsUser (boolean)
        /// 
        /// Optional Fields:
        /// - Email
        /// </remarks>
        /// <param name="manager">The manager data to create</param>
        /// <returns>The newly created manager</returns>
        /// <response code="201">Returns the newly created manager</response>
        /// <response code="400">If the manager data is invalid or a user manager already exists</response>
        /// <response code="409">If a manager with the same name already exists</response>
        /// <response code="500">If there was an internal server error</response>
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
        /// <remarks>
        /// Updates a manager with the following validation:
        /// - Ensures manager exists
        /// - Validates user manager designation
        /// - Maintains name uniqueness
        /// 
        /// User Manager Rules:
        /// - Cannot create a second user manager through updates
        /// - Existing user manager can be updated
        /// - Non-user managers cannot become user manager if one exists
        /// 
        /// Update Behavior:
        /// - Replaces entire manager document
        /// - Maintains manager ID
        /// - Validates all constraints
        /// - Returns 204 on success
        /// </remarks>
        /// <param name="id">The ID of the manager to update</param>
        /// <param name="manager">The updated manager data</param>
        /// <returns>No content</returns>
        /// <response code="204">If the manager was successfully updated</response>
        /// <response code="400">If a user manager already exists or the data is invalid</response>
        /// <response code="404">If the manager is not found</response>
        /// <response code="409">If the update would create a name conflict</response>
        /// <response code="500">If there was an internal server error</response>
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
        /// <remarks>
        /// Deletes a manager with the following behavior:
        /// - Verifies manager exists before deletion
        /// - Removes all manager data
        /// - Cannot be undone
        /// 
        /// Validation:
        /// - Checks manager exists
        /// - Returns 404 if not found
        /// - Returns 204 on successful deletion
        /// 
        /// Note: Consider implications of deleting a manager who may be referenced
        /// in draft history or other related data.
        /// </remarks>
        /// <param name="id">The ID of the manager to delete</param>
        /// <returns>No content</returns>
        /// <response code="204">If the manager was successfully deleted</response>
        /// <response code="404">If the manager is not found</response>
        /// <response code="500">If there was an internal server error</response>
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
