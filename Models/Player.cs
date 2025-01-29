using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine
{
    public class Player
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = null!;

        public string Name { get; set; } = null!;

        public string[] Position { get; set; } = Array.Empty<string>();

        public Dictionary<string, int> Rank { get; set; } = new Dictionary<string, int>();

        public Dictionary<string, int> ProspectRank { get; set; } = new Dictionary<string, int>();

        // Player information
        public string MLBTeam { get; set; } = null!;
        public string Level { get; set; } = null!;  // MLB, AAA, AA, etc.
        public DateTime BirthDate { get; set; }
        public int? ETA { get; set; }  // Year expected to reach MLB

        // Risk assessments from multiple sources
        public Dictionary<string, string> ProspectRisk { get; set; } = new Dictionary<string, string>();
        public string PersonalRiskAssessment { get; set; } = null!;

        // Scouting grades from multiple sources
        public Dictionary<string, ScoutingGrades> ScoutingGrades { get; set; } = new Dictionary<string, ScoutingGrades>();
        public ScoutingGrades PersonalGrades { get; set; } = null!;

        // Draft tracking
        public bool IsDrafted { get; set; }
        public int? DraftRound { get; set; }
        public int? DraftPick { get; set; }
        public string? DraftedBy { get; set; }

        // Personal tracking
        public bool IsHighlighted { get; set; }
        public string? Notes { get; set; }
        public int? PersonalRank { get; set; }
    }
}
