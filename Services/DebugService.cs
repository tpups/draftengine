using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using DraftEngine.Models.Configuration;

namespace DraftEngine.Services;

public class DebugService
{
    private readonly ConcurrentQueue<LogEntry> _recentLogs = new ConcurrentQueue<LogEntry>();
    private readonly int _bufferSize;
    private readonly bool _enabled;

    public DebugService(IOptions<DebugOptions> options)
    {
        _bufferSize = options.Value.LogBufferSize;
        _enabled = options.Value.EnableFrontendLogging;
    }

    public void LogToFrontend(LogLevel level, string message)
    {
        if (!_enabled) return;

        var entry = new LogEntry
        {
            Timestamp = DateTime.UtcNow,
            Level = level,
            Message = message
        };

        _recentLogs.Enqueue(entry);

        // Maintain buffer size
        while (_recentLogs.Count > _bufferSize)
        {
            _recentLogs.TryDequeue(out _);
        }
    }

    public IEnumerable<LogEntry> GetRecentLogs()
    {
        return _recentLogs.ToArray();
    }

    public void ClearLogs()
    {
        while (_recentLogs.TryDequeue(out _)) { }
    }
}

public class LogEntry
{
    public DateTime Timestamp { get; set; }
    public LogLevel Level { get; set; }
    public string Message { get; set; } = string.Empty;
}
