using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace DraftEngine
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            if (string.IsNullOrEmpty(settings.Value.DatabaseName))
            {
                throw new ArgumentException("Database name must be provided in settings");
            }
            _database = client.GetDatabase(settings.Value.DatabaseName);
        }

        public IMongoCollection<Player> Players => _database.GetCollection<Player>("Players");
    }

    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = "mongodb://localhost:27017";
        public string DatabaseName { get; set; } = "DraftEngine";
    }
}
