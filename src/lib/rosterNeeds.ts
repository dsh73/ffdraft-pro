import type { Player, Position, RosterConfig } from '../types';

export type RosterNeeds = Partial<Record<Position, number>> & { FLEX: number };

/**
 * Works out which positions your own roster still has an open starting slot
 * for, given what you've already drafted. Used to weight recommendations
 * toward filling real gaps rather than pure best-player-available.
 */
export function myRosterNeeds(myPlayers: Player[], roster: RosterConfig): RosterNeeds {
  const counts: Partial<Record<Position, number>> = {};
  for (const p of myPlayers) counts[p.pos] = (counts[p.pos] ?? 0) + 1;

  const needs: Partial<Record<Position, number>> = {};
  (['QB', 'RB', 'WR', 'TE', 'DST', 'K'] as const).forEach((pos) => {
    needs[pos] = Math.max(0, roster[pos] - (counts[pos] ?? 0));
  });

  const flexEligible: Position[] = ['RB', 'WR', 'TE'];
  const flexUsed = Math.max(0, myPlayers.filter((p) => flexEligible.includes(p.pos)).length - (roster.RB + roster.WR + roster.TE));
  const flex = Math.max(0, roster.FLEX - flexUsed);

  return { ...needs, FLEX: flex };
}
