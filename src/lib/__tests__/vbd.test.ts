import { describe, it, expect } from 'vitest';
import { projFromRank, startersNeededByPosition, replacementLevels, computeVBD } from '../vbd';
import type { Player, RosterConfig } from '../../types';

const STANDARD_ROSTER: RosterConfig = { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6 };

function makePool(): Player[] {
  // A small synthetic RB pool with a clear, known ordering, for a 2-team league
  // (small on purpose so the "replacement level" index is easy to hand-verify).
  const names = ['RB1', 'RB2', 'RB3', 'RB4', 'RB5'];
  const points = [300, 250, 200, 150, 100];
  return names.map((name, i) => ({
    id: i, name, pos: 'RB', team: 'XXX', bye: null,
    proj: points[i], adp: i + 1, vbd: 0, status: 'AVAIL', sources: [],
  }));
}

describe('projFromRank', () => {
  it('gives a higher score to a better (lower) rank', () => {
    expect(projFromRank(1, 'RB')).toBeGreaterThan(projFromRank(50, 'RB'));
  });

  it('never returns below the 30-point floor', () => {
    expect(projFromRank(10000, 'K')).toBeGreaterThanOrEqual(30);
  });

  it('QB has a higher base value than K at the same rank', () => {
    expect(projFromRank(5, 'QB')).toBeGreaterThan(projFromRank(5, 'K'));
  });
});

describe('startersNeededByPosition', () => {
  it('computes plain (non-FLEX) positions as teams * roster count', () => {
    const needed = startersNeededByPosition(10, STANDARD_ROSTER);
    expect(needed.QB).toBe(10); // 10 teams * 1 QB
    expect(needed.DST).toBe(10);
    expect(needed.K).toBe(10);
  });

  it('splits FLEX slots proportionally into RB/WR/TE', () => {
    const needed = startersNeededByPosition(10, STANDARD_ROSTER);
    // 10 teams * 2 RB = 20, plus a share of 10 FLEX slots (45% -> ~5) = ~25
    expect(needed.RB).toBeGreaterThan(20);
    expect(needed.RB).toBeLessThan(30);
  });

  it('scales with league size', () => {
    const small = startersNeededByPosition(8, STANDARD_ROSTER);
    const large = startersNeededByPosition(14, STANDARD_ROSTER);
    expect(large.RB).toBeGreaterThan(small.RB);
  });
});

describe('replacementLevels', () => {
  it('picks the player right at the startable-slot cutoff', () => {
    const pool = makePool();
    // 2 teams, 1 RB starter, 0 FLEX -> exactly 2 startable RB slots -> replacement = pool[2] = RB3 (200 pts)
    const roster: RosterConfig = { QB: 1, RB: 1, WR: 1, TE: 1, FLEX: 0, DST: 1, K: 1, BENCH: 6 };
    const levels = replacementLevels(pool, 2, roster);
    expect(levels.RB).toBe(200);
  });

  it('falls back to the worst player if the cutoff exceeds pool size', () => {
    const pool = makePool();
    const roster: RosterConfig = { QB: 1, RB: 20, WR: 1, TE: 1, FLEX: 0, DST: 1, K: 1, BENCH: 6 };
    const levels = replacementLevels(pool, 10, roster); // needs 200 RBs, only 5 exist
    expect(levels.RB).toBe(100); // the worst (5th) player's points
  });

  it('returns 0 for a position with no players in the pool', () => {
    const levels = replacementLevels([], 10, STANDARD_ROSTER);
    expect(levels.QB).toBe(0);
  });
});

describe('computeVBD', () => {
  it('gives every player VBD = proj - replacement level', () => {
    const pool = makePool();
    const roster: RosterConfig = { QB: 1, RB: 1, WR: 1, TE: 1, FLEX: 0, DST: 1, K: 1, BENCH: 6 };
    computeVBD(pool, 2, roster); // replacement = 200 (RB3)
    expect(pool[0].vbd).toBe(300 - 200); // RB1
    expect(pool[2].vbd).toBe(200 - 200); // RB3, the replacement player itself
    expect(pool[4].vbd).toBe(100 - 200); // RB5, below replacement -> negative
  });

  it('ranks the same as raw points within one position (VBD is a monotonic shift)', () => {
    const pool = makePool();
    computeVBD(pool, 2, STANDARD_ROSTER);
    const sortedByProj = [...pool].sort((a, b) => b.proj - a.proj).map(p => p.id);
    const sortedByVbd = [...pool].sort((a, b) => b.vbd - a.vbd).map(p => p.id);
    expect(sortedByVbd).toEqual(sortedByProj);
  });
});
