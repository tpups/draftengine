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
[Previous content remains unchanged...]

### Swagger Configuration
[Previous content remains unchanged...]

### Data Layer
[Previous content remains unchanged...]

### Service Layer
[Previous content remains unchanged...]

### API Controllers
[Previous content remains unchanged...]

## Key Technical Decisions
[Previous content remains unchanged...]

## Code Organization
[Previous content remains unchanged...]

## Best Practices
[Previous content remains unchanged...]
