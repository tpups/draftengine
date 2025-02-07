namespace DraftEngine.Models.Configuration;

public class DebugOptions
{
    // Enable logging to the browser console
    public bool EnableConsoleLogging { get; set; }
    // Enable API logging to the frontend UI
    public bool EnableFrontendLogging { get; set; }
    public int LogBufferSize { get; set; } = 100;
}
