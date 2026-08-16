import type { Player, Position, RosterConfig } from '../types';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

/**
 * Estimates a player's projected points purely from their draft rank and
 * position, using a smooth exponential decay curve. This is only used as a
 * fallback "built-in estimate" — any real imported projection (proj_pts from
 * a CSV, or an average across sources) always takes priority over this.
 */
export function projFromRank(rank: number, pos: Position): number {
  const base: Record<Position, number> = { QB: 340, RB: 300, WR: 290, TE: 220, DST: 120, K: 140 };
  const decay: Record<Position, number> = { QB: 0.018, RB: 0.021, WR: 0.019, TE: 0.024, DST: 0.01, K: 0.006 };
  const value = base[pos] * Math.exp(-decay[pos] * rank);
  return Math.max(30, Math.round(value));
}

/**
 * Works out how many starting slots exist league-wide for each position,
 * given the league size and roster settings. FLEX slots are split
 * proportionally across RB/WR/TE using a typical real-world usage ratio,
 * since FLEX isn't tied to one position.
 */
export function startersNeededByPosition(teams: number, roster: RosterConfig): Record<Position, number> {
  const flexShare: Record<'RB' | 'WR' | 'TE', number> = { RB: 0.45, WR: 0.45, TE: 0.10 };
  return {
    QB: teams * roster.QB,
    RB: teams * roster.RB + Math.round(teams * roster.FLEX * flexShare.RB),
    WR: teams * roster.WR + Math.round(teams * roster.FLEX * flexShare.WR),
    TE: teams * roster.TE + Math.round(teams * roster.FLEX * flexShare.TE),
    DST: teams * roster.DST,
    K: teams * roster.K,
  };
}

/**
 * Finds "replacement level" per position: the projected points of the
 * player who sits right at the last startable slot for that position,
 * league-wide. That's the point total you could still get for free off
 * waivers once the real starters are drafted.
 */
export function replacementLevels(players: Player[], teams: number, roster: RosterConfig): Record<Position, number> {
  const starters = startersNeededByPosition(teams, roster);
  const levels = {} as Record<Position, number>;
  for (const pos of POSITIONS) {
    const pool = players.filter(p => p.pos === pos).sort((a, b) => b.proj - a.proj);
    if (pool.length === 0) { levels[pos] = 0; continue; }
    const idx = Math.max(0, Math.min(pool.length - 1, starters[pos]));
    levels[pos] = pool[idx]?.proj ?? pool[pool.length - 1].proj;
  }
  return levels;
}

/**
 * Computes VBD (proj minus replacement level) for every player, in place.
 * Returns the replacement levels used, in case the caller wants to display them.
 */
export function computeVBD(players: Player[], teams: number, roster: RosterConfig): Record<Position, number> {
  const levels = replacementLevels(players, teams, roster);
  for (const p of players) {
    p.vbd = Math.round(p.proj - (levels[p.pos] ?? 0));
  }
  return levels;
}
