namespace DraftEngine
{
    public class ProjectionStats
    {
        public Dictionary<string, double> Stats { get; set; } = null!;
        public DateTime UpdatedDate { get; set; }
    }

    public class ProjectionData
    {
        public ProjectionStats? Hitter { get; set; }
        public ProjectionStats? Pitcher { get; set; }
    }
}
