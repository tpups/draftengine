using Newtonsoft.Json;

namespace DraftEngine.Models.Data
{
    public class JsonPlayerImport
    {
        [JsonProperty("players")]
        public List<Player> Players { get; set; } = new List<Player>();
    }
}
