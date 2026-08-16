import type { Player } from '../types';

/** Official 2026 NFL bye week schedule, by team abbreviation. Includes both
 * WAS and WSH aliases for Washington since sources are inconsistent about which they use. */
export const BYE_WEEKS: Record<string, number> = {
  ARI: 14, ATL: 11, BAL: 13, BUF: 7, CAR: 5, CHI: 10, CIN: 6, CLE: 11, DAL: 14, DEN: 10,
  DET: 6, GB: 11, HOU: 8, IND: 13, JAX: 7, KC: 5, LV: 13, LAC: 7, LAR: 11, MIA: 6,
  MIN: 6, NE: 11, NO: 8, NYG: 8, NYJ: 13, PHI: 10, PIT: 9, SF: 8, SEA: 11, TB: 10,
  TEN: 9, WSH: 7, WAS: 7,
};

/** Returns true if the given player's bye week matches the given week number. */
export function isOnBye(player: Pick<Player, 'bye'> | null | undefined, week: number): boolean {
  if (!player) return false;
  return player.bye !== null && player.bye !== undefined && Number(player.bye) === Number(week);
}

/**
 * Fills in a missing bye week from the team schedule, in place, for any
 * player whose bye is null/undefined. Returns the count of players updated
 * (useful for a UI confirmation message).
 */
export function fillMissingByes(players: Player[]): number {
  let filled = 0;
  for (const p of players) {
    if ((p.bye === null || p.bye === undefined) && BYE_WEEKS[p.team] !== undefined) {
      p.bye = BYE_WEEKS[p.team];
      filled++;
    }
  }
  return filled;
}
