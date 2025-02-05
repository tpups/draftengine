using DraftEngine.Models;
using MongoDB.Driver;

namespace DraftEngine.Services;

/// <summary>
/// Service for managing draft managers
/// </summary>
public class ManagerService
{
    private readonly IMongoCollection<Manager> _managers;
    private readonly ILogger<ManagerService> _logger;

    public ManagerService(
        MongoDbContext dbContext,
        ILogger<ManagerService> logger)
    {
        _managers = dbContext.Database.GetCollection<Manager>("managers");
        _logger = logger;
        CreateUniqueIndexes();
    }

    private void CreateUniqueIndexes()
    {
        var indexKeysDefinition = Builders<Manager>.IndexKeys.Ascending(m => m.Name);
        var indexOptions = new CreateIndexOptions { Unique = true };
        var indexModel = new CreateIndexModel<Manager>(indexKeysDefinition, indexOptions);
        _managers.Indexes.CreateOne(indexModel);
    }

    /// <summary>
    /// Gets all managers from the database
    /// </summary>
    /// <returns>List of all managers</returns>
    public async Task<List<Manager>> GetAllAsync()
    {
        try
        {
            var managers = await _managers.Find(_ => true).ToListAsync();
            _logger.LogInformation("Retrieved {Count} managers", managers.Count);
            return managers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all managers");
            throw;
        }
    }

    /// <summary>
    /// Gets a manager by their ID
    /// </summary>
    /// <param name="id">The ID of the manager to retrieve</param>
    /// <returns>The manager if found, null otherwise</returns>
    public async Task<Manager?> GetByIdAsync(string id)
    {
        try
        {
            _logger.LogInformation("Attempting to get manager {ManagerId}", id);
            var manager = await _managers.Find(m => m.Id == id).FirstOrDefaultAsync();
            
            if (manager != null)
            {
                _logger.LogInformation("Successfully retrieved manager {ManagerId}", id);
            }
            else
            {
                _logger.LogWarning("Manager {ManagerId} not found", id);
            }

            return manager;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving manager {ManagerId}", id);
            throw;
        }
    }

    /// <summary>
    /// Creates a new manager
    /// </summary>
    /// <param name="manager">The manager to create</param>
    /// <returns>The created manager</returns>
    /// <exception cref="InvalidOperationException">Thrown when attempting to create a second user manager</exception>
    public async Task<Manager> CreateAsync(Manager manager)
    {
        try
        {
            _logger.LogInformation("Attempting to create manager: {ManagerName}", manager.Name);

            if (manager.IsUser)
            {
                // Ensure there's only one user manager
                var existingUserManager = await _managers.Find(m => m.IsUser).FirstOrDefaultAsync();
                if (existingUserManager != null)
                {
                    _logger.LogWarning("Attempted to create second user manager");
                    throw new InvalidOperationException("A user manager already exists");
                }
            }

            await _managers.InsertOneAsync(manager);
            _logger.LogInformation("Successfully created manager {ManagerId}", manager.Id);
            return manager;
        }
        catch (Exception ex) when (!(ex is InvalidOperationException))
        {
            _logger.LogError(ex, "Error creating manager");
            throw;
        }
    }

    /// <summary>
    /// Updates an existing manager
    /// </summary>
    /// <param name="id">The ID of the manager to update</param>
    /// <param name="manager">The updated manager data</param>
    /// <exception cref="InvalidOperationException">Thrown when attempting to create a second user manager</exception>
    public async Task UpdateAsync(string id, Manager manager)
    {
        try
        {
            _logger.LogInformation("Attempting to update manager {ManagerId}", id);

            if (manager.IsUser)
            {
                // Ensure there's only one user manager (excluding current manager)
                var existingUserManager = await _managers.Find(m => m.IsUser && m.Id != id).FirstOrDefaultAsync();
                if (existingUserManager != null)
                {
                    _logger.LogWarning("Attempted to create second user manager through update");
                    throw new InvalidOperationException("A user manager already exists");
                }
            }

            var result = await _managers.ReplaceOneAsync(m => m.Id == id, manager);
            if (result.ModifiedCount > 0)
            {
                _logger.LogInformation("Successfully updated manager {ManagerId}", id);
            }
            else
            {
                _logger.LogWarning("No changes made to manager {ManagerId}", id);
            }
        }
        catch (Exception ex) when (!(ex is InvalidOperationException))
        {
            _logger.LogError(ex, "Error updating manager {ManagerId}", id);
            throw;
        }
    }

    /// <summary>
    /// Deletes a manager
    /// </summary>
    /// <param name="id">The ID of the manager to delete</param>
    public async Task DeleteAsync(string id)
    {
        try
        {
            _logger.LogInformation("Attempting to delete manager {ManagerId}", id);
            var result = await _managers.DeleteOneAsync(m => m.Id == id);
            
            if (result.DeletedCount > 0)
            {
                _logger.LogInformation("Successfully deleted manager {ManagerId}", id);
            }
            else
            {
                _logger.LogWarning("No manager found to delete with ID {ManagerId}", id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting manager {ManagerId}", id);
            throw;
        }
    }
}
