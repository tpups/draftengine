using MongoDB.Driver;
using DraftEngine.Models;

namespace DraftEngine.Services
{
    public class LeagueSettingsService
    {
        private readonly IMongoCollection<LeagueSettings> _settings;
        private readonly ILogger<LeagueSettingsService> _logger;

        public LeagueSettingsService(
            MongoDbContext context,
            ILogger<LeagueSettingsService> logger)
        {
            _settings = context.Database.GetCollection<LeagueSettings>("leagueSettings");
            _logger = logger;
        }

        public async Task<LeagueSettings> GetSettingsAsync()
        {
            var settings = await _settings.Find(_ => true).FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new LeagueSettings();
                await _settings.InsertOneAsync(settings);
                _logger.LogInformation("Created default league settings");
            }
            return settings;
        }

        public async Task UpdateSettingsAsync(LeagueSettings settings)
        {
            var filter = Builders<LeagueSettings>.Filter.Eq(s => s.Id, settings.Id);
            var update = Builders<LeagueSettings>.Update
                .Set(s => s.MinGamesForPosition, settings.MinGamesForPosition);

            var result = await _settings.UpdateOneAsync(filter, update);
            if (result.ModifiedCount > 0)
            {
                _logger.LogInformation("Updated league settings");
            }
        }
    }
}
