import { describe, it, expect } from 'vitest';
import { myRosterNeeds } from '../rosterNeeds';
import type { Player, RosterConfig } from '../../types';

const ROSTER: RosterConfig = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6 };

function p(overrides: Partial<Player>): Player {
  return {
    id: 0, name: 'P', pos: 'RB', team: 'XXX', bye: null,
    proj: 0, adp: 1, vbd: 0, status: 'ME', sources: [],
    ...overrides,
  };
}

describe('myRosterNeeds', () => {
  it('reports full need at every position with an empty roster', () => {
    const needs = myRosterNeeds([], ROSTER);
    expect(needs.QB).toBe(1);
    expect(needs.RB).toBe(2);
    expect(needs.WR).toBe(2);
    expect(needs.TE).toBe(1);
    expect(needs.DST).toBe(1);
    expect(needs.K).toBe(1);
    expect(needs.FLEX).toBe(1);
  });

  it('reduces need as positions get filled', () => {
    const mine = [p({ id: 1, pos: 'QB' })];
    const needs = myRosterNeeds(mine, ROSTER);
    expect(needs.QB).toBe(0);
  });

  it('never goes negative when a position is over-filled', () => {
    const mine = [p({ id: 1, pos: 'QB' }), p({ id: 2, pos: 'QB' }), p({ id: 3, pos: 'QB' })];
    const needs = myRosterNeeds(mine, ROSTER);
    expect(needs.QB).toBe(0);
  });

  it('reduces FLEX need once RB/WR/TE starters are filled and an extra flex-eligible player exists', () => {
    // 2 RB + 2 WR + 1 TE fills all required RB/WR/TE slots; one more RB should count toward FLEX
    const mine = [
      p({ id: 1, pos: 'RB' }), p({ id: 2, pos: 'RB' }),
      p({ id: 3, pos: 'WR' }), p({ id: 4, pos: 'WR' }),
      p({ id: 5, pos: 'TE' }),
      p({ id: 6, pos: 'RB' }), // extra RB beyond the 2 required -> should fill FLEX
    ];
    const needs = myRosterNeeds(mine, ROSTER);
    expect(needs.FLEX).toBe(0);
  });

  it('does not let a QB count toward FLEX (QB is not flex-eligible)', () => {
    const mine = [p({ id: 1, pos: 'QB' }), p({ id: 2, pos: 'QB' })]; // 2nd QB is "extra" but not flex-eligible
    const needs = myRosterNeeds(mine, ROSTER);
    expect(needs.FLEX).toBe(1); // still need a flex-eligible player
  });
});
