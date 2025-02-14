using System.Text.Json.Serialization;

namespace DraftEngine.Models.Data
{
    public class MlbPositionResponse
    {
        [JsonPropertyName("people")]
        public PositionPeople[]? People { get; set; }
    }

    public class PositionPeople
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("fullName")]
        public string? FullName { get; set; }

        [JsonPropertyName("stats")]
        public PositionStats[]? Stats { get; set; }
    }

    public class PositionStats
    {
        [JsonPropertyName("type")]
        public StatType? Type { get; set; }

        [JsonPropertyName("group")]
        public StatGroup? Group { get; set; }

        [JsonPropertyName("splits")]
        public StatSplit[]? Splits { get; set; }
    }

    public class StatType
    {
        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }
    }

    public class StatGroup
    {
        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }
    }

    public class StatSplit
    {
        [JsonPropertyName("season")]
        public string? Season { get; set; }

        [JsonPropertyName("stat")]
        public PositionStat? Stat { get; set; }

        [JsonPropertyName("position")]
        public Position? Position { get; set; }
    }

    public class PositionStat
    {
        [JsonPropertyName("games")]
        public int Games { get; set; }

        [JsonPropertyName("gamesStarted")]
        public int GamesStarted { get; set; }
    }

}
