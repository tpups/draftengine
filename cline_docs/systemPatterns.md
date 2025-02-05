# System Patterns

## Architecture Overview
The DraftEngine follows a modern web API architecture with clear separation of concerns and RESTful principles.

## Core Patterns

### Draft Pick Management
1. Pick State System
   - Two-tier pick tracking:
     * Current Round/Pick: Tracks draft progress (next pick after last completed)
     * Active Round/Pick: UI selection for viewing/editing picks
   - Single user enters all picks for all managers
   - Draft model tracks:
     * Pick completion status
     * Snake draft ordering
     * Manager assignments
     * Active pick state
   - Draft rules:
     * Can select and view any pick
     * Can only draft players with incomplete picks
     * In current round:
       - For normal rounds: can draft if pick <= current pick
       - For snake rounds: can draft if pick >= current pick
     * Can draft with any incomplete pick in past rounds
   - Pick advancement:
     * Draft uses active pick for making selections
     * Active pick state persisted in backend
     * Next pick button advances from active pick
     * Skip to next incomplete finds next available pick
   - State synchronization:
     * Backend maintains both current and active pick states
     * Frontend updates both states on pick selection
     * Error handling for state mismatch

2. Pick State Logging
   - Context-based logging for state changes:
     * Active vs Current pick states
     * Before/after pick advancement
     * Before/after pick selection
     * Draft completion events
   - Organized availability dictionary by round:
     * Tracks pick order
     * Maintains completion status
     * Handles snake draft ordering
   - Clear state transition messages
   - Debug mode configuration support

3. UI Feedback
   - Visual pick state indicators:
     * Selected pick: Blue background (primary.main)
     * Current pick: Orange background (warning.light)
     * Active pick: Light blue background (info.light)
     * Available pick: White/light grey based on round type
     * Unavailable pick: Grey background (grey.200)
   - Interactive elements:
     * Hover effects only on available picks
     * Elevation and color change on hover
     * Different hover colors based on pick state
     * Cursor changes for available/unavailable picks
   - Border styling:
     * Left border for first round and normal rounds
     * Right border for snake rounds
     * Visual separation between round types
   - Information display:
     * Manager name in pick cell
     * Tooltip with round, pick, and overall numbers
     * Pick number calculations for snake rounds
     * Clear visual hierarchy of information
   - Accessibility:
     * High contrast color choices
     * Clear visual state indicators
     * Proper cursor feedback
     * Informative tooltips

### Admin Panel Organization
1. Component Structure
   - Focused components in admin/ directory:
     * DataManagement: Data operations and imports
     * DraftManagement: Draft creation and management
     * ManagerSection: Manager list and operations
   - Clear separation of concerns
   - Independent state management
   - Consistent styling patterns
   - Reusable dialog patterns

2. UI Patterns
   - Section Headers:
     * Title on left (flex: 1)
     * Metadata in middle (secondary color)
     * Action buttons on right
     * Consistent spacing with gap
   - Dialog Management:
     * State controlled by parent
     * Props for open/close control
     * Consistent styling
     * Clear success/error feedback
   - List Views:
     * Scrolling over pagination
     * Conditional rendering
     * Loading states
     * Empty states with guidance
   - Action Buttons:
     * Hover animations
     * Clear iconography
     * Consistent positioning
     * Proper spacing

3. Draft Management
   - Draft Service Layer:
     * MongoDB integration for draft persistence
     * Active draft tracking
     * Draft history management
     * Snake draft support
   - Draft Order Management:
     * Drag-and-drop functionality
     * Manager selection
     * Order validation
     * Round configuration
   - UI Patterns:
     * Confirmation dialogs for destructive actions
     * Loading state management
     * Error handling and feedback
     * Consistent dialog styling

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
- File Upload Handling:
  * Dedicated request models for file uploads
  * Proper multipart/form-data configuration
  * Swagger documentation support
  * Validation and error handling
  * Progress tracking and logging

### Swagger Configuration
- XML documentation for all endpoints:
  * Clear operation descriptions
  * Detailed parameter documentation
  * Response type specifications
  * Error response documentation
  * Example request/response pairs
- Standard ASP.NET Core conventions:
  * Schema naming conventions
  * Route attribute usage
  * Model binding patterns
  * Response type attributes
- Error handling documentation:
  * HTTP status code usage
  * Error response formats
  * Validation error handling
  * Business rule violations
- Development support:
  * Debug mode configuration
  * Console logging options
  * State transition logging
  * Pick state debugging
- File upload configuration:
  * IFormFile mapping
  * Multipart/form-data support
  * Upload progress tracking
  * Error handling

### Data Layer
1. Draft Data Structure
   - Draft model with:
     * Core info (year, type)
     * Draft order tracking
     * Round management
     * Snake draft support
     * Active status tracking
     * Creation timestamp
   - Draft order structure:
     * Manager assignments
     * Pick numbers
     * Completion status
   - Round structure:
     * Round number tracking
     * Pick management
     * Order calculation for snake drafts
   - MongoDB integration:
     * Proper indexing
     * Efficient querying
     * Transaction support
2. Player Data Structure
   - Comprehensive player model with:
     * Core info (name, position, team)
     * Ranking data (steamer_2025)
     * Biographical info (birthDate, level)
     * Scouting information (grades, risk assessment)
     * Draft status tracking
     * Personal notes and highlights
     * Statistical projections with update tracking
   - Projection data structure:
     * Multiple source support (Steamer, ZiPS, etc.)
     * Flexible stat categories via dictionary
     * Update date tracking for freshness
   - JSON format for easy import/export
   - Flexible schema for different player types
   - Support for multiple ranking sources
   - Proper nullability for optional fields

3. Data Import Process
   - Batch file processing
   - Source file validation
   - Rank-based sorting
   - Data integrity checks
   - PowerShell command handling
   - Error handling and logging
   - Verification steps

4. MongoDB Integration
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
   - Duplicate Detection:
     * Compound unique index on name + birthDate
     * Smart merge logic for duplicate records
     * Dictionary fields for extensible data (ranks, IDs)
     * Preserve existing data during merges
     * Update timestamps for tracking changes

5. Data Models
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
1. Draft Service Design
   - Two-tier pick tracking system:
     * Current Pick: Tracks actual draft progress
     * Active Pick: Manages UI selection state
   - Robust error handling and validation:
     * Input parameter validation
     * Database operation error handling
     * State consistency checks
     * Protection against invalid states
   - Comprehensive documentation:
     * XML documentation for all methods
     * Clear parameter descriptions
     * Exception documentation
     * Usage remarks and examples
   - Draft state management:
     * Single active draft enforcement
     * Draft creation with validation
     * Round management (add/remove)
     * Pick state synchronization
   - MongoDB integration:
     * Async operations throughout
     * Proper filter and update definitions
     * Efficient query patterns
     * Result validation

2. Service Layer Patterns
   - Service class per domain entity
   - Dependency injection
   - Repository pattern implementation
   - Async operations
   - Standardized error handling
   - Consistent logging practices

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
### Docker Development Considerations
- Live updates behavior:
  * Frontend (Vite) supports hot reloading
  * API has two development options:
    1. Standard mode (Dockerfile):
       - Requires container rebuild for code changes
       - Use `docker compose up -d --build api` to apply changes
       - More stable, but slower development cycle
    2. Watch mode (Dockerfile.dev):
       - Uses `dotnet watch` for hot reloading
       - Automatically recompiles on file changes
       - Faster development cycle, but may require container restart if watch fails
       - Configured with volume mounts to exclude bin/obj directories
       - Uses SDK image instead of runtime for development

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
