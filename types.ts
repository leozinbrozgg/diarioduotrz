export interface MatchResult {
  playerNames: string[] | null;
  kills: number | null;
  placement: number | null;
}

export interface Earnings {
  placementPrize: number;
  killPrize: number;
  total: number;
}

export interface RankedResult {
  id: string;
  matchResult: MatchResult;
  earnings: Earnings;
}

export interface AdjustedPrizes {
  placementPrizes: Record<number, number>;
  killPrize: number;
}

export interface PrizeRules {
  placementPrizes: Record<number, number>;
  killPrize: number;
}

// Dashboard & persistence types
export interface AnalysisConfigSnapshot {
  entryFee: number;
  slotsSold: number;
  prizeRules: PrizeRules;
  adjustedPrizes: AdjustedPrizes | null;
  adjustmentMode: 'auto' | 'fixed';
  fixedProfit: number;
}

export interface AnalysisRecord {
  id: string;
  createdAt: string; // ISO date
  tournament?: string | null;
  mode?: string | null;
  entries: RankedResult[];
  config: AnalysisConfigSnapshot;
}

export interface ReportFilters {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  tournament?: string;
  playerName?: string;
}