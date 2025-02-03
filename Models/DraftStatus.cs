using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DraftEngine.Models;

public class DraftStatus
{
    [BsonRepresentation(BsonType.ObjectId)]
    public string DraftId { get; set; } = string.Empty;
    public bool IsDrafted { get; set; }
    public int Round { get; set; }
    public int Pick { get; set; }
    public int OverallPick { get; set; }
    public string ManagerId { get; set; } = string.Empty;
}
