using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine.Models;

public class Draft
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    
    public int Year { get; set; }
    public string Type { get; set; } = string.Empty;
    public bool IsSnakeDraft { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    
    public List<DraftRound> Rounds { get; set; } = new();
    public DraftPosition[] DraftOrder { get; set; } = Array.Empty<DraftPosition>();
}

public class DraftRound
{
    public int RoundNumber { get; set; }
    public DraftPosition[] Picks { get; set; } = Array.Empty<DraftPosition>();
}

public class DraftPosition
{
    public string ManagerId { get; set; } = string.Empty;
    public int PickNumber { get; set; }
    public bool IsComplete { get; set; }
}
