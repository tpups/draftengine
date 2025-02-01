using System;

namespace DraftEngine.Models.Configuration
{
    public class MlbApiOptions
    {
        public string BaseUrl { get; set; } = string.Empty;
        public RateLimitOptions RateLimit { get; set; } = new();
    }

    public class RateLimitOptions
    {
        public int RequestsPerMinute { get; set; } = 240;
        public int RetryAttempts { get; set; } = 3;
        public int RetryDelayMs { get; set; } = 1000;
    }
}
