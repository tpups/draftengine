using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine.Models
{
    public class LeagueSettings
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public int MinGamesForPosition { get; set; } = 10;  // Default value
    }
}
