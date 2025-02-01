import { apiClient } from './apiClient';
import { Player, DraftInfo, AgeRangeParams, RiskLevelParams, ApiResponse } from '../types/models';
import { useMemo } from 'react';

const BASE_PATH = '/player';

const playerService = {
  // Basic CRUD operations
  getAll: () => 
    apiClient.get<ApiResponse<Player[]>>(BASE_PATH),

  getById: (id: string) =>
    apiClient.get<Player>(`${BASE_PATH}/${id}`),

  create: (player: Omit<Player, 'id'>) =>
    apiClient.post<Player>(BASE_PATH, player),

  update: (id: string, player: Player) =>
    apiClient.put<void>(`${BASE_PATH}/${id}`, player),

  delete: (id: string) =>
    apiClient.delete<void>(`${BASE_PATH}/${id}`),

  // Filtering operations
  getByLevel: (level: string) =>
    apiClient.get<Player[]>(`${BASE_PATH}/byLevel/${level}`),

  getByTeam: (team: string) =>
    apiClient.get<Player[]>(`${BASE_PATH}/byTeam/${team}`),

  getByPosition: (position: string) =>
    apiClient.get<Player[]>(`${BASE_PATH}/byPosition/${position}`),

  getUndrafted: () =>
    apiClient.get<Player[]>(`${BASE_PATH}/undrafted`),

  getHighlighted: () =>
    apiClient.get<Player[]>(`${BASE_PATH}/highlighted`),

  // Draft management
  markAsDrafted: (id: string, draftInfo: DraftInfo) =>
    apiClient.post<void>(`${BASE_PATH}/${id}/draft`, draftInfo),

  undraftPlayer: (id: string) =>
    apiClient.post<void>(`${BASE_PATH}/${id}/undraft`),

  // Personal tracking
  toggleHighlight: (id: string) =>
    apiClient.post<void>(`${BASE_PATH}/${id}/toggleHighlight`),

  updateNotes: (id: string, notes: string) =>
    apiClient.put<void>(`${BASE_PATH}/${id}/notes`, notes),

  updatePersonalRank: (id: string, rank: number) =>
    apiClient.put<void>(`${BASE_PATH}/${id}/personalRank`, rank),

  // Advanced filtering
  getByAgeRange: ({ minAge, maxAge }: AgeRangeParams) =>
    apiClient.get<Player[]>(`${BASE_PATH}/byAge?minAge=${minAge}&maxAge=${maxAge}`),

  getByETA: (year: number) =>
    apiClient.get<Player[]>(`${BASE_PATH}/byETA/${year}`),

  getByRiskLevel: ({ source, riskLevel }: RiskLevelParams) =>
    apiClient.get<Player[]>(`${BASE_PATH}/byRiskLevel?source=${source}&riskLevel=${riskLevel}`),

  // Batch operations
  importPlayers: (players: Omit<Player, 'id'>[]) =>
    apiClient.post<void>(`${BASE_PATH}/batch`, players),
    
  // Admin operations
  deleteAll: () =>
    apiClient.delete<void>(`${BASE_PATH}/deleteall`),
};

export const usePlayerService = () => {
  return useMemo(() => playerService, []);
};

export { playerService };
