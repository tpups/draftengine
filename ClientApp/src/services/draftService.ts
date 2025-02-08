import { apiClient } from './apiClient';
import { ApiResponse, Draft, DraftPosition } from '../types/models';

/**
 * Response type for pick information
 * @property round - The round number of the pick
 * @property pick - The pick number within the round
 * @property overallPickNumber - The overall pick number across all rounds
 */
export interface PickResponse {
  round: number;
  pick: number;
  overallPickNumber: number;
}

/**
 * Service for managing draft operations
 * Handles draft creation, pick management, and draft state updates
 */
export const draftService = {
  /**
   * Retrieves all drafts in the system
   * @returns Promise containing array of all drafts
   */
  getAll: () => 
    apiClient.get<ApiResponse<Draft[]>>('/draft'),

  /**
   * Retrieves the currently active draft
   * Only one draft can be active at a time
   * @returns Promise containing the active draft or null if no draft is active
   */
  getActiveDraft: () => 
    apiClient.get<ApiResponse<Draft>>('/draft/active'),

  /**
   * Gets information about the active pick in the active draft
   * @returns Promise containing the current pick information
   */
  getActivePick: () => 
    apiClient.get<ApiResponse<PickResponse>>('/draft/activePick'),

  /**
   * Gets information about the current pick in the active draft
   * @returns Promise containing the current pick information
   */
  getCurrentPick: () => 
    apiClient.get<ApiResponse<PickResponse>>('/draft/currentPick'),

  /**
   * Gets the next pick in the draft sequence
   * @param pick - The active overall pick number
   * @param skipCompleted - Whether to skip completed picks (default is true)
   * @returns Promise containing information about the next pick
   */
  getNextPick: (pick: number, skipCompleted: boolean = true) =>
    apiClient.get<ApiResponse<PickResponse>>(`/draft/nextPick?pick=${pick}&skipCompleted=${skipCompleted}`),

  /**
   * Creates a new draft with specified settings
   * @param params.year - Draft year
   * @param params.type - Type of draft
   * @param params.isSnakeDraft - Whether to use snake draft ordering
   * @param params.initialRounds - Number of rounds to create initially
   * @param params.draftOrder - Array defining the draft order
   * @returns Promise containing the newly created draft
   */
  createDraft: (params: {
    year: number;
    type: string;
    isSnakeDraft: boolean;
    initialRounds: number;
    draftOrder: DraftPosition[];
  }) => apiClient.post<ApiResponse<Draft>>('/draft', params),

  /**
   * Adds a new round to an existing draft
   * @param draftId - ID of the draft to add a round to
   * @returns Promise containing the updated draft
   */
  addRound: (draftId: string) => 
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/addRound`),

  /**
   * Removes the last round from a draft
   * @param draftId - ID of the draft to remove a round from
   * @returns Promise containing the updated draft
   */
  removeRound: (draftId: string) =>
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/removeRound`),

  /**
   * Marks a pick as complete and assigns a player to a manager
   * @param draftId - ID of the draft
   * @param params.roundNumber - Round number of the pick
   * @param params.managerId - ID of the manager making the pick
   * @param params.playerId - ID of the player being drafted
   * @returns Promise containing the updated draft
   */
  togglePickComplete: (draftId: string, params: { managerId: string; playerId: string; overallPickNumber: number }) => 
    apiClient.post<ApiResponse<Draft>>(`/draft/pick`, { 
      overallPickNumber: params.overallPickNumber,
      managerId: params.managerId,
      playerId: params.playerId
    }),

  /**
   * Resets a draft to its initial state
   * Clears all completed picks and resets pick tracking
   * @param draftId - ID of the draft to reset
   * @returns Promise containing success status
   */
  resetDraft: (draftId: string) => 
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/reset`),

  /**
   * Permanently deletes a draft
   * @param draftId - ID of the draft to delete
   * @returns Promise containing success status
   */
  deleteDraft: (draftId: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/draft/${draftId}`),

  /**
   * Updates the active pick in the draft
   * @param params.round - Target round number
   * @param params.pick - Target pick number within the round
   * @param params.overallPickNumber - Target overall pick number
   * @returns Promise containing information about the next pick
   */
  updateActivePick: (params: { round: number; pick: number; overallPickNumber: number }) =>
    apiClient.post<ApiResponse<Draft>>('/draft/updateActivePick', params),

  /**
   * Toggles the active status of a draft
   * When activating a draft, any currently active draft will be deactivated
   * @param draftId - ID of the draft to toggle
   * @returns Promise containing the updated draft
   */
  toggleActive: (draftId: string) =>
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/toggleActive`),

  /**
   * Retrieves the draft order for the active draft
   * Returns the ordered list of managers and their positions
   * @returns Promise containing the draft order positions
   */
  getDraftOrder: () =>
    apiClient.get<ApiResponse<DraftPosition[]>>('/draft/order')
};
