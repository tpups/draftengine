import { apiClient } from './apiClient';
import { 
  Player, 
  DraftInfo, 
  AgeRangeParams, 
  RiskLevelParams, 
  ApiResponse,
  BirthDateVerificationResult,
  PaginatedResult
} from '../types/models';
import { useMemo } from 'react';

const BASE_PATH = '/player';

const playerService = {
  // Basic CRUD operations
  getAll: (pageNumber: number = 1, pageSize: number = 100) => 
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Player>>(`${BASE_PATH}/${id}`)
      .then(response => response.value),

  create: (player: Omit<Player, 'id'>) =>
    apiClient.post<ApiResponse<Player>>(BASE_PATH, player)
      .then(response => response.value),

  update: (id: string, player: Player) =>
    apiClient.put<ApiResponse<Player>>(`${BASE_PATH}/${id}`, player)
      .then(response => response.value),

  delete: (id: string) =>
    apiClient.delete<void>(`${BASE_PATH}/${id}`),

  // Filtering operations
  getByLevel: (level: string, pageNumber: number = 1, pageSize: number = 100) =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/byLevel/${level}?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  getByTeam: (team: string, pageNumber: number = 1, pageSize: number = 100) =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/byTeam/${team}?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  getByPosition: (position: string, pageNumber: number = 1, pageSize: number = 100) =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/byPosition/${position}?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  getUndrafted: (pageNumber: number = 1, pageSize: number = 100) =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/undrafted?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  getHighlighted: (pageNumber: number = 1, pageSize: number = 100) =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/highlighted?pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  // Draft management
  markAsDrafted: (id: string, request: { draftedBy: string; round: number; pick: number; overallPick: number }) =>
    apiClient.post<void>(`${BASE_PATH}/${id}/draft`, request),

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
  getByAgeRange: ({ minAge, maxAge }: AgeRangeParams, pageNumber: number = 1, pageSize: number = 100) =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/byAge?minAge=${minAge}&maxAge=${maxAge}&pageNumber=${pageNumber}&pageSize=${pageSize}`)
      .then(response => response.value.items),

  // Batch operations
  importPlayers: (players: Omit<Player, 'id'>[]) =>
    apiClient.post<void>(`${BASE_PATH}/batch`, players),
    
  // Admin operations
  deleteAll: () =>
    apiClient.delete<void>(`${BASE_PATH}/deleteall`),

  resetDraftStatus: () =>
    apiClient.post<void>(`${BASE_PATH}/reset-draft-status`),

  // Birthdate verification
  verifyBirthDates: (includeExisting: boolean) =>
    apiClient.post<ApiResponse<BirthDateVerificationResult>>(`${BASE_PATH}/verify-birthdates`, { includeExisting }),
};

export const usePlayerService = () => {
  return useMemo(() => playerService, []);
};

export { playerService };
