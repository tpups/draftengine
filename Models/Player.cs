using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine
{
    public class Player
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string Name { get; set; } = null!;

        public string[]? Position { get; set; }

        public Dictionary<string, int>? Rank { get; set; }

        public Dictionary<string, int>? ProspectRank { get; set; }

        // Player information
        public string? MLBTeam { get; set; }
        public string? Level { get; set; }  // MLB, AAA, AA, etc.
        public DateTime? BirthDate { get; set; }
        public int? ETA { get; set; }  // Year expected to reach MLB

        // Risk assessments from multiple sources
        public Dictionary<string, string>? ProspectRisk { get; set; }
        public string? PersonalRiskAssessment { get; set; }

        // Scouting grades from multiple sources
        public Dictionary<string, ScoutingGrades>? ScoutingGrades { get; set; }
        public ScoutingGrades? PersonalGrades { get; set; }

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
