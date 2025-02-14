using MongoDB.Driver;
using DraftEngine.Models;
using DraftEngine.Models.Data;
using System.Text;
using System.Globalization;

namespace DraftEngine.Services
{
    public class PlayerService
    {
        private readonly IMongoCollection<Player> _players;
        private readonly IMlbApiService _mlbApiService;
        private readonly DraftService _draftService;
        private readonly ILogger<PlayerService> _logger;

        public PlayerService(
            MongoDbContext context, 
            IMlbApiService mlbApiService,
            DraftService draftService,
            ILogger<PlayerService> logger)
        {
            _players = context.Players;
            _mlbApiService = mlbApiService;
            _draftService = draftService;
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
            void MergeDictionary<T>(Dictionary<string, T>? existing, Dictionary<string, T>? newData)
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
            await _players.Find(player => player.Position != null && player.Position.Contains(position)).ToListAsync();

        public async Task<List<Player>> GetUndraftedPlayersAsync()
        {
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null) return new List<Player>();

            var filter = Builders<Player>.Filter.Or(
                Builders<Player>.Filter.Eq(p => p.DraftStatuses, null),
                Builders<Player>.Filter.Not(
                    Builders<Player>.Filter.ElemMatch(
                        p => p.DraftStatuses,
                        ds => ds.DraftId == draft.Id
                    )
                )
            );
            return await _players.Find(filter).ToListAsync();
        }

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

        /// <summary>
        /// Marks a player as drafted in the active draft
        /// </summary>
        /// <remarks>
        /// Updates the player's draft status to reflect being drafted:
        /// - Adds a new draft status entry with draft details
        /// - Removes any existing status for this draft
        /// - Sets the player's drafted state
        /// 
        /// Draft Status Updates:
        /// - Draft ID from active draft
        /// - Manager ID who made the pick
        /// - Round and pick numbers
        /// - Overall pick number
        /// </remarks>
        /// <param name="id">The ID of the player being drafted</param>
        /// <param name="request">Draft pick details including manager, round, and pick numbers</param>
        /// <returns>True if the player was successfully marked as drafted, false otherwise</returns>
        public async Task<bool> MarkAsDraftedAsync(string id, DraftPickRequest request)
        {
            // Get the active draft
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                _logger.LogWarning("No active draft found when marking player {PlayerId} as drafted", id);
                return false;
            }

            // Get the player to check their draft status
            var player = await GetAsync(id);
            if (player == null)
            {
                _logger.LogWarning("Player {PlayerId} not found when marking as drafted", id);
                return false;
            }

            // Check if player is already drafted in this draft
            if (player.DraftStatuses?.Any(ds => ds.DraftId == draft.Id) == true)
            {
                _logger.LogWarning("Player {PlayerId} is already drafted in draft {DraftId}", id, draft.Id);
                return false;
            }

            var draftStatus = new DraftStatus
            {
                DraftId = draft.Id!,
                IsDrafted = true,
                Round = request.Round,
                Pick = request.Pick,
                OverallPick = request.OverallPick,
                ManagerId = request.DraftedBy
            };

            // First remove any existing status for this draft
            var pullUpdate = Builders<Player>.Update
                .PullFilter(p => p.DraftStatuses, ds => ds.DraftId == draft.Id);
            await _players.UpdateOneAsync(player => player.Id == id, pullUpdate);

            // Then add the new status
            var pushUpdate = Builders<Player>.Update
                .Push(p => p.DraftStatuses, draftStatus);

            var result = await _players.UpdateOneAsync(player => player.Id == id, pushUpdate);
            
            if (result.ModifiedCount > 0)
            {
                _logger.LogInformation(
                    "Marked player {PlayerId} as drafted in round {Round} pick {Pick} ({OverallPick} overall) by manager {ManagerId}", 
                    id, request.Round, request.Pick, request.OverallPick, request.DraftedBy);
                return true;
            }
            
            _logger.LogWarning("Failed to mark player {PlayerId} as drafted", id);
            return false;
        }

        /// <summary>
        /// Removes a player's draft status from the active draft
        /// </summary>
        /// <remarks>
        /// Removes only the draft status entry for the active draft:
        /// - Preserves draft status entries for other drafts
        /// - Does not affect the player's other attributes
        /// - Logs the operation for tracking
        /// - Used to undo a pick
        /// </remarks>
        /// <param name="id">The ID of the player to undraft</param>
        /// <returns>True if the player's draft status was removed, false otherwise</returns>
        public async Task<bool> UndraftPlayerAsync(string id)
        {
            // Get the active draft
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null)
            {
                _logger.LogWarning("No active draft found when undrafting player {PlayerId}", id);
                return false;
            }

            // Remove draft status for the active draft only
            var update = Builders<Player>.Update
                .PullFilter(p => p.DraftStatuses, ds => ds.DraftId == draft.Id);

            var result = await _players.UpdateOneAsync(p => p.Id == id, update);
            
            if (result.ModifiedCount > 0)
            {
                _logger.LogInformation("Removed draft status for player {PlayerId} from draft {DraftId}", id, draft.Id);
                return true;
            }
            
            _logger.LogWarning("Failed to remove draft status for player {PlayerId}", id);
            return false;
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

