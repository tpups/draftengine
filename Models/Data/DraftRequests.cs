namespace DraftEngine.Models.Data;

public class CreateDraftRequest
{
    public int Year { get; set; }
    public string Type { get; set; } = string.Empty;
    public bool IsSnakeDraft { get; set; }
    public int InitialRounds { get; set; }
    public DraftPosition[] DraftOrder { get; set; } = Array.Empty<DraftPosition>();
}

public class MarkPickRequest
{
    public int RoundNumber { get; set; }
    public string ManagerId { get; set; } = string.Empty;
}

public class CurrentPickResponse
{
    public int Round { get; set; }
    public int Pick { get; set; }
}
