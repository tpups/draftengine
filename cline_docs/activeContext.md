# Active Context

## Current Development Focus
- Admin Panel Implementation
  * Frontend routing and navigation
  * DataGrid component implementation and debugging
- Frontend-backend integration
- Player data management refinements

## Latest Data Import Progress
- Successfully combined player data from multiple batch files
- Created comprehensive top_players.json with 100 players
- Players sorted by steamer_2025 rank (1-100)
- Complete player data including:
  * Basic info (name, position, team)
  * Ranking data
  * Biographical info
  * Scouting information
  * 2025 projections

## Recent Changes

1. CSV Import Fix: (2/1/25)
    - Added upload method to apiClient for handling file uploads
    - Updated AdminPanel to use apiClient.upload instead of direct fetch
    - Fixed incorrect API URL routing for CSV imports
    - Added proper TypeScript typing for response handling
    - Verified working CSV import functionality

2. Swagger Documentation Improvements: (2/1/25)
    - Fixed Swagger documentation for file upload functionality
    - Created CsvImportRequest model for better request handling
    - Simplified schema naming using ASP.NET Core conventions
    - Removed custom schema ID generation in favor of built-in approach
    - Improved XML documentation for API endpoints
    - Verified working file upload in Swagger UI
    - Added proper error handling and logging for Swagger configuration

3. Branding Updates: (1/31/25)
    - Updated browser tab title to "Hampio's Draft Engine"
    - Updated AppBar title to match
    - Created custom retro V6 engine icon
    - Added engine icon to browser tab and AppBar
    - Used Material-UI blue colors for consistent branding

4. Navigation Button Styling: (1/31/25)
    - Enhanced AppBar button styling
    - Used contained variant with default Material-UI shadows
    - Added subtle white background (10% opacity)
    - Increased opacity on hover (20%)
    - Maintained consistent white text color
    - Improved visual feedback for user interactions

5. Statistical Projections Support: (1/31/25)
    - Added ProjectionData class to store statistical projections
    - Added Projections dictionary to Player model
    - Supports multiple projection sources (e.g., Steamer, ZiPS)
    - Includes UpdatedDate tracking for projection freshness
    - Flexible stat categories through dictionary structure
    - Verified model changes in development environment

6. CSV Import Implementation: (1/31/25)
    - Added CsvPlayerImport model for handling CSV file processing
    - Implemented flexible CSV parsing with CsvHelper library
    - Added support for both hitter and pitcher projections
    - Created importcsv endpoint in PlayerController
    - Added data source and import date tracking
    - Implemented player count validation
    - Fixed development environment configuration:
      * Switched to docker-compose.dev.yml for proper port mappings
      * Resolved API connectivity issues
      * Verified both JSON and CSV import functionality

7. Delete All Endpoint: (1/31/25)
    - Added DeleteAll endpoint and DeleteAllAsync method
    - Initially encountered 404 error with /player/deleteall route
    - Investigated potential route casing and configuration issues
    - Found that API container wasn't picking up code changes with just restart
    - Resolution: Required full rebuild with `docker compose up -d --build api`
    - Endpoint now working and visible in Swagger
    - Delete all functionality confirmed working in admin panel

8. Duplicate Player Detection: (1/31/25)
    - Added ExternalIds dictionary to Player model for various platform IDs
    - Created compound unique index on name + birthDate in MongoDB
    - Implemented smart merge logic in PlayerService
    - Added helper function to merge dictionary fields
    - Tested with Bobby Witt Jr. player data:
      * Successfully preserved rank data from first import
      * Added external IDs from second import
      * Properly updated lastUpdated timestamp
      * Verified data merging with multiple imports
    - Documented merge behavior for future reference

9. JSON Import Fix:
   - Updated BatchImport endpoint to handle both array and wrapped formats
   - Modified frontend to maintain consistent JSON structure
   - Fixed player import functionality in AdminPanel
   - Verified successful batch import of player data

10. React Router Integration Fix:
   - Fixed routing issues in App.tsx
   - Updated Link component implementation
   - Properly integrated Material-UI with React Router
   - Resolved module resolution error for react-router-dom
   - Verified working in development environment

11. Admin Panel Implementation:
   - Created new AdminPanel component
   - Added basic layout with Material-UI components
   - Added JSON file upload button and selection interface
   - Implemented Material-UI Alert for status messages
   - Set up initial routing and navigation
   - Added to main navigation structure

12. Delete Operation Fix:
   - Fixed apiClient to properly handle 204 No Content responses
   - Added proper handling for void type responses
   - Improved JSON parsing error handling
   - Fixed delete operation snackbar error
   - Verified working in development environment

13. Player Creation Validation Fix:
   - Modified PlayerController to initialize optional fields
   - PersonalGrades initialized with new ScoutingGrades()
   - PersonalRiskAssessment initialized with string.Empty
   - Allows creating players with just a name
   - Supports flexible data entry for both MLB and prospect players
   - Enables basic player list imports
   - Verified working in development environment

14. React Hooks Optimization:
   - Fixed React hooks order in PlayerList component
   - Moved all hooks to component top level
   - Ensured consistent Dialog and Snackbar rendering
   - Resolved hook-related console errors
   - Verified proper component functionality

15. API Response Standardization:
   - Created ApiResponse<T> wrapper class
   - Standardized API response format
   - Fixed frontend data display issue
   - Verified player list functionality

16. Player Model and API:
   - Fixed MongoDB Id handling in Player model
   - Made Id property nullable to work with MongoDB auto-generation
   - Successfully tested player creation and retrieval
   - Verified proper Id generation and persistence
   - Documented proper model validation behavior

