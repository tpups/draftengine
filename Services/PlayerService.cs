using MongoDB.Driver;
using DraftEngine.Models;
using DraftEngine.Models.Data;

namespace DraftEngine.Services
{
    public class PlayerService
    {
        private readonly IMongoCollection<Player> _players;
        private readonly IMlbApiService _mlbApiService;
        private readonly ILogger<PlayerService> _logger;

        public PlayerService(
            MongoDbContext context, 
            IMlbApiService mlbApiService,
            ILogger<PlayerService> logger)
        {
            _players = context.Players;
            _mlbApiService = mlbApiService;
            _logger = logger;
        }

        // Basic CRUD operations
        public async Task<List<Player>> GetAsync() =>
            await _players.Find(player => true).ToListAsync();

        public async Task<Player?> GetAsync(string id) =>
            await _players.Find(player => player.Id == id).FirstOrDefaultAsync();

        private async Task<Player?> FindDuplicateAsync(Player player)
        {
            if (player.Name == null || player.BirthDate == null)
                return null;

            return await _players.Find(p => 
                p.Name == player.Name && 
                p.BirthDate == player.BirthDate
            ).FirstOrDefaultAsync();
        }

        private Player MergePlayerData(Player existing, Player newData)
        {
            // Update timestamp
            existing.LastUpdated = DateTime.UtcNow;

            // Helper function to merge dictionaries
            void MergeDictionary<T>(Dictionary<string, T> existing, Dictionary<string, T> newData)
            {
                if (newData == null) return;
                existing ??= new Dictionary<string, T>();
                foreach (var item in newData)
                {
                    existing[item.Key] = item.Value;
                }
            }

            // Update non-null fields from new data
            if (newData.Position != null && newData.Position.Length > 0) existing.Position = newData.Position;
            if (newData.MLBTeam != null) existing.MLBTeam = newData.MLBTeam;
            if (newData.Level != null) existing.Level = newData.Level;
            if (newData.ETA != null) existing.ETA = newData.ETA;
            if (newData.Notes != null) existing.Notes = newData.Notes;

            // Merge dictionary fields
            MergeDictionary(existing.Rank, newData.Rank);
            MergeDictionary(existing.ProspectRank, newData.ProspectRank);
            MergeDictionary(existing.ProspectRisk, newData.ProspectRisk);
            MergeDictionary(existing.ScoutingGrades, newData.ScoutingGrades);
            MergeDictionary(existing.ExternalIds, newData.ExternalIds);

            return existing;
        }

        public async Task CreateAsync(Player newPlayer)
        {
            newPlayer.LastUpdated = DateTime.UtcNow;
            var duplicate = await FindDuplicateAsync(newPlayer);

            if (duplicate != null)
            {
                var merged = MergePlayerData(duplicate, newPlayer);
                await _players.ReplaceOneAsync(p => p.Id == duplicate.Id, merged);
            }
            else
            {
                await _players.InsertOneAsync(newPlayer);
            }
        }

        public async Task CreateManyAsync(IEnumerable<Player> players)
        {
            foreach (var player in players)
            {
                await CreateAsync(player);
            }
        }

        public async Task UpdateAsync(string id, Player updatedPlayer) =>
            await _players.ReplaceOneAsync(player => player.Id == id, updatedPlayer);

        public async Task RemoveAsync(string id) =>
            await _players.DeleteOneAsync(player => player.Id == id);

        public async Task<long> DeleteAllAsync() =>
            (await _players.DeleteManyAsync(player => true)).DeletedCount;

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

        public async Task<BirthDateVerificationResult> VerifyBirthDatesAsync(bool includeExisting)
        {
            var result = new BirthDateVerificationResult();
            var players = await GetAsync();
            result.TotalPlayers = players.Count;

            foreach (var player in players)
            {
                try
                {
                    // Skip if player has birthdate and we're not checking existing
                    if (player.BirthDate.HasValue && !includeExisting)
                    {
                        result.ProcessedCount++;
                        continue;
                    }

                    // Skip if no MLBAM ID
                    if (player.ExternalIds == null || !player.ExternalIds.ContainsKey("mlbam_id"))
                    {
                        result.ProcessedCount++;
                        result.Errors.Add($"No MLBAM ID found for player: {player.Name}");
                        result.FailedCount++;
                        continue;
                    }

                    var updateResult = await UpdatePlayerBirthDateAsync(player);
                    result.Updates.Add(updateResult);
                    result.ProcessedCount++;

                    if (updateResult.WasUpdated)
                    {
                        result.UpdatedCount++;
                    }
                }
                catch (Exception ex)
                {
                    result.Errors.Add($"Error processing player {player.Name}: {ex.Message}");
                    result.FailedCount++;
                }
            }

            return result;
        }

