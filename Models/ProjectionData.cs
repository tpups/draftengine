namespace DraftEngine
{
    public class ProjectionData
    {
        public Dictionary<string, double> Stats { get; set; } = null!;  // e.g., "HR": 25, "AVG": 0.285
        public DateTime UpdatedDate { get; set; }
    }
}
