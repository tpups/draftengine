using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.Serializers;

namespace DraftEngine.Models
{
    public class RankingDictionarySerializer : SerializerBase<Dictionary<RankingSource, int>>
    {
        public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, Dictionary<RankingSource, int> value)
        {
            var dictionary = new Dictionary<string, int>();
            if (value != null)
            {
                foreach (var kvp in value)
                {
                    dictionary[kvp.Key.ToString()] = kvp.Value;
                }
            }
            BsonSerializer.Serialize(context.Writer, dictionary);
        }

        public override Dictionary<RankingSource, int> Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        {
            var dictionary = BsonSerializer.Deserialize<Dictionary<string, int>>(context.Reader);
            var result = new Dictionary<RankingSource, int>();
            foreach (var kvp in dictionary)
            {
                if (Enum.TryParse<RankingSource>(kvp.Key, out var rankingSource))
                {
                    result[rankingSource] = kvp.Value;
                }
            }
            return result;
        }
    }

    public class Player
    {
        static Player()
        {
            BsonSerializer.RegisterSerializer(new RankingDictionarySerializer());
        }

        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string Name { get; set; } = null!;

        public string[]? Position { get; set; }

        [BsonSerializer(typeof(RankingDictionarySerializer))]
        public Dictionary<RankingSource, int>? Rank { get; set; }

        public Dictionary<string, int>? ProspectRank { get; set; }

        // Player information
        public string? MLBTeam { get; set; }
        public string? Level { get; set; }  // MLB, AAA, AA, etc.
        public DateTime? BirthDate { get; set; }
        public string? BirthCity { get; set; }
        public string? BirthStateProvince { get; set; }
        public string? BirthCountry { get; set; }
        public DateTime? MlbDebutDate { get; set; }
        public string? Height { get; set; }
        public int? Weight { get; set; }
        public bool Active { get; set; }
        public int? DraftYear { get; set; }
        public int? ETA { get; set; }  // Year expected to reach MLB

        // Risk assessments from multiple sources
        public Dictionary<string, string>? ProspectRisk { get; set; }
        public string? PersonalRiskAssessment { get; set; }

        // External identifiers from various platforms
        public Dictionary<string, string>? ExternalIds { get; set; }

        // Last time this player record was updated
        public DateTime LastUpdated { get; set; }

        // Scouting grades from multiple sources
        public Dictionary<string, ScoutingGrades>? ScoutingGrades { get; set; }
        public ScoutingGrades? PersonalGrades { get; set; }

        // Draft tracking
        public List<DraftStatus> DraftStatuses { get; set; } = new List<DraftStatus>();
        
        [BsonIgnore]
        public bool IsDrafted => DraftStatuses.Any(ds => ds.IsDrafted);

        // Personal tracking
        public bool IsHighlighted { get; set; }
        public string? Notes { get; set; }
        public int? PersonalRank { get; set; }
        public decimal? StarsRating { get; set; }  // 0-5 in 0.5 increments

        [BsonRepresentation(BsonType.String)]
        public RankingSource? CreatedFrom { get; set; }

        // Batting/Pitching information
        public string? BatSide { get; set; }
        public string? PitchHand { get; set; }

        // Statistical projections from multiple sources (Steamer, ZiPS, etc.)
        public Dictionary<string, ProjectionData>? Projections { get; set; }

        // Position history by season
        public Dictionary<string, Dictionary<string, int>>? PositionStats { get; set; } // Year -> (Position -> Games)
    }
}
