export interface ApiResponse<T> {
  value: T;
  error?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface ProjectionStats {
  stats: { [key: string]: number };
  updatedDate: string;
}

export interface ProjectionData {
  hitter?: ProjectionStats;
  pitcher?: ProjectionStats;
}

export enum RankingSource {
  IBW = 'IBW',
  STEAMER = 'STEAMER'
}

export enum ProspectSource {
  IBW = 'IBW'
}

export enum ProjectionType {
  Hitter = 'Hitter',
  Pitcher = 'Pitcher'
}

export enum ProjectionSource {
  STEAMER = 'STEAMER'
}

export interface DraftStatus {
  draftId: string;
  isDrafted: boolean;
  round: number;
  pick: number;
  overallPick: number;
  managerId: string;
}

export interface Player {
  id?: string;
  name: string;
  position?: string[];
  rank?: { [key: string]: number };
  prospectRank?: Record<ProspectSource, number | undefined>;
  mlbTeam?: string;
  level?: string;
  birthDate?: Date;
  draftStatuses?: DraftStatus[];
  isHighlighted?: boolean;
  notes?: string;
  personalRank?: number;
  starsRating?: number;
  projections?: { [source: string]: ProjectionData };
  positionStats?: { [year: string]: { [position: string]: number } };
}

export interface DraftRound {
  roundNumber: number;
  picks: DraftPick[];
}

export interface DraftPick {
  pickNumber: number;
  managerId: string;
  isComplete: boolean;
  tradedTo?: string[];
}

export interface Draft {
  id?: string;
  year: number;
  type: string;
  isSnakeDraft: boolean;
  rounds: DraftRound[];
  isActive: boolean;
  createdAt: Date;
  activeRound?: number;
  activePick?: number;
  activeOverallPick?: number;
  currentOverallPick?: number;
  draftOrder: string[];
}

export interface Manager {
  id?: string;
  name: string;
  email?: string;
  isUser?: boolean;
}

export enum TradeAssetType {
  DraftPick = 'DraftPick'
}

export enum TradeStatus {
  Completed = 'Completed'
}

export interface TradeAsset {
  type: TradeAssetType;
  draftId: string;
  overallPickNumber?: number;
  pickNumber?: number;
  roundNumber?: number;
}

export interface Trade {
  id?: string;
  timestamp: string;
  notes: string;
  status: TradeStatus;
  parties: {
    managerId: string;
    proposed: boolean;
    accepted: boolean;
    assets: TradeAsset[];
  }[];
  assetDistribution: {
    [managerId: string]: {
      [fromManagerId: string]: TradeAsset[];
    };
  };
}

export interface BirthDateVerificationResult {
  totalPlayers: number;
  processedCount: number;
  updatedCount: number;
  failedCount: number;
  updates: string[];
  errors: string[];
}

export interface PositionUpdateResult {
  totalPlayers: number;
  processedCount: number;
  updatedCount: number;
  failedCount: number;
  updates: string[];
  errors: string[];
}
