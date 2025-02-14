using System.Text.Json.Serialization;

namespace DraftEngine.Models.Data
{
    public class Position
    {
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("abbreviation")]
        public string? Abbreviation { get; set; }
    }
}
