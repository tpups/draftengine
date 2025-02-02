using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine.Models;

public class Manager
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonRequired]
    public string Name { get; set; } = string.Empty;

    public string? TeamName { get; set; }

    [BsonRequired]
    public bool IsUser { get; set; }

    public string? Email { get; set; }
}
