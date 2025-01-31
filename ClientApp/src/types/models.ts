export interface Player {
  id?: string;
  name: string;
  position?: string[];
  rank?: Record<string, number>;
  prospectRank?: Record<string, number>;
  mlbTeam?: string;
  level?: string;
  birthDate?: string;
  eta?: number | null;
  prospectRisk?: Record<string, string>;
  personalRiskAssessment?: string;
  scoutingGrades?: Record<string, ScoutingGrades>;
  personalGrades?: ScoutingGrades;
  isDrafted?: boolean;
  draftRound?: number | null;
  draftPick?: number | null;
  draftedBy?: string | null;
  isHighlighted?: boolean;
  notes?: string | null;
  personalRank?: number | null;
}

export interface ScoutingGrades {
  hit?: number | null;
  rawPower?: number | null;
  gamePower?: number | null;
  run?: number | null;
  arm?: number | null;
  field?: number | null;
  fastball?: number | null;
  slider?: number | null;
  curve?: number | null;
  changeup?: number | null;
  control?: number | null;
  command?: number | null;
}

export interface DraftInfo {
  draftedBy: string;
  round: number;
  pick: number;
}

export interface AgeRangeParams {
  minAge: number;
  maxAge: number;
}

export interface RiskLevelParams {
  source: string;
  riskLevel: string;
}

export interface ApiResponse<T> {
  value: T;
  count: number;
}
