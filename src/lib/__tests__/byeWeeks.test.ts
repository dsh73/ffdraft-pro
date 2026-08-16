import { describe, it, expect } from 'vitest';
import { isOnBye, fillMissingByes, BYE_WEEKS } from '../byeWeeks';
import type { Player } from '../../types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 1, name: 'Test Player', pos: 'RB', team: 'BUF', bye: null,
    proj: 100, adp: 50, vbd: 0, status: 'AVAIL', sources: [],
    ...overrides,
  };
}

describe('isOnBye', () => {
  it('returns true when bye matches the week', () => {
    expect(isOnBye(makePlayer({ bye: 7 }), 7)).toBe(true);
  });

  it('returns false when bye does not match the week', () => {
    expect(isOnBye(makePlayer({ bye: 7 }), 8)).toBe(false);
  });

  it('returns false when bye is null', () => {
    expect(isOnBye(makePlayer({ bye: null }), 7)).toBe(false);
  });

  it('returns false for a null/undefined player', () => {
    expect(isOnBye(null, 7)).toBe(false);
    expect(isOnBye(undefined, 7)).toBe(false);
  });

  it('coerces numeric-string comparisons safely', () => {
    // @ts-expect-error — intentionally testing loose input from CSV parsing
    expect(isOnBye(makePlayer({ bye: '7' }), 7)).toBe(true);
  });
});

describe('fillMissingByes', () => {
  it('fills a missing bye from the team schedule', () => {
    const players = [makePlayer({ team: 'BUF', bye: null })];
    const filled = fillMissingByes(players);
    expect(filled).toBe(1);
    expect(players[0].bye).toBe(BYE_WEEKS.BUF);
  });

  it('does not overwrite an existing bye', () => {
    const players = [makePlayer({ team: 'BUF', bye: 99 })];
    fillMissingByes(players);
    expect(players[0].bye).toBe(99);
  });

  it('leaves bye null if the team is unknown', () => {
    const players = [makePlayer({ team: 'XXX', bye: null })];
    const filled = fillMissingByes(players);
    expect(filled).toBe(0);
    expect(players[0].bye).toBeNull();
  });

  it('treats WAS and WSH as the same team (Washington alias)', () => {
    expect(BYE_WEEKS.WAS).toBe(BYE_WEEKS.WSH);
  });
});
