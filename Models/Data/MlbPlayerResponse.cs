using System.Text.Json.Serialization;

namespace DraftEngine.Models.Data
{
    public class MlbPlayerResponse
    {
        [JsonPropertyName("copyright")]
        public string? Copyright { get; set; }

        [JsonPropertyName("people")]
        public People[]? People { get; set; }
    }

    public class People
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("fullName")]
        public string? FullName { get; set; }

        [JsonPropertyName("firstName")]
        public string? FirstName { get; set; }

        [JsonPropertyName("lastName")]
        public string? LastName { get; set; }

        [JsonPropertyName("primaryNumber")]
        public string? PrimaryNumber { get; set; }

        [JsonPropertyName("birthDate")]
        public string? BirthDate { get; set; }

        [JsonPropertyName("currentAge")]
        public int? CurrentAge { get; set; }

        [JsonPropertyName("birthCity")]
        public string? BirthCity { get; set; }

        [JsonPropertyName("birthStateProvince")]
        public string? BirthStateProvince { get; set; }

        [JsonPropertyName("birthCountry")]
        public string? BirthCountry { get; set; }

        [JsonPropertyName("height")]
        public string? Height { get; set; }

        [JsonPropertyName("weight")]
        public int? Weight { get; set; }

        [JsonPropertyName("active")]
        public bool Active { get; set; }

        [JsonPropertyName("primaryPosition")]
        public Position? PrimaryPosition { get; set; }

        [JsonPropertyName("useName")]
        public string? UseName { get; set; }

        [JsonPropertyName("useLastName")]
        public string? UseLastName { get; set; }

        [JsonPropertyName("middleName")]
        public string? MiddleName { get; set; }

        [JsonPropertyName("boxscoreName")]
        public string? BoxscoreName { get; set; }

        [JsonPropertyName("gender")]
        public string? Gender { get; set; }

        [JsonPropertyName("isPlayer")]
        public bool IsPlayer { get; set; }

        [JsonPropertyName("isVerified")]
        public bool IsVerified { get; set; }

        [JsonPropertyName("draftYear")]
        public int? DraftYear { get; set; }

        [JsonPropertyName("mlbDebutDate")]
        public string? MlbDebutDate { get; set; }

        [JsonPropertyName("batSide")]
        public Side? BatSide { get; set; }

        [JsonPropertyName("pitchHand")]
        public Side? PitchHand { get; set; }
    }

    public class Side
    {
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }


}