17. Docker Configuration:
   - Created docker-compose.dev.yml for development
   - Created docker-compose.yml for production
   - Added Dockerfile.dev and Dockerfile.prod for frontend
   - Configured Nginx as reverse proxy
   - Set up volume mappings and port forwarding
   - Successfully tested development environment setup
   - Verified container communication and MongoDB persistence

18. Environment Configuration:
   - Added .env.development and .env.production
   - Created .env.example for documentation
   - Updated .gitignore for environment files
   - Configured consistent port usage
   - Validated environment configurations

19. API Configuration:
   - Updated CORS settings for both environments
   - Added API prefix handling for production
   - Improved error handling and logging
   - MongoDB connection configuration
   - Investigated and documented .NET Core configuration patterns:
     * appsettings.json uses colon notation (MongoDB:ConnectionString)
     * Environment variables require double underscore (MongoDB__ConnectionString)
     * Both formats are equivalent in code configuration access
   - Verified frontend-backend communication



## Common Mistakes and Lessons Learned
1. React Router Integration:
   - Issue: Incorrect usage of Material-UI with React Router components
   - Solution: Use React Router's Link component directly instead of aliasing
   - Lesson: When integrating Material-UI with React Router:
     * Use Link component directly from react-router-dom
     * Wrap Material-UI components with Link when needed
     * Keep routing logic separate from UI components

2. React Hooks Rules:
   - Issue: Hooks were being called conditionally, causing order changes between renders
   - Solution: Moved all hooks to top level of component
   - Lesson: Always follow React's rules of hooks:
     * Only call hooks at the top level
     * Don't call hooks inside loops, conditions, or nested functions
     * Keep hook order consistent between renders
   - Lesson: Handle conditional rendering in the JSX return statement, not by returning early with hooks

3. API Response Structure:
   - Frontend expected wrapped response with 'value' property
   - API was returning direct data
   - Lesson: Maintain consistent response structure
   - Lesson: Consider frontend expectations when designing API

4. MongoDB Id Handling:
   - Initially used non-nullable Id property which conflicted with MongoDB auto-generation
   - Model validation was preventing null Id values before reaching MongoDB
   - Fixed by making Id property nullable in Player model
   - Lesson: When using MongoDB's auto-generated Ids, ensure model properties are nullable
   - Lesson: Consider validation behavior when designing models with auto-generated fields

5. JSON Response Handling:
   - Incorrectly reported missing commas in JSON responses without properly reading the output
   - Made unnecessary changes to JSON serialization based on this misreading
   - Added complexity that wasn't needed since the JSON was properly formatted
   - Lesson: Always carefully read and verify the actual response content before making assumptions
   - Lesson: Double-check output formatting before suggesting fixes for non-existent problems

6. Command Line Syntax:
   - Used Unix command syntax instead of Windows PowerShell
   - Used outdated `docker-compose` instead of `docker compose`
   - Lesson: Always use PowerShell syntax when working in Windows environment
   - Lesson: Use `docker compose` (with a space) as it's the newer, recommended syntax
   - Example: Use `Invoke-WebRequest` instead of `curl` for HTTP requests
   - Example: Use `docker compose up` instead of `docker-compose up`

7. ASP.NET Core Routing:
   - Issue: 404 error with deleteall endpoint despite correct implementation
   - Investigation: Noticed potential casing issue with [Route("[controller]")] and LowercaseUrls option
   - Lesson: Pay attention to ASP.NET Core's route transformation settings
   - Lesson: Consider explicit lowercase routes when using LowercaseUrls option

8. Docker Development Workflow:
   - Issue: API changes not reflecting after container restart
   - Root Cause: Container needs rebuild to pick up C# code changes
   - Solution: Use `docker compose up -d --build api` instead of just restart
   - Lesson: Always rebuild API container when making C# code changes
   - Lesson: Don't assume container restart will pick up all code changes

9. Hot Reload Limitations:
   - Issue: MissingMethodException when removing endpoints during hot reload
   - Root Cause: Hot reload cannot handle method deletion while app is running
   - Solution: Restart container when removing endpoints
   - Lesson: Hot reload works well for additions and modifications
   - Lesson: Use container restart for structural changes like method removal

10. Duplicate Player Detection:
    - Issue: Same player could be imported multiple times with different data
    - Root Cause: No unique constraint on player identification
    - Solution: 
      * Use compound index on name + birthDate for reliable matching
      * Implement smart merge logic to preserve existing data
      * Use dictionary fields for extensible external IDs
    - Lesson: Consider data merging strategy when implementing duplicate detection
    - Lesson: Use compound indexes for more reliable duplicate detection than single field

## Next Steps
1. Immediate Tasks
   - Complete Admin Panel implementation
   - Add JSON file upload and import functionality
   - Test bulk player import feature
   - Implement proper error handling for file imports

2. Future Tasks
   - Set up CI/CD pipeline
   - Add health checks
   - Configure container logging

## Implementation Strategy
1. Phase 1 - Development Environment ✓
   - Test Docker Compose setup ✓
   - Verify hot reloading ✓
   - Test API communication ✓
   - Validate MongoDB connection ✓

2. Phase 2 - Admin Features
   - Implement file upload UI
   - Add import validation
   - Test bulk import functionality
   - Add error handling and feedback

3. Phase 3 - Production Environment
   - Test Nginx configuration
   - Verify static file serving
   - Test API routing
   - Validate environment variables

## Current Questions
- Production deployment strategy
- CI/CD pipeline requirements
- Backup and persistence strategy
- Monitoring and logging approach