        /// <summary>
        /// Resets draft status for all players in the specified draft
        /// </summary>
        /// <remarks>
        /// Removes all draft status entries for the active draft:
        /// - Affects all players that were drafted in this draft
        /// - Preserves draft status entries for other drafts
        /// - Logs the operation for tracking
        /// - Used when resetting a draft to its initial state
        /// </remarks>
        /// <returns>The number of players whose draft status was reset</returns>
        public async Task<long> ResetDraftStatusAsync(string draftId)
        {
            var draft = await _draftService.GetByIdAsync(draftId);
            if (draft == null)
            {
                _logger.LogWarning("Draft {DraftId} not found when resetting draft status", draftId);
                return 0;
            }

            // Remove draft status for the specified draft from all players
            var update = Builders<Player>.Update
                .PullFilter(p => p.DraftStatuses, ds => ds.DraftId == draftId);

            // Find all players with a draft status for this draft
            var filter = Builders<Player>.Filter.ElemMatch(
                p => p.DraftStatuses,
                ds => ds.DraftId == draftId
            );

            var result = await _players.UpdateManyAsync(filter, update);

            if (result.ModifiedCount > 0)
            {
                _logger.LogInformation("Reset draft status for {Count} players in draft {Year} ({Type})", 
                    result.ModifiedCount, draft.Year, draft.Type);
            }
            else
            {
                _logger.LogInformation("No players found with draft status for draft {Year} ({Type}", draft.Year, draft.Type);
            }

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

        /// <summary>
        /// Gets a paginated list of players
        /// </summary>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <param name="filter">Optional filter to apply to the query</param>
        /// <returns>A paginated result containing the requested players</returns>
        public async Task<PaginatedResult<Player>> GetPaginatedAsync(
            int pageNumber = 1,
            int pageSize = 100,
            FilterDefinition<Player>? filter = null)
        {
            filter ??= Builders<Player>.Filter.Empty;

            var totalCount = await _players.CountDocumentsAsync(filter);
            var skip = (pageNumber - 1) * pageSize;

            var items = await _players.Find(filter)
                .Skip(skip)
                .Limit(pageSize)
                .ToListAsync();

            return new PaginatedResult<Player>
            {
                Items = items,
                TotalCount = (int)totalCount,
                CurrentPage = pageNumber,
                PageSize = pageSize
            };
        }

        /// <summary>
        /// Gets a paginated list of players by level
        /// </summary>
        public async Task<PaginatedResult<Player>> GetByLevelPaginatedAsync(
            string level,
            int pageNumber = 1,
            int pageSize = 100)
        {
            var filter = Builders<Player>.Filter.Eq(p => p.Level, level);
            return await GetPaginatedAsync(pageNumber, pageSize, filter);
        }

        /// <summary>
        /// Gets a paginated list of players by team
        /// </summary>
        public async Task<PaginatedResult<Player>> GetByTeamPaginatedAsync(
            string team,
            int pageNumber = 1,
            int pageSize = 100)
        {
            var filter = Builders<Player>.Filter.Eq(p => p.MLBTeam, team);
            return await GetPaginatedAsync(pageNumber, pageSize, filter);
        }

        /// <summary>
        /// Gets a paginated list of players by position
        /// </summary>
        public async Task<PaginatedResult<Player>> GetByPositionPaginatedAsync(
            string position,
            int pageNumber = 1,
            int pageSize = 100)
        {
            var filter = Builders<Player>.Filter.AnyEq(p => p.Position, position);
            return await GetPaginatedAsync(pageNumber, pageSize, filter);
        }

        /// <summary>
        /// Gets a paginated list of undrafted players
        /// </summary>
        public async Task<PaginatedResult<Player>> GetUndraftedPlayersPaginatedAsync(
            int pageNumber = 1,
            int pageSize = 100)
        {
            var draft = await _draftService.GetActiveDraftAsync();
            if (draft == null) return new PaginatedResult<Player>
            {
                Items = new List<Player>(),
                TotalCount = 0,
                CurrentPage = pageNumber,
                PageSize = pageSize
            };

            var filter = Builders<Player>.Filter.Or(
                Builders<Player>.Filter.Eq(p => p.DraftStatuses, null),
                Builders<Player>.Filter.Not(
                    Builders<Player>.Filter.ElemMatch(
                        p => p.DraftStatuses,
                        ds => ds.DraftId == draft.Id
                    )
                )
            );
            return await GetPaginatedAsync(pageNumber, pageSize, filter);
        }

        /// <summary>
        /// Gets a paginated list of highlighted players
        /// </summary>
        public async Task<PaginatedResult<Player>> GetHighlightedPlayersPaginatedAsync(
            int pageNumber = 1,
            int pageSize = 100)
        {
            var filter = Builders<Player>.Filter.Eq(p => p.IsHighlighted, true);
            return await GetPaginatedAsync(pageNumber, pageSize, filter);
        }

        /// <summary>
        /// Gets a paginated list of players matching a search term
        /// </summary>
        /// <param name="searchTerm">The term to search for in player names</param>
        /// <param name="pageNumber">The page number to retrieve (1-based)</param>
        /// <param name="pageSize">The number of items per page</param>
        /// <returns>A paginated result containing the matching players</returns>
        public async Task<PaginatedResult<Player>> SearchPlayersPaginatedAsync(
            string searchTerm,
            int pageNumber = 1,
            int pageSize = 100)
        {
            var filter = Builders<Player>.Filter.Regex(
                p => p.Name,
                new MongoDB.Bson.BsonRegularExpression($".*{searchTerm}.*", "i")
            );

            var totalCount = await _players.CountDocumentsAsync(filter);
            var skip = (pageNumber - 1) * pageSize;

            var items = await _players.Find(filter)
                .Skip(skip)
                .Limit(pageSize)
                .ToListAsync();

            return new PaginatedResult<Player>
            {
                Items = items,
                TotalCount = (int)totalCount,
                CurrentPage = pageNumber,
                PageSize = pageSize
            };
        }
    }
}
