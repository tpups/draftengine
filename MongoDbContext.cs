using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace DraftEngine
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString = configuration["MongoDB:ConnectionString"];
            var databaseName = configuration["MongoDB:DatabaseName"];
            
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new ArgumentException("MongoDB connection string must be provided in configuration");
            }
            if (string.IsNullOrEmpty(databaseName))
            {
                throw new ArgumentException("MongoDB database name must be provided in configuration");
            }
            
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
        }

        public IMongoCollection<Player> Players => _database.GetCollection<Player>("Players");
    }

    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = "mongodb://localhost:27017";
        public string DatabaseName { get; set; } = "DraftEngine";
    }
}
