import { useMemo } from 'react';
import { apiClient } from './apiClient';
import { MLB_TEAMS } from '../components/PlayerListFilters';
import type { MLBTeams } from '../components/PlayerListFilters';
import { 
  Player,
  ApiResponse,
  BirthDateVerificationResult,
  PaginatedResult,
  PositionUpdateResult,
  RankingSource,
  ProspectSource
} from '../types/models';

interface AgeRangeParams {
  minAge: number;
  maxAge: number;
}

export interface PlayerFilters {
  excludeDrafted?: boolean;
  teams?: string[];
  ageRange?: [number, number];
  levels?: string[];
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  playerType?: 'all' | 'pitchers' | 'hitters';
  position?: string;
  sortField?: string;
  sortDescending?: boolean;
  rankingSource?: RankingSource | null;
  prospectSource?: ProspectSource | null;
  projectionConfig?: {
    source: string | null;
    category: string | null;
  };
}

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

  // Search operations
  search: (filters: PlayerFilters) => {
    const params = new URLSearchParams();
    const defaultTeams = Object.values(MLB_TEAMS).flatMap(divisions => 
      Object.values(divisions).flat()
    ) as string[];
    const defaultLevels = ['AAA', 'AA', 'A+', 'A', 'A-', 'Rookie', 'Complex'];
    
    // Only add non-default parameters
    if (filters.searchTerm) {
      params.append('searchTerm', filters.searchTerm);
    }
    if (filters.excludeDrafted) {
      params.append('excludeDrafted', 'true');
    }
    
    // Only add teams if they differ from default (all teams)
    if (filters.teams?.length && filters.teams.length !== defaultTeams.length) {
      filters.teams.forEach(team => params.append('teams', team));
    }
    
    // Only add levels if they differ from default (all levels)
    if (filters.levels?.length && filters.levels.length !== defaultLevels.length) {
      filters.levels.forEach(level => params.append('levels', level));
    }
    
    // Only add age range if it differs from default (18-40)
    if (filters.ageRange && (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 40)) {
      params.append('minAge', filters.ageRange[0].toString());
      params.append('maxAge', filters.ageRange[1].toString());
    }
    
    // Add player type filter
    if (filters.playerType && filters.playerType !== 'all') {
      params.append('playerType', filters.playerType);
    }

    // Add position filter only if not in pitchers mode
    if (filters.position && filters.playerType !== 'pitchers') {
      params.append('position', filters.position);
    }

    // Always include pagination
    params.append('pageNumber', (filters.pageNumber || 1).toString());
    params.append('pageSize', (filters.pageSize || 100).toString());

    // Add sorting if specified
    if (filters.sortField) {
      params.append('sortField', filters.sortField);
      params.append('sortDescending', filters.sortDescending ? 'true' : 'false');
    }

    // Add ranking source if specified
    if (filters.rankingSource) {
      params.append('rankingSource', filters.rankingSource);
    }

    // Add prospect source if specified
    if (filters.prospectSource) {
      params.append('prospectSource', filters.prospectSource);
    }

    // Add projection config if specified
    if (filters.projectionConfig?.source && filters.projectionConfig?.category) {
      params.append('projectionSource', filters.projectionConfig.source);
      params.append('projectionCategory', filters.projectionConfig.category);
    }

    return apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}/search?${params.toString()}`)
      .then(response => response.value);
  },

  // Draft management
  markAsDrafted: (id: string, request: { draftedBy: string; round: number; pick: number; overallPick: number }) =>
    apiClient.post<void>(`${BASE_PATH}/${id}/draft`, request),

  undraftPlayer: (id: string) =>
    apiClient.post<ApiResponse<boolean>>(`${BASE_PATH}/${id}/undraft`)
      .then(response => response.value),

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

  // Get total count
  getTotalCount: () =>
    apiClient.get<ApiResponse<PaginatedResult<Player>>>(`${BASE_PATH}?pageNumber=1&pageSize=1`)
      .then(response => response.value.totalCount),

  // Position stats update
  updatePositions: (includeExisting: boolean) =>
    apiClient.post<ApiResponse<PositionUpdateResult>>(`${BASE_PATH}/update-positions`, { includeExisting }),
};

export const usePlayerService = () => {
  return useMemo(() => playerService, []);
};

export { playerService };
