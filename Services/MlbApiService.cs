using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using DraftEngine.Models.Configuration;
using DraftEngine.Models.Data;

namespace DraftEngine.Services
{
    public interface IMlbApiService
    {
        Task<MlbPlayerResponse?> GetPlayerInfoAsync(string mlbId);
    }

    public class MlbApiService : IMlbApiService, IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly IOptions<MlbApiOptions> _options;
        private readonly ILogger<MlbApiService> _logger;
        private readonly SemaphoreSlim _rateLimiter;
        private readonly Timer _rateLimitResetTimer;
        private int _requestCount;

        public MlbApiService(
            HttpClient httpClient, 
            IOptions<MlbApiOptions> options,
            ILogger<MlbApiService> logger)
        {
            _httpClient = httpClient;
            _options = options;
            _logger = logger;
            _rateLimiter = new SemaphoreSlim(1, 1);
            _requestCount = 0;

            // Configure base address (ensure trailing slash)
            var baseUrl = _options.Value.BaseUrl.TrimEnd('/') + "/";
            _httpClient.BaseAddress = new Uri(baseUrl);

            // Reset request count every minute
            _rateLimitResetTimer = new Timer(_ =>
            {
                _requestCount = 0;
            }, null, TimeSpan.Zero, TimeSpan.FromMinutes(1));
        }

        public async Task<MlbPlayerResponse?> GetPlayerInfoAsync(string mlbId)
        {
            await WaitForRateLimit();

            try
            {
                _logger.LogInformation("Fetching MLB player info for ID: {MlbId}", mlbId);
                var response = await _httpClient.GetAsync($"people/{mlbId}");
                var content = await response.Content.ReadAsStringAsync();
                
                _logger.LogInformation("MLB API Response for ID {MlbId}: {Response}", mlbId, content);
                
                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        var result = JsonSerializer.Deserialize<MlbPlayerResponse>(content, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                        
                        if (result?.People == null || result.People.Length == 0)
                        {
                            _logger.LogWarning("No player data found for MLB ID: {MlbId}", mlbId);
                        }
                        else
                        {
                            _logger.LogInformation("Successfully parsed player data for MLB ID {MlbId}. BirthDate: {BirthDate}", 
                                mlbId, result.People[0].BirthDate);
                        }
                        
                        return result;
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogError(ex, "Error parsing MLB API response for ID {MlbId}. Content: {Content}", 
                            mlbId, content);
                        return null;
                    }
                }

                // Handle rate limiting
                if ((int)response.StatusCode == 429) // Too Many Requests
                {
                    _logger.LogWarning("Rate limit hit for MLB ID: {MlbId}. Retrying after delay.", mlbId);
                    await Task.Delay(_options.Value.RateLimit.RetryDelayMs);
                    return await GetPlayerInfoAsync(mlbId);
                }

                _logger.LogError("MLB API request failed for ID {MlbId}. Status: {Status}, Response: {Response}", 
                    mlbId, response.StatusCode, content);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching MLB player info for ID: {MlbId}", mlbId);
                return null;
            }
        }

        private async Task WaitForRateLimit()
        {
            await _rateLimiter.WaitAsync();
            try
            {
                if (_requestCount >= _options.Value.RateLimit.RequestsPerMinute)
                {
                    // Wait until next minute
                    await Task.Delay(_options.Value.RateLimit.RetryDelayMs);
                }
                _requestCount++;
            }
            finally
            {
                _rateLimiter.Release();
            }
        }

        public void Dispose()
        {
            _rateLimitResetTimer?.Dispose();
            _rateLimiter?.Dispose();
        }
    }
}
