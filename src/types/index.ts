// Core domain types shared across the whole app.
// This file has zero external dependencies on purpose — it's the foundation
// everything else (logic, state, UI) is built on top of.

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'K';

export type DraftStatus = 'AVAIL' | 'ME' | 'OPP' | 'DROPPED';

/** One projection/ranking source contributed for a single player (e.g. "ESPN", "FFC"). */
export interface PlayerSource {
  label: string;
  proj: number | null;
  adp: number | null;
}

export interface Player {
  id: number;
  name: string;
  pos: Position;
  team: string;
  bye: number | null;
  /** Averaged projected points across all sources currently attached. */
  proj: number;
  /** Averaged ADP across all sources currently attached. */
  adp: number;
  /** Value Based Drafting score — proj minus replacement level at this position. Recomputed, not stored persistently as truth. */
  vbd: number;
  status: DraftStatus;
  sources: PlayerSource[];
  /** Real, week-specific projections keyed by week number. Falls back to `proj` when absent for a week. */
  weeklyProj?: Record<number, number>;
}

export interface RosterConfig {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  DST: number;
  K: number;
  BENCH: number;
}

export type MaxPerPosition = Record<Exclude<Position, never>, number>;

export interface LeagueConfig {
  teams: number;
  slot: number;
  roster: RosterConfig;
  hiddenTeams: string[];
  maxPerPosition: MaxPerPosition;
}

/** One starting-lineup slot definition, e.g. { label: 'FLEX', eligible: ['RB','WR','TE'] } */
export interface SlotDef {
  label: string;
  eligible: Position[];
}

/** A single week's starting lineup: slot index -> playerId (or null if empty). */
export type WeeklyLineup = (number | null)[];

export interface WaiverCandidate {
  name: string;
  pos: Position;
  team: string;
  bye: number | null;
  proj: number;
}

export interface WaiverSuggestion {
  pos: Position;
  add: WaiverCandidate;
  drop: Player | null;
  gain: number;
}

/** Raw parsed CSV row before it's turned into a Player or WaiverCandidate. */
export interface RawCsvRow {
  name: string;
  pos: string;
  team?: string;
  bye?: string;
  proj_pts?: string;
  adp?: string;
}