        private async Task<BirthDateUpdateResult> UpdatePlayerBirthDateAsync(Player player)
        {
            var result = new BirthDateUpdateResult
            {
                PlayerId = player.Id ?? string.Empty,
                PlayerName = player.Name,
                OldBirthDate = player.BirthDate
            };

            var mlbId = player.ExternalIds!["mlbam_id"];
            _logger.LogInformation("Fetching birthdate for player {PlayerName} with MLBAM ID: {MlbId}", 
                player.Name, mlbId);

            var mlbResponse = await _mlbApiService.GetPlayerInfoAsync(mlbId);

            if (mlbResponse?.People == null || mlbResponse.People.Length == 0)
            {
                _logger.LogWarning("No response data for player {PlayerName} with MLBAM ID: {MlbId}", 
                    player.Name, mlbId);
                return result;
            }

            var mlbPlayer = mlbResponse.People[0];
            _logger.LogInformation("MLB API data for {PlayerName}: BirthDate = {BirthDate}, FullName = {FullName}", 
                player.Name, mlbPlayer.BirthDate, mlbPlayer.FullName);

            if (string.IsNullOrEmpty(mlbPlayer.BirthDate))
            {
                _logger.LogWarning("No birthdate in response for player {PlayerName}", player.Name);
                return result;
            }

            if (DateTime.TryParse(mlbPlayer.BirthDate, out DateTime birthDate))
            {
                _logger.LogInformation("Successfully parsed birthdate for {PlayerName}: {BirthDate}", 
                    player.Name, birthDate);
                
                result.NewBirthDate = birthDate;

                // Only update if different
                if (!player.BirthDate.HasValue || player.BirthDate.Value.Date != birthDate.Date)
                {
                    _logger.LogInformation("Updating birthdate for {PlayerName}. Old: {OldDate}, New: {NewDate}", 
                        player.Name, player.BirthDate, birthDate);

                    var update = Builders<Player>.Update
                        .Set(p => p.BirthDate, birthDate)
                        .Set(p => p.LastUpdated, DateTime.UtcNow);

                    var updateResult = await _players.UpdateOneAsync(p => p.Id == player.Id, update);
                    result.WasUpdated = updateResult.ModifiedCount > 0;

                    _logger.LogInformation("Update result for {PlayerName}: ModifiedCount = {ModifiedCount}", 
                        player.Name, updateResult.ModifiedCount);
                }
                else
                {
                    _logger.LogInformation("No update needed for {PlayerName}, dates match: {BirthDate}", 
                        player.Name, birthDate);
                }
            }
            else
            {
                _logger.LogWarning("Failed to parse birthdate '{BirthDate}' for player {PlayerName}", 
                    mlbPlayer.BirthDate, player.Name);
            }

            return result;
        }

        // Draft management methods
        public async Task<bool> MarkAsDrafted(string id, DraftPickRequest request)
        {
            var update = Builders<Player>.Update
                .Set(p => p.IsDrafted, true)
                .Set(p => p.DraftedBy, request.DraftedBy)
                .Set(p => p.DraftRound, request.Round)
                .Set(p => p.DraftPick, request.Pick);

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

        // Draft reset operation
        public async Task<long> ResetDraftStatusAsync()
        {
            var update = Builders<Player>.Update
                .Set(p => p.IsDrafted, false)
                .Set(p => p.DraftedBy, null)
                .Set(p => p.DraftRound, null)
                .Set(p => p.DraftPick, null);

            var result = await _players.UpdateManyAsync(
                Builders<Player>.Filter.Empty, 
                update
            );
            return result.ModifiedCount;
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
