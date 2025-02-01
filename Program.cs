using DraftEngine;
using DraftEngine.Swagger;
using DraftEngine.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.Logging;
using DraftEngine.Models.Configuration;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on all interfaces
builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(int.Parse(builder.Configuration["ASPNETCORE_HTTP_PORT"] ?? "8080"));
});

// Add services to the container.
builder.Services.AddSingleton<MongoDbContext>(sp => new MongoDbContext(builder.Configuration));
builder.Services.AddSingleton<PlayerService>(sp => new PlayerService(
    sp.GetRequiredService<MongoDbContext>(),
    sp.GetRequiredService<IMlbApiService>(),
    sp.GetRequiredService<ILogger<PlayerService>>()
));
builder.Services.AddHttpClient();
builder.Services.Configure<MlbApiOptions>(builder.Configuration.GetSection("MlbApi"));
builder.Services.AddSingleton<IMlbApiService, MlbApiService>();

// Configure CORS
var corsOrigins = builder.Environment.IsDevelopment()
    ? new[] { "http://localhost:5173" }                      // Development
    : new[] { "http://localhost", "https://localhost" };     // Production

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(builder =>
    {
        builder.WithOrigins(corsOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("X-Total-Count")             // For pagination
            .SetIsOriginAllowedToAllowWildcardSubdomains(); // Allow subdomains
    });
});

// Add custom exception handling middleware
builder.Services.AddExceptionHandler(options =>
{
    options.ExceptionHandler = async context =>
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        
        logger.LogError(exception, "An unhandled exception occurred");
        
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        
        await context.Response.WriteAsJsonAsync(new
        {
            Message = "An error occurred processing your request",
            Error = builder.Environment.IsDevelopment() ? exception?.Message : null
        });
    };
});

// Configure API behavior options
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError("Model validation failed: {Errors}", 
            string.Join("; ", context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)));
        
        return new BadRequestObjectResult(new
        {
            Message = "Validation failed",
            Errors = context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
        });
    };
});

// Configure routing options
builder.Services.Configure<RouteOptions>(options =>
{
    options.LowercaseUrls = true;
    options.LowercaseQueryStrings = true;
});

builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
    options.SerializerSettings.NullValueHandling = Newtonsoft.Json.NullValueHandling.Include;
    options.SerializerSettings.DefaultValueHandling = Newtonsoft.Json.DefaultValueHandling.Include;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "DraftEngine API", 
        Version = "v1",
        Description = "API for managing baseball draft prospects"
    });
    
    // Configure Swagger to handle XML comments
    var logger = LoggerFactory.Create(config => 
    {
        config.AddConsole();
        config.SetMinimumLevel(LogLevel.Debug);
    }).CreateLogger("Swagger");

    try
    {
        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        
        logger.LogInformation("Looking for XML file at: {XmlPath}", xmlPath);
        logger.LogInformation("Current directory: {CurrentDir}", Directory.GetCurrentDirectory());
        logger.LogInformation("Base directory: {BaseDir}", AppContext.BaseDirectory);
        
        if (File.Exists(xmlPath))
        {
            logger.LogInformation("XML file found, attempting to include comments");
            c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
            logger.LogInformation("Successfully included XML comments");
        }
        else
        {
            var files = Directory.GetFiles(AppContext.BaseDirectory, "*.xml");
            logger.LogWarning("XML file not found at expected path. Available XML files: {Files}", 
                string.Join(", ", files));
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error configuring Swagger XML documentation");
        // Continue without XML documentation rather than failing
        logger.LogWarning("Continuing Swagger generation without XML documentation");
    }

    // Configure Swagger to handle file uploads
    c.MapType<IFormFile>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "binary"
    });

});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else 
{
    // Use custom exception handling in production
    app.UseExceptionHandler();
}

// CORS must be before routing/endpoints
app.UseCors();

// Add basic health check endpoint
app.MapGet("/health", () => Results.Ok(new { Status = "Healthy" }))
   .AllowAnonymous();

// Disable HTTPS redirection in development
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthorization();

// Configure API path base for production
if (!app.Environment.IsDevelopment())
{
    app.UsePathBase("/api");
    
    // Ensure we can still handle requests both with and without the /api prefix
    app.Use(async (context, next) =>
    {
        context.Request.PathBase = "/api";
        await next();
    });
}

app.MapControllers();

app.Run();
