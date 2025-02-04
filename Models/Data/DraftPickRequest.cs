namespace DraftEngine.Models.Data;

public class DraftPickRequest
{
    public string DraftedBy { get; set; } = string.Empty;
    public int Round { get; set; }
    public int Pick { get; set; }
    public int OverallPick { get; set; }
}
