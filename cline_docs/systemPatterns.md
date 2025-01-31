# System Patterns

## Architecture Overview
The DraftEngine follows a modern web API architecture with clear separation of concerns and RESTful principles.

## Core Patterns

### Frontend Architecture
1. React Router Integration
   - Direct use of React Router components
   - Proper integration with Material-UI:
     * Use Link component from react-router-dom directly
     * Wrap Material-UI components with Link when needed
     * Keep routing logic separate from UI components
   - Route configuration in App.tsx
   - Protected routes for admin features

2. Component Structure
   - Functional components with hooks
   - Top-level hook declarations
   - Proper state management
   - Clear component hierarchy
   - Material-UI integration patterns

3. State Management
   - React Query for API state
   - Local state with useState
   - Component-level state isolation
   - Proper error handling
   - Loading state management

### API Design
- RESTful API architecture
- Controller-Service pattern
- Async/await throughout for scalability
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Proper HTTP status code usage
- Standardized response format:
  * ApiResponse<T> wrapper for all responses
  * Value property contains actual data
  * Count property for collection metadata
  * Consistent structure across endpoints

### Data Layer
1. Player Data Structure
   - Comprehensive player model with:
     * Core info (name, position, team)
     * Ranking data (steamer_2025)
     * Biographical info (birthDate, level)
     * Scouting information (grades, risk assessment)
     * Draft status tracking
     * Personal notes and highlights
   - JSON format for easy import/export
   - Flexible schema for different player types
   - Support for multiple ranking sources
   - Proper nullability for optional fields

2. Data Import Process
   - Batch file processing
   - Source file validation
   - Rank-based sorting
   - Data integrity checks
   - PowerShell command handling
   - Error handling and logging
   - Verification steps

3. MongoDB Integration
   - Document-based storage
   - Async operations
   - Collection per entity type
   - MongoDB.Driver for .NET
   - Auto-generated Id handling:
     * Use nullable Id properties in models
     * [BsonId] attribute for mapping
     * [BsonRepresentation(BsonType.ObjectId)] for proper type conversion
     * Let MongoDB handle Id generation
     * Validate Id after creation

4. Data Models
   - C# 8.0 nullable reference types
   - Clear property definitions
   - Dictionary-based flexible storage for rankings
   - MongoDB BSON attributes for mapping
   - Proper nullability for auto-generated fields
   - Model validation considerations:
     * Use nullable types for MongoDB-managed fields
     * Consider validation timing (pre/post database)
     * Handle auto-generated values appropriately

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

### Frontend Stack
- React 18 with TypeScript
- Material-UI for components
- React Router for navigation
- React Query for data fetching
- Vite for development server

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
├── ClientApp/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/        # Route-level components
│   │   ├── services/     # API client and services
│   │   ├── types/        # TypeScript definitions
│   │   └── utils/        # Helper functions
├── Controllers/          # API endpoints
├── Models/              # Data models
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

4. Frontend Development
   - React hooks at top level
   - Consistent component structure
   - Material-UI integration patterns
   - TypeScript for type safety
   - Proper routing implementation
