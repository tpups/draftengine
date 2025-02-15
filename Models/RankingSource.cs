using System.Collections.Generic;
using System.Linq;
using DraftEngine.Models;

namespace DraftEngine.Models
{
    public enum ProjectionSource
{
    Steamer,
    ZiPS
}

public enum RankingSource
{
    IBW
}

public enum ProspectSource
{
    BaseballProspectus,
    BaseballAmerica,
    FanGraphs,
    IBW
}

public class RankingSourceManager
    {
        public string SourceName { get; set; } = null!;
        public List<Player> Players { get; set; } = new List<Player>();

        // Adds a new player to the list
        public void AddPlayer(Player player)
        {
            Players.Add(player);
        }

        // Removes a player from the list by their ID
        public bool RemovePlayer(string playerId)
        {
            var player = Players.FirstOrDefault(p => p.Id == playerId);
            if (player != null)
            {
                Players.Remove(player);
                return true;
            }
            return false;
        }

        // Retrieves a player by their ID
        public Player? GetPlayerById(string playerId)
        {
            return Players.FirstOrDefault(p => p.Id == playerId);
        }

        // Returns the list of all players
        public List<Player> GetAllPlayers()
        {
            return Players;
        }

        // Updates the details of an existing player
        public bool UpdatePlayer(Player updatedPlayer)
        {
            var player = Players.FirstOrDefault(p => p.Id == updatedPlayer.Id);
            if (player != null)
            {
                player.Name = updatedPlayer.Name;
                player.Position = updatedPlayer.Position;
                player.MLBTeam = updatedPlayer.MLBTeam;
                player.Level = updatedPlayer.Level;
                player.BirthDate = updatedPlayer.BirthDate;
                player.ETA = updatedPlayer.ETA;
                player.Rank = new Dictionary<RankingSource, int>(updatedPlayer.Rank ?? new Dictionary<RankingSource, int>());
                player.ProspectRank = updatedPlayer.ProspectRank;
                player.ProspectRisk = updatedPlayer.ProspectRisk;
                player.ScoutingGrades = updatedPlayer.ScoutingGrades;
                return true;
            }
            return false;
        }

        // Sorts the players by their rank from a specific source
        public void SortPlayersByRank(RankingSource source)
        {
            Players = Players.OrderBy(p => p.Rank?.ContainsKey(source) == true ? p.Rank[source] : int.MaxValue).ToList();
        }
    }
}
