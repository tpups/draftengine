using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine.Models;

public class Trade
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public DateTime Timestamp { get; set; }
    public string? Notes { get; set; }
    public TradeStatus Status { get; set; }
    public List<TradeParty> Parties { get; set; } = new();
}

public class TradeParty
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string ManagerId { get; set; } = string.Empty;
    public bool Proposed { get; set; } = false;
    public bool Accepted { get; set; } = false;
    public List<TradeAsset> Assets { get; set; } = new();
}

public class TradeAsset
{
    public TradeAssetType Type { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DraftId { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string? PlayerId { get; set; }
    
    public int? OverallPickNumber { get; set; }
    public int? PickNumber { get; set; }
    public int? RoundNumber { get; set; }
}

public enum TradeAssetType
{
    DraftPick,
    Player
}

public enum TradeStatus
{
    Proposed,
    Accepted,
    Approved,
    Completed,
    Reversed,
    Cancelled
}
