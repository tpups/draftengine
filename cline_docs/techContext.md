# Technical Context

## Technology Stack

### Frontend
- React with TypeScript
  - Vite build tool
  - Material-UI components
  - React Query for API integration
  - AG Grid for data tables
- Node.js and npm
  - Required for frontend development
  - Package management
  - Build tooling

### Backend
- .NET Core 8.0
  - Latest LTS release
  - Cross-platform support
  - Modern C# features
  - Built-in dependency injection

### Database
- MongoDB
  - Document database
  - Flexible schema
  - High performance
  - Native JSON support
  - MongoDB.Driver for .NET
  - Player data structure:
    * Comprehensive player model
    * Multiple ranking sources
    * Scouting metrics
    * Draft status tracking
  - Data import process:
    * Batch file processing
    * JSON validation
    * Rank-based sorting
    * Data integrity checks

### API
- ASP.NET Core Web API
- RESTful architecture
- Documentation Patterns:
  * XML Documentation:
    - Comprehensive endpoint documentation
    - Parameter descriptions and constraints
    - Response type specifications
    - Error scenarios and handling
    - Example request/response pairs
  * TypeScript Documentation:
    - TSDoc comments for service methods
    - Interface and type definitions
    - Parameter and return type documentation
    - Error handling patterns
    - Usage examples
  * Component Documentation:
    - Clear props documentation
    - State management patterns
    - Event handling documentation
    - Visual state documentation
    - Accessibility considerations
- Swagger/OpenAPI Integration:
  * Standard ASP.NET Core conventions
  * Proper response type attributes
  * Error response documentation
  * File upload configuration
  * Debug mode support
- JSON Response Format:
  * Consistent ApiResponse<T> wrapper
  * Standard error format
  * Validation error structure
  * Debug information handling
- File Upload Support:
  * Dedicated request models
  * Multipart/form-data handling
  * Progress tracking
  * Validation and error handling

### Development Tools
- Docker
  - Containerization
  - Development consistency
  - Easy deployment
- Visual Studio Code
  - Lightweight IDE
  - Cross-platform
  - Rich extension ecosystem

## Development Setup

### Prerequisites
1. .NET Core 8.0 SDK
2. MongoDB
3. Docker (optional)
4. Visual Studio Code or Visual Studio

### Environment Configuration
- Configuration Sources:
  * appsettings.json for base configuration
    - Uses colon notation for hierarchical keys (e.g., "MongoDB:ConnectionString")
    - JSON standard format
  * Environment variables for overrides
    - Uses double underscore notation (e.g., "MongoDB__ConnectionString")
    - Required format for Docker/container environments
  * Both formats are equivalent when accessed in code
- Development/Production environments
- MongoDB connection settings
- Docker configuration

### Project Structure
```
DraftEngine/
├── Controllers/         # API endpoints
├── Models/             # Data models
│   └── Data/           # Data transfer objects
├── Services/           # Business logic
└── Properties/         # Configuration
```

## Technical Constraints

### Database
- MongoDB schema flexibility
- Document size limits
- Index considerations
- Connection management

### API
- RESTful constraints
- HTTP method semantics
- Status code usage
- Response formats

### Development
- Cross-platform compatibility
- Docker container limits
- API versioning considerations
- Authentication/Authorization needs

## Deployment Considerations

### Docker Support
- Dockerfile provided
- Multi-stage builds
- Environment variables
- Volume management

### Scaling
- Horizontal scaling capability
- MongoDB replication
- Load balancing needs
- Caching strategies

### Monitoring
- Logging requirements
- Performance metrics
- Error tracking
- Health checks

## Future Technical Considerations
- Front-end technology selection
- Authentication implementation
- Real-time updates (if needed)
- Caching strategy
- API versioning
