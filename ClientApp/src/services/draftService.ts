import { apiClient } from './apiClient';
import { ApiResponse, Draft, DraftPosition } from '../types/models';

export interface CurrentPickResponse {
  round: number;
  pick: number;
  overallPickNumber: number;
}

export const draftService = {
  getAll: () => 
    apiClient.get<ApiResponse<Draft[]>>('/draft'),

  getActiveDraft: () => 
    apiClient.get<ApiResponse<Draft>>('/draft/active'),

  getCurrentPick: () => 
    apiClient.get<ApiResponse<CurrentPickResponse>>('/draft/currentPick'),

  createDraft: (params: {
    year: number;
    type: string;
    isSnakeDraft: boolean;
    initialRounds: number;
    draftOrder: DraftPosition[];
  }) => apiClient.post<ApiResponse<Draft>>('/draft', params),

  addRound: (draftId: string) => 
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/addRound`),

  removeRound: (draftId: string) =>
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/removeRound`),

  markPickComplete: (draftId: string, params: { roundNumber: number; managerId: string; playerId: string }) => 
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/pick`, params),

  resetDraft: (draftId: string) => 
    apiClient.post<ApiResponse<boolean>>(`/draft/${draftId}/reset`),

  deleteDraft: (draftId: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/draft/${draftId}`),

  advancePick: (skipCompleted: boolean = false) =>
    apiClient.post<ApiResponse<CurrentPickResponse>>('/draft/advancePick', { skipCompleted }),

  updateActivePick: (params: { round: number; pick: number; overallPickNumber: number }) =>
    apiClient.post<ApiResponse<Draft>>('/draft/updateActivePick', params),

  toggleActive: (draftId: string) =>
    apiClient.post<ApiResponse<Draft>>(`/draft/${draftId}/toggleActive`)
};
