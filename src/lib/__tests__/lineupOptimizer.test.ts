import { describe, it, expect } from 'vitest';
import { getSlotDefs, autoOptimizeLineup, lineupTotal, benchPlayers, getWeekProj } from '../lineupOptimizer';
import type { Player, RosterConfig } from '../../types';

const ROSTER: RosterConfig = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6 };

function p(overrides: Partial<Player>): Player {
  return {
    id: 0, name: 'P', pos: 'RB', team: 'XXX', bye: null,
    proj: 0, adp: 1, vbd: 0, status: 'ME', sources: [],
    ...overrides,
  };
}

describe('getSlotDefs', () => {
  it('generates single-position slots before FLEX', () => {
    const slots = getSlotDefs(ROSTER);
    const flexIndex = slots.findIndex(s => s.label === 'FLEX');
    const lastRbIndex = slots.map(s => s.label).lastIndexOf('RB');
    expect(lastRbIndex).toBeLessThan(flexIndex);
  });

  it('matches the roster counts exactly', () => {
    const slots = getSlotDefs(ROSTER);
    expect(slots.filter(s => s.label === 'RB').length).toBe(2);
    expect(slots.filter(s => s.label === 'QB').length).toBe(1);
    expect(slots.filter(s => s.label === 'FLEX').length).toBe(1);
    expect(slots.length).toBe(9); // 1+2+2+1+1+1+1
  });

  it('FLEX is eligible for RB, WR, and TE only', () => {
    const flex = getSlotDefs(ROSTER).find(s => s.label === 'FLEX')!;
    expect(flex.eligible).toEqual(['RB', 'WR', 'TE']);
  });
});

describe('autoOptimizeLineup', () => {
  it('fills required slots with the best specialist before FLEX takes the leftovers', () => {
    // 3 RBs where the 3rd-best RB (90) should end up in FLEX, not bumping a WR
    const players = [
      p({ id: 1, pos: 'RB', proj: 100 }),
      p({ id: 2, pos: 'RB', proj: 95 }),
      p({ id: 3, pos: 'RB', proj: 90 }), // should land in FLEX
      p({ id: 4, pos: 'WR', proj: 80 }),
      p({ id: 5, pos: 'WR', proj: 70 }),
      p({ id: 6, pos: 'QB', proj: 200 }),
      p({ id: 7, pos: 'TE', proj: 60 }),
      p({ id: 8, pos: 'DST', proj: 50 }),
      p({ id: 9, pos: 'K', proj: 40 }),
    ];
    const lineup = autoOptimizeLineup(ROSTER, players, 1);
    const slots = getSlotDefs(ROSTER);
    const flexIdx = slots.findIndex(s => s.label === 'FLEX');
    expect(lineup[flexIdx]).toBe(3); // the 3rd RB, not a bumped WR
    // both WRs should still be in their required slots
    expect(lineup).toContain(4);
    expect(lineup).toContain(5);
  });

  it('excludes players on bye entirely', () => {
    const players = [
      p({ id: 1, pos: 'QB', proj: 300, bye: 7 }), // on bye — must not be started
      p({ id: 2, pos: 'QB', proj: 100, bye: 5 }), // worse, but eligible
    ];
    const roster: RosterConfig = { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, DST: 0, K: 0, BENCH: 6 };
    const lineup = autoOptimizeLineup(roster, players, 7);
    expect(lineup[0]).toBe(2); // forced to start the worse, eligible QB
  });

  it('leaves a slot empty (null) if nobody is eligible', () => {
    const roster: RosterConfig = { QB: 1, RB: 0, WR: 0, TE: 0, FLEX: 0, DST: 0, K: 0, BENCH: 6 };
    const lineup = autoOptimizeLineup(roster, [], 1);
    expect(lineup[0]).toBeNull();
  });

  it('never assigns the same player to two slots', () => {
    const players = [p({ id: 1, pos: 'RB', proj: 999 })]; // only one RB-eligible player, two RB slots + FLEX want it
    const lineup = autoOptimizeLineup(ROSTER, players, 1);
    const nonNull = lineup.filter((x): x is number => x !== null);
    expect(new Set(nonNull).size).toBe(nonNull.length);
  });
});

describe('getWeekProj', () => {
  it('uses real weekly data when present', () => {
    const player = p({ proj: 100, weeklyProj: { 3: 25 } });
    expect(getWeekProj(player, 3)).toEqual({ value: 25, isReal: true });
  });

  it('falls back to season average when no weekly data exists for that week', () => {
    const player = p({ proj: 100, weeklyProj: { 3: 25 } });
    expect(getWeekProj(player, 4)).toEqual({ value: 100, isReal: false });
  });

  it('handles a null player safely', () => {
    expect(getWeekProj(null, 1)).toEqual({ value: 0, isReal: false });
  });
});

describe('lineupTotal', () => {
  it('sums assigned players correctly', () => {
    const players = [p({ id: 1, proj: 20 }), p({ id: 2, proj: 30 })];
    const { total } = lineupTotal([1, 2, null], players, 1);
    expect(total).toBe(50);
  });

  it('does not count a bye-week player even if they are still assigned to a slot', () => {
    const players = [p({ id: 1, proj: 20, bye: 5 })];
    const { total } = lineupTotal([1], players, 5);
    expect(total).toBe(0);
  });

  it('flags usingRealData true only when at least one real weekly number was used', () => {
    const players = [p({ id: 1, proj: 20, weeklyProj: { 1: 99 } })];
    expect(lineupTotal([1], players, 1).usingRealData).toBe(true);
    expect(lineupTotal([1], players, 2).usingRealData).toBe(false);
  });
});

describe('benchPlayers', () => {
  it('returns rostered players not in the lineup', () => {
    const players = [p({ id: 1 }), p({ id: 2 }), p({ id: 3 })];
    const bench = benchPlayers([1, null], players);
    expect(bench.map(b => b.id).sort()).toEqual([2, 3]);
  });
});
