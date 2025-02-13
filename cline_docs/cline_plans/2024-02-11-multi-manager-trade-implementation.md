# Multi-Manager Trade Implementation Plan (2/11/25)

## Overview
Extend the trade system to support trades involving more than two managers, with complex asset redistribution capabilities.

## Frontend Modifications (TradeModal.tsx)

### UI Enhancements
- Add "Configure Trade" button when 3+ managers are selected
- Dynamically render "Assets Received" sections
- Implement comprehensive drag and drop functionality

### Asset Distribution Rules

1. Initial Distribution:
   - When an asset is first dragged from Trade Assets to a manager's Assets Received area:
     * The asset becomes greyed out in the original Trade Assets area
     * The asset is visually disabled in its original location
     * The asset CANNOT be dragged again from Trade Assets

2. Redistribution Rules:
   - After an asset has been distributed:
     * The user CAN drag the asset from its current Assets Received area to a different manager's Assets Received area
     * The user CANNOT grab the same asset from the original Trade Assets area again

### Drag and Drop Constraints
1. Initial State:
   - Assets start in original manager's Trade Assets
   - "Configure Trade" button appears for 3+ managers
   - Clicking reveals "Assets Received" sections

2. Dragging Rules:
   - Can drag from:
     * Original manager's Trade Assets (only if not yet distributed)
     * Any manager's "Assets Received" area
   - Cannot drag to:
     * Another manager's original Trade Assets
     * Same manager's "Assets Received" area
     * "Assets Received" area outside current trade

3. Validation Requirements:
   - Minimum 1 asset per manager (trading and receiving)
   - All assets must be distributed before submission
   - Visual indication of used/unused assets

### Key Implementation Constraints
- Prevent re-dragging from Trade Assets once an asset has been distributed
- Allow re-distribution of an already distributed asset within the Assets Received areas
- Ensure no duplicate assets can be created during distribution
- Maintain visual cues (greyed out, disabled appearance) for distributed assets

## Backend Updates
- Modify trade creation endpoint for multi-manager trades
- Update Trade model to support complex trade structures
- Implement validation for asset allocation

## Key Challenges Addressed
- Flexible asset redistribution
- Preventing circular trades
- Ensuring complete asset allocation
- Maintaining trade integrity

## Next Steps
- Implement frontend drag and drop logic
- Update backend trade creation endpoint
- Add comprehensive validation
- Create unit and integration tests
