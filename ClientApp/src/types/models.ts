export interface Player {
  id: string;
  name: string;
  position: string[];
  rank: Record<string, number>;
  prospectRank: Record<string, number>;
  mlbTeam: string;
  level: string;
  birthDate: string;
  eta: number | null;
  prospectRisk: Record<string, string>;
  personalRiskAssessment: string | null;
  scoutingGrades: Record<string, ScoutingGrades>;
  personalGrades: ScoutingGrades | null;
  isDrafted: boolean;
  draftRound: number | null;
  draftPick: number | null;
  draftedBy: string | null;
  isHighlighted: boolean;
  notes: string | null;
  personalRank: number | null;
}

export interface ScoutingGrades {
  hit?: number;
  power?: number;
  run?: number;
  arm?: number;
  field?: number;
  overall?: number;
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
