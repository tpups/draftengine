namespace DraftEngine.Models.Data
{
    public class PositionUpdateRequest
    {
        public bool IncludeExisting { get; set; }
    }

    public class PositionUpdateResult
    {
        public int TotalPlayers { get; set; }
        public int ProcessedCount { get; set; }
        public int UpdatedCount { get; set; }
        public int FailedCount { get; set; }
        public List<PositionUpdatePlayerResult> Updates { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    public class PositionUpdatePlayerResult
    {
        public string PlayerId { get; set; } = string.Empty;
        public string PlayerName { get; set; } = string.Empty;
        public DateTime? MlbDebutDate { get; set; }
        public Dictionary<string, Dictionary<string, int>>? OldPositionStats { get; set; }
        public Dictionary<string, Dictionary<string, int>>? NewPositionStats { get; set; }
        public bool WasUpdated { get; set; }
        public List<string> ProcessedSeasons { get; set; } = new();
    }
}
