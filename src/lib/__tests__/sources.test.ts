import { describe, it, expect } from 'vitest';
import { averagePlayerFromSources, upsertSource, mergeDuplicatePlayers } from '../sources';
import type { Player } from '../../types';

function p(overrides: Partial<Player>): Player {
  return {
    id: 0, name: 'P', pos: 'RB', team: 'XXX', bye: null,
    proj: 0, adp: 1, vbd: 0, status: 'AVAIL', sources: [],
    ...overrides,
  };
}

describe('averagePlayerFromSources', () => {
  it('averages proj across multiple sources', () => {
    const player = p({ sources: [{ label: 'A', proj: 100, adp: 10 }, { label: 'B', proj: 200, adp: 20 }] });
    averagePlayerFromSources(player);
    expect(player.proj).toBe(150);
    expect(player.adp).toBe(15);
  });

  it('ignores null values from a source that only supplied ADP', () => {
    const player = p({ sources: [{ label: 'A', proj: 100, adp: 10 }, { label: 'B', proj: null, adp: 20 }] });
    averagePlayerFromSources(player);
    expect(player.proj).toBe(100); // only A contributed a real proj
    expect(player.adp).toBe(15);   // both contributed adp
  });

  it('leaves proj/adp unchanged if no source has usable data', () => {
    const player = p({ proj: 77, adp: 33, sources: [{ label: 'A', proj: null, adp: null }] });
    averagePlayerFromSources(player);
    expect(player.proj).toBe(77);
    expect(player.adp).toBe(33);
  });
});

describe('upsertSource', () => {
  it('adds a new source and re-averages', () => {
    const player = p({ sources: [{ label: 'Built-in', proj: 100, adp: 10 }] });
    upsertSource(player, { label: 'ESPN', proj: 200, adp: 20 });
    expect(player.sources.length).toBe(2);
    expect(player.proj).toBe(150);
  });

  it('replaces a source with the same label instead of stacking a duplicate', () => {
    const player = p({ sources: [{ label: 'ESPN', proj: 100, adp: 10 }] });
    upsertSource(player, { label: 'ESPN', proj: 300, adp: 30 }); // re-import
    expect(player.sources.length).toBe(1);
    expect(player.proj).toBe(300); // not averaged with the old ESPN value
  });
});

describe('mergeDuplicatePlayers — the James Cook II/III bug', () => {
  it('merges two entries for the same player with different suffixes', () => {
    const players = [
      p({ id: 1, name: 'James Cook II', pos: 'RB', sources: [{ label: 'ESPN', proj: 250, adp: 15 }] }),
      p({ id: 2, name: 'James Cook III', pos: 'RB', sources: [{ label: 'FantasyPros', proj: 260, adp: 16 }] }),
    ];
    const { players: merged, removedCount } = mergeDuplicatePlayers(players);
    expect(removedCount).toBe(1);
    expect(merged.length).toBe(1);
    expect(merged[0].sources.map(s => s.label).sort()).toEqual(['ESPN', 'FantasyPros']);
    expect(merged[0].proj).toBe(255); // averaged from both sources
  });

  it('does not merge same-named players at different positions', () => {
    const players = [
      p({ id: 1, name: 'Josh Allen', pos: 'QB' }),
      p({ id: 2, name: 'Josh Allen', pos: 'DST' }), // hypothetical namesake, different position
    ];
    const { players: merged } = mergeDuplicatePlayers(players);
    expect(merged.length).toBe(2);
  });

  it('preserves a drafted status if either duplicate had one', () => {
    const players = [
      p({ id: 1, name: 'James Cook II', pos: 'RB', status: 'ME' }),
      p({ id: 2, name: 'James Cook III', pos: 'RB', status: 'AVAIL' }),
    ];
    const { players: merged } = mergeDuplicatePlayers(players);
    expect(merged[0].status).toBe('ME');
  });

  it('leaves unique players untouched', () => {
    const players = [p({ id: 1, name: 'Player A' }), p({ id: 2, name: 'Player B' })];
    const { players: merged, removedCount } = mergeDuplicatePlayers(players);
    expect(removedCount).toBe(0);
    expect(merged.length).toBe(2);
  });
});
