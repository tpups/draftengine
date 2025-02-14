using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Driver.Core.Operations;
using DraftEngine.Models;

namespace DraftEngine
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;
        public IMongoDatabase Database => _database;

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
        private async Task InitializePlayersCollectionAsync()
        {
            if (_players != null) return;

            // Get or create collection
            _players = _database.GetCollection<Player>("players");
            
            // Drop existing indexes
            await _players.Indexes.DropAllAsync();

            // Create case-insensitive collation
            var collation = new Collation("en", strength: CollationStrength.Secondary);

            // Create a case-insensitive index on the Name field
            var nameIndexKeysDefinition = Builders<Player>.IndexKeys.Ascending(p => p.Name);
            var nameIndexOptions = new CreateIndexOptions { 
                Collation = collation
            };
            var nameIndexModel = new CreateIndexModel<Player>(nameIndexKeysDefinition, nameIndexOptions);
            await _players.Indexes.CreateOneAsync(nameIndexModel);
            
            // Create compound index on name and birthDate
            var compoundIndexKeysDefinition = Builders<Player>.IndexKeys
                .Ascending(p => p.Name)
                .Ascending(p => p.BirthDate);
            var compoundIndexOptions = new CreateIndexOptions { 
                Unique = true, 
                Sparse = true,
                Collation = collation
            };
            var compoundIndexModel = new CreateIndexModel<Player>(compoundIndexKeysDefinition, compoundIndexOptions);
            await _players.Indexes.CreateOneAsync(compoundIndexModel);
        }

        public IMongoCollection<Player> Players
        {
            get
            {
                if (_players == null)
                {
                    // Initialize synchronously to avoid async in property getter
                    InitializePlayersCollectionAsync().GetAwaiter().GetResult();
                }
                return _players!;
            }
        }

        private IMongoCollection<Manager>? _managers;
        public IMongoCollection<Manager> Managers
        {
            get
            {
                if (_managers == null)
                {
                    _managers = _database.GetCollection<Manager>("managers");
                    // Create unique index on name
                    var indexKeysDefinition = Builders<Manager>.IndexKeys.Ascending(m => m.Name);
                    var indexOptions = new CreateIndexOptions { Unique = true };
                    var indexModel = new CreateIndexModel<Manager>(indexKeysDefinition, indexOptions);
                    _managers.Indexes.CreateOne(indexModel);
                }
                return _managers;
            }
        }

        private IMongoCollection<Draft>? _drafts;
        public IMongoCollection<Draft> Drafts
        {
            get
            {
                if (_drafts == null)
                {
                    _drafts = _database.GetCollection<Draft>("drafts");
                    // Create index on createdAt for sorting
                    var indexKeysDefinition = Builders<Draft>.IndexKeys.Descending(d => d.CreatedAt);
                    var indexModel = new CreateIndexModel<Draft>(indexKeysDefinition);
                    _drafts.Indexes.CreateOne(indexModel);
                }
                return _drafts;
            }
        }

        private IMongoCollection<Trade>? _trades;
        public IMongoCollection<Trade> Trades
        {
            get
            {
                if (_trades == null)
                {
                    _trades = _database.GetCollection<Trade>("trades");
                    // Create index on timestamp for sorting
                    var indexKeysDefinition = Builders<Trade>.IndexKeys.Descending(t => t.Timestamp);
                    var indexModel = new CreateIndexModel<Trade>(indexKeysDefinition);
                    _trades.Indexes.CreateOne(indexModel);
                }
                return _trades;
            }
        }
    }

    public class MongoDbSettings
    {
        public string ConnectionString { get; set; } = "mongodb://localhost:27017";
        public string DatabaseName { get; set; } = "DraftEngine";
    }
}
