# System Patterns

## Architecture Overview
The DraftEngine follows a modern web API architecture with clear separation of concerns and RESTful principles.

## Core Patterns

### API Design
- RESTful API architecture
- Controller-Service pattern
- Async/await throughout for scalability
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Proper HTTP status code usage

### Data Layer
1. MongoDB Integration
   - Document-based storage
   - Async operations
   - Collection per entity type
   - MongoDB.Driver for .NET

2. Data Models
   - C# 8.0 nullable reference types
   - Clear property definitions
   - Dictionary-based flexible storage for rankings
   - MongoDB BSON attributes for mapping

### Service Layer
- Service class per domain entity
- Dependency injection
- Repository pattern implementation
- Async operations

### API Controllers
- Attribute routing
- Model validation
- Action result types
- Standard REST endpoints

## Key Technical Decisions

### MongoDB Choice
- Flexible schema for evolving player data
- Good performance for read-heavy operations
- Easy scaling
- Native JSON support

### .NET Core 8.0
- Modern C# features
- Cross-platform support
- Built-in dependency injection
- Strong type system

### Docker Support
- Containerization for consistency
- Easy deployment
- Development/production parity
- Environment configuration

## Code Organization
```
DraftEngine/
├── Controllers/         # API endpoints
├── Models/             # Data models
├── Services/           # Business logic
└── Properties/         # Configuration
```

## Best Practices
1. Code Style
   - Nullable reference types
   - Async/await patterns
   - Clear naming conventions
   - Service-based architecture

2. API Design
   - RESTful endpoints
   - Proper status codes
   - Action result types
   - Route attributes

3. Data Management
   - Async database operations
   - Proper error handling
   - Data validation
   - MongoDB best practices
