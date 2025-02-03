using System.ComponentModel.DataAnnotations;

namespace DraftEngine.Models.Data;

public class CreateDraftRequest
{
    [Required]
    public int Year { get; set; }
    [Required]
    public string Type { get; set; } = string.Empty;
    public bool IsSnakeDraft { get; set; }
    [Required]
    public int InitialRounds { get; set; }
    [Required]
    public DraftPosition[] DraftOrder { get; set; } = Array.Empty<DraftPosition>();
}

public class MarkPickRequest
{
    [Required]
    public int RoundNumber { get; set; }
    [Required]
    public string ManagerId { get; set; } = string.Empty;
    [Required]
    public string PlayerId { get; set; } = string.Empty;
}

public class AdvancePickRequest
{
    public bool SkipCompleted { get; set; }
}

public class UpdateActivePickRequest
{
    [Required]
    public int Round { get; set; }
    [Required]
    public int Pick { get; set; }
    [Required]
    public int OverallPickNumber { get; set; }
}
