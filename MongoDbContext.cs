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

        private IMongoCollection<Player>? _players;
        public IMongoCollection<Player> Players
        {
            get
            {
                if (_players == null)
                {
                    _players = _database.GetCollection<Player>("Players");
                    // Create compound index on name and birthDate
                    var indexKeysDefinition = Builders<Player>.IndexKeys
                        .Ascending(p => p.Name)
                        .Ascending(p => p.BirthDate);
                    var indexOptions = new CreateIndexOptions { Unique = true, Sparse = true };
                    var indexModel = new CreateIndexModel<Player>(indexKeysDefinition, indexOptions);
                    _players.Indexes.CreateOne(indexModel);
                }
                return _players;
            }
        }
    }

    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = "mongodb://localhost:27017";
        public string DatabaseName { get; set; } = "DraftEngine";
    }
}
