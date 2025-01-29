export interface ScoutingGrades {
    // Hitting grades
    hit?: number;
    rawPower?: number;
    gamePower?: number;
    run?: number;
    arm?: number;
    field?: number;

    // Pitching grades
    fastball?: number;
    slider?: number;
    curve?: number;
    changeup?: number;
    control?: number;
    command?: number;
}

export interface Player {
    id: string;
    name: string;
    position: string[];
    rank: Record<string, number>;
    prospectRank: Record<string, number>;

    // Player information
    mlbTeam: string;
    level: string;  // MLB, AAA, AA, etc.
    birthDate: string;  // ISO date string
    eta?: number;  // Year expected to reach MLB

    // Risk assessments
    prospectRisk: Record<string, string>;
    personalRiskAssessment: string;

    // Scouting grades
    scoutingGrades: Record<string, ScoutingGrades>;
    personalGrades: ScoutingGrades;

    // Draft tracking
    isDrafted: boolean;
    draftRound?: number;
    draftPick?: number;
    draftedBy?: string;

    // Personal tracking
    isHighlighted: boolean;
    notes?: string;
    personalRank?: number;
}

export interface DraftInfo {
    draftedBy: string;
    round: number;
    pick: number;
}

// API response types
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    totalCount: number;
    pageSize: number;
    currentPage: number;
}

// Query parameters
export interface AgeRangeParams {
    minAge: number;
    maxAge: number;
}

export interface RiskLevelParams {
    source: string;
    riskLevel: string;
}
