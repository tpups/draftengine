namespace DraftEngine.Models.Data
{
    public class BirthDateVerificationRequest
    {
        public bool IncludeExisting { get; set; }
    }

    public class BirthDateVerificationResult
    {
        public int TotalPlayers { get; set; }
        public int ProcessedCount { get; set; }
        public int UpdatedCount { get; set; }
        public int FailedCount { get; set; }
        public List<BirthDateUpdateResult> Updates { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    public class BirthDateUpdateResult
    {
        public string PlayerId { get; set; } = string.Empty;
        public string PlayerName { get; set; } = string.Empty;
        public DateTime? OldBirthDate { get; set; }
        public DateTime? NewBirthDate { get; set; }
        public bool WasUpdated { get; set; }
    }
}
