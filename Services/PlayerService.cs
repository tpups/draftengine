using MongoDB.Driver;

namespace DraftEngine
{
    public class PlayerService
    {
        private readonly IMongoCollection<Player> _players;

        public PlayerService(MongoDbContext context)
        {
            _players = context.Players;
        }

        // Basic CRUD operations
        public async Task<List<Player>> GetAsync() =>
            await _players.Find(player => true).ToListAsync();

        public async Task<Player?> GetAsync(string id) =>
            await _players.Find(player => player.Id == id).FirstOrDefaultAsync();

        public async Task CreateAsync(Player newPlayer) =>
            await _players.InsertOneAsync(newPlayer);

        public async Task CreateManyAsync(IEnumerable<Player> players) =>
            await _players.InsertManyAsync(players);

        public async Task UpdateAsync(string id, Player updatedPlayer) =>
            await _players.ReplaceOneAsync(player => player.Id == id, updatedPlayer);

        public async Task RemoveAsync(string id) =>
            await _players.DeleteOneAsync(player => player.Id == id);

        // Player filtering methods
        public async Task<List<Player>> GetByLevelAsync(string level) =>
            await _players.Find(player => player.Level == level).ToListAsync();

        public async Task<List<Player>> GetByTeamAsync(string team) =>
            await _players.Find(player => player.MLBTeam == team).ToListAsync();

        public async Task<List<Player>> GetByPositionAsync(string position) =>
            await _players.Find(player => player.Position.Contains(position)).ToListAsync();

        public async Task<List<Player>> GetUndraftedPlayersAsync() =>
            await _players.Find(player => !player.IsDrafted).ToListAsync();

        public async Task<List<Player>> GetHighlightedPlayersAsync() =>
            await _players.Find(player => player.IsHighlighted).ToListAsync();

        // Draft management methods
        public async Task<bool> MarkAsDraftedAsync(string id, string draftedBy, int round, int pick)
        {
            var update = Builders<Player>.Update
                .Set(p => p.IsDrafted, true)
                .Set(p => p.DraftedBy, draftedBy)
                .Set(p => p.DraftRound, round)
                .Set(p => p.DraftPick, pick);

            var result = await _players.UpdateOneAsync(player => player.Id == id, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UndraftPlayerAsync(string id)
        {
            var update = Builders<Player>.Update
                .Set(p => p.IsDrafted, false)
                .Set(p => p.DraftedBy, null)
                .Set(p => p.DraftRound, null)
                .Set(p => p.DraftPick, null);

            var result = await _players.UpdateOneAsync(player => player.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Personal tracking methods
        public async Task<bool> ToggleHighlightAsync(string id)
        {
            var player = await GetAsync(id);
            if (player == null) return false;

            var update = Builders<Player>.Update
                .Set(p => p.IsHighlighted, !player.IsHighlighted);

            var result = await _players.UpdateOneAsync(p => p.Id == id, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdateNotesAsync(string id, string notes)
        {
            var update = Builders<Player>.Update
                .Set(p => p.Notes, notes);

            var result = await _players.UpdateOneAsync(player => player.Id == id, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdatePersonalRankAsync(string id, int rank)
        {
            var update = Builders<Player>.Update
                .Set(p => p.PersonalRank, rank);

            var result = await _players.UpdateOneAsync(player => player.Id == id, update);
            return result.ModifiedCount > 0;
        }

        // Advanced filtering
        public async Task<List<Player>> GetByAgeRangeAsync(int minAge, int maxAge)
        {
            var minDate = DateTime.Today.AddYears(-maxAge);
            var maxDate = DateTime.Today.AddYears(-minAge);
            
            return await _players.Find(player => 
                player.BirthDate >= minDate && 
                player.BirthDate <= maxDate
            ).ToListAsync();
        }

        public async Task<List<Player>> GetByETAAsync(int year) =>
            await _players.Find(player => player.ETA == year).ToListAsync();

        public async Task<List<Player>> GetByRiskLevelAsync(string source, string riskLevel) =>
            await _players.Find(player => 
                player.ProspectRisk.ContainsKey(source) && 
                player.ProspectRisk[source] == riskLevel
            ).ToListAsync();
    }
}
