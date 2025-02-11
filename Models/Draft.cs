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
    public DraftPosition[] DraftOrder { get; set; } = Array.Empty<DraftPosition>();
    public List<DraftRound> Rounds { get; set; } = new();

    // For tracking draft progress
    [BsonElement("CurrentRound")]
    public int? CurrentRound { get; set; }

    [BsonElement("CurrentPick")]
    public int? CurrentPick { get; set; }

    [BsonElement("CurrentOverallPick")]
    public int? CurrentOverallPick { get; set; } = 1;

    // For UI selection/navigation
    [BsonElement("ActiveRound")]
    public int? ActiveRound { get; set; }

    [BsonElement("ActivePick")]
    public int? ActivePick { get; set; }

    [BsonElement("ActiveOverallPick")]
    public int ActiveOverallPick { get; set; } = 1;
}

public class DraftRound
{
    public int RoundNumber { get; set; }
    public DraftPosition[] Picks { get; set; } = Array.Empty<DraftPosition>();
}

public class DraftPosition
{
    public string ManagerId { get; set; } = string.Empty;
    public List<string> TradedTo { get; set; } = new();
    public int PickNumber { get; set; }
    public bool IsComplete { get; set; }
    public int OverallPickNumber { get; set; }
}
