using DraftEngine.Models;
using MongoDB.Driver;

namespace DraftEngine.Services;

public class ManagerService
{
    private readonly IMongoCollection<Manager> _managers;

    public ManagerService(MongoDbContext dbContext)
    {
        _managers = dbContext.Database.GetCollection<Manager>("managers");
        CreateUniqueIndexes();
    }

    private void CreateUniqueIndexes()
    {
        var indexKeysDefinition = Builders<Manager>.IndexKeys.Ascending(m => m.Name);
        var indexOptions = new CreateIndexOptions { Unique = true };
        var indexModel = new CreateIndexModel<Manager>(indexKeysDefinition, indexOptions);
        _managers.Indexes.CreateOne(indexModel);
    }

    public async Task<List<Manager>> GetAllAsync()
    {
        return await _managers.Find(_ => true).ToListAsync();
    }

    public async Task<Manager?> GetByIdAsync(string id)
    {
        return await _managers.Find(m => m.Id == id).FirstOrDefaultAsync();
    }

    public async Task<Manager> CreateAsync(Manager manager)
    {
        if (manager.IsUser)
        {
            // Ensure there's only one user manager
            var existingUserManager = await _managers.Find(m => m.IsUser).FirstOrDefaultAsync();
            if (existingUserManager != null)
            {
                throw new InvalidOperationException("A user manager already exists");
            }
        }

        await _managers.InsertOneAsync(manager);
        return manager;
    }

    public async Task UpdateAsync(string id, Manager manager)
    {
        if (manager.IsUser)
        {
            // Ensure there's only one user manager (excluding current manager)
            var existingUserManager = await _managers.Find(m => m.IsUser && m.Id != id).FirstOrDefaultAsync();
            if (existingUserManager != null)
            {
                throw new InvalidOperationException("A user manager already exists");
            }
        }

        await _managers.ReplaceOneAsync(m => m.Id == id, manager);
    }

    public async Task DeleteAsync(string id)
    {
        await _managers.DeleteOneAsync(m => m.Id == id);
    }
}
