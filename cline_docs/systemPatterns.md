# System Patterns

## Architecture Overview
The DraftEngine follows a modern web API architecture with clear separation of concerns and RESTful principles.

## Core Patterns

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

2. Draft Management
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
- XML documentation for all endpoints
- Standard ASP.NET Core conventions for schema naming
- Simple file upload configuration using IFormFile mapping
- Built-in multipart/form-data support
- Proper error handling and logging
- Development-time debugging capabilities
- Focus on clean, maintainable documentation

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
   [Previous content remains unchanged...]

[Rest of the file remains unchanged...]
