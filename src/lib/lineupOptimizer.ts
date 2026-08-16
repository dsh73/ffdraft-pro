import type { Player, RosterConfig, SlotDef, WeeklyLineup } from '../types';
import { isOnBye } from './byeWeeks';

/**
 * Builds the ordered list of starting slots for a roster config, e.g.
 * [QB, RB, RB, WR, WR, TE, FLEX, DST, K]. Order matters: single-position
 * slots are generated before FLEX, which the optimizer relies on to fill
 * required slots with the best specialist before FLEX picks over the leftovers.
 */
export function getSlotDefs(roster: RosterConfig): SlotDef[] {
  const slots: SlotDef[] = [];
  (['QB', 'RB', 'WR', 'TE'] as const).forEach(pos => {
    for (let i = 0; i < roster[pos]; i++) slots.push({ label: pos, eligible: [pos] });
  });
  for (let i = 0; i < roster.FLEX; i++) slots.push({ label: 'FLEX', eligible: ['RB', 'WR', 'TE'] });
  for (let i = 0; i < roster.DST; i++) slots.push({ label: 'DST', eligible: ['DST'] });
  for (let i = 0; i < roster.K; i++) slots.push({ label: 'K', eligible: ['K'] });
  return slots;
}

export interface WeekProjResult {
  value: number;
  /** True if this came from a real imported weekly projection; false if it's the season-average fallback. */
  isReal: boolean;
}

/** Returns a player's projection for a specific week: real weekly data if imported, else the season average as a labeled fallback. */
export function getWeekProj(player: Player | null | undefined, week: number): WeekProjResult {
  if (!player) return { value: 0, isReal: false };
  const real = player.weeklyProj?.[week];
  if (real !== undefined) return { value: real, isReal: true };
  return { value: player.proj, isReal: false };
}

/**
 * Greedy lineup optimizer: for each slot in order (single-position slots
 * before FLEX), assigns the eligible, not-yet-used player with the highest
 * projection for the given week. Players on bye that week are excluded
 * entirely from consideration.
 *
 * This is a greedy algorithm, not a globally-optimal solver — but because
 * RB/WR/TE are always FLEX-eligible in standard roster shapes, filling
 * required slots before FLEX in this order produces the optimal lineup for
 * every roster shape this app supports.
 */
export function autoOptimizeLineup(roster: RosterConfig, myPlayers: Player[], week: number): WeeklyLineup {
  const slots = getSlotDefs(roster);
  const eligiblePool = myPlayers.filter(p => !isOnBye(p, week));
  const used = new Set<number>();

  return slots.map(slot => {
    const candidates = eligiblePool
      .filter(p => slot.eligible.includes(p.pos) && !used.has(p.id))
      .sort((a, b) => getWeekProj(b, week).value - getWeekProj(a, week).value);
    if (candidates.length === 0) return null;
    used.add(candidates[0].id);
    return candidates[0].id;
  });
}

/** Sums the projected points of a lineup for a given week, crediting 0 for anyone actually on bye. */
export function lineupTotal(lineup: WeeklyLineup, myPlayers: Player[], week: number): { total: number; usingRealData: boolean } {
  let total = 0;
  let usingRealData = false;
  for (const playerId of lineup) {
    if (playerId === null) continue;
    const p = myPlayers.find(pl => pl.id === playerId);
    if (!p || isOnBye(p, week)) continue;
    const wp = getWeekProj(p, week);
    total += wp.value;
    if (wp.isReal) usingRealData = true;
  }
  return { total: Math.round(total * 10) / 10, usingRealData };
}

/** Players on the roster who are not currently assigned to any lineup slot. */
export function benchPlayers(lineup: WeeklyLineup, myPlayers: Player[]): Player[] {
  const used = new Set(lineup.filter((id): id is number => id !== null));
  return myPlayers.filter(p => !used.has(p.id));
}
