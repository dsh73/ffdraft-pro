import { describe, it, expect } from 'vitest';
import { computeWaiverSuggestions } from '../waiver';
import type { Player, WaiverCandidate } from '../../types';

function p(overrides: Partial<Player>): Player {
  return {
    id: 0, name: 'P', pos: 'RB', team: 'XXX', bye: null,
    proj: 0, adp: 1, vbd: 0, status: 'ME', sources: [],
    ...overrides,
  };
}

function w(overrides: Partial<WaiverCandidate>): WaiverCandidate {
  return { name: 'W', pos: 'RB', team: 'XXX', bye: null, proj: 0, ...overrides };
}

describe('computeWaiverSuggestions', () => {
  it('suggests a clear upgrade over the weakest rostered player at that position', () => {
    const mine = [p({ id: 1, pos: 'RB', proj: 50, name: 'Weak RB' })];
    const waivers = [w({ name: 'Strong FA', pos: 'RB', proj: 120 })];
    const suggestions = computeWaiverSuggestions(mine, waivers);
    const rbSuggestion = suggestions.find(s => s.pos === 'RB');
    expect(rbSuggestion).toBeDefined();
    expect(rbSuggestion!.add.name).toBe('Strong FA');
    expect(rbSuggestion!.drop!.name).toBe('Weak RB');
    expect(rbSuggestion!.gain).toBe(70);
  });

  it('does not suggest a downgrade', () => {
    const mine = [p({ id: 1, pos: 'RB', proj: 200 })];
    const waivers = [w({ pos: 'RB', proj: 50 })];
    const suggestions = computeWaiverSuggestions(mine, waivers);
    expect(suggestions.find(s => s.pos === 'RB')).toBeUndefined();
  });

  it('suggests any available player at a position you have nobody rostered for', () => {
    const suggestions = computeWaiverSuggestions([], [w({ pos: 'TE', proj: 80 })]);
    const teSuggestion = suggestions.find(s => s.pos === 'TE');
    expect(teSuggestion).toBeDefined();
    expect(teSuggestion!.drop).toBeNull();
    expect(teSuggestion!.gain).toBe(80);
  });

  it('returns no suggestions when the waiver pool is empty', () => {
    const mine = [p({ pos: 'RB', proj: 50 })];
    expect(computeWaiverSuggestions(mine, [])).toEqual([]);
  });

  it('evaluates each position independently', () => {
    const mine = [p({ id: 1, pos: 'RB', proj: 200 }), p({ id: 2, pos: 'WR', proj: 30 })];
    const waivers = [w({ pos: 'RB', proj: 50 }), w({ pos: 'WR', proj: 100 })];
    const suggestions = computeWaiverSuggestions(mine, waivers);
    expect(suggestions.find(s => s.pos === 'RB')).toBeUndefined(); // downgrade, skipped
    expect(suggestions.find(s => s.pos === 'WR')).toBeDefined();   // upgrade, flagged
  });
});
