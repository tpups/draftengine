using Microsoft.Extensions.Logging;
using DraftEngine.Services;

namespace DraftEngine.Services;

public class DebugLoggerProvider : ILoggerProvider
{
    private readonly DebugService _debugService;

    public DebugLoggerProvider(DebugService debugService)
    {
        _debugService = debugService;
    }

    public ILogger CreateLogger(string categoryName)
    {
        return new DebugLogger(categoryName, _debugService);
    }

    public void Dispose()
    {
        // No resources to dispose
    }

    private class DebugLogger : ILogger
    {
        private readonly string _categoryName;
        private readonly DebugService _debugService;

        public DebugLogger(string categoryName, DebugService debugService)
        {
            _categoryName = categoryName;
            _debugService = debugService;
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            // Only show Information and above for DraftEngine namespace
            // And Warning and above for other namespaces
            return _categoryName.StartsWith("DraftEngine") 
                ? logLevel >= LogLevel.Information
                : logLevel >= LogLevel.Warning;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
            {
                return;
            }

            var message = formatter(state, exception);
            if (exception != null)
            {
                message = $"{message} Exception: {exception}";
            }

            // Format the message with the category name for better context
            var formattedMessage = $"[{_categoryName}] {message}";
            
            // Send to debug service
            _debugService.LogToFrontend(logLevel, formattedMessage);
        }
    }
}
