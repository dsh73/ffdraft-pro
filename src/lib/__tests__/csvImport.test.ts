import { describe, it, expect } from 'vitest';
import { mergeCsvRowsIntoPool, replacePoolFromCsvRows } from '../csvImport';
import { averagePlayerFromSources } from '../sources';
import type { Player, RawCsvRow } from '../../types';

function p(overrides: Partial<Player>): Player {
  return {
    id: 0, name: 'P', pos: 'RB', team: 'XXX', bye: null,
    proj: 0, adp: 1, vbd: 0, status: 'AVAIL', sources: [],
    ...overrides,
  };
}

describe('mergeCsvRowsIntoPool', () => {
  it('adds a new player not already in the pool', () => {
    const rows: RawCsvRow[] = [{ name: 'New Guy', pos: 'WR', team: 'BUF', proj_pts: '150', adp: '20' }];
    const { players, added, updated } = mergeCsvRowsIntoPool([], rows, 'ESPN', averagePlayerFromSources);
    expect(added).toBe(1);
    expect(updated).toBe(0);
    expect(players[0].name).toBe('New Guy');
    expect(players[0].proj).toBe(150);
  });

  it('updates and averages an existing player instead of duplicating', () => {
    const existing = [p({ id: 1, name: 'Existing Player', pos: 'WR', proj: 100, sources: [{ label: 'Built-in', proj: 100, adp: 10 }] })];
    const rows: RawCsvRow[] = [{ name: 'Existing Player', pos: 'WR', proj_pts: '200', adp: '10' }];
    const { players, updated, added } = mergeCsvRowsIntoPool(existing, rows, 'ESPN', averagePlayerFromSources);
    expect(updated).toBe(1);
    expect(added).toBe(0);
    expect(players.length).toBe(1);
    expect(players[0].proj).toBe(150); // averaged: (100 + 200) / 2
  });

  it('matches players despite a suffix mismatch (James Cook II vs III)', () => {
    const existing = [p({ id: 1, name: 'James Cook II', pos: 'RB', proj: 250, sources: [{ label: 'ESPN', proj: 250, adp: 15 }] })];
    const rows: RawCsvRow[] = [{ name: 'James Cook III', pos: 'RB', proj_pts: '270', adp: '15' }];
    const { players, updated, added } = mergeCsvRowsIntoPool(existing, rows, 'FantasyPros', averagePlayerFromSources);
    expect(updated).toBe(1);
    expect(added).toBe(0);
    expect(players.length).toBe(1);
  });

  it('re-importing the same source label replaces rather than double-counts', () => {
    const existing = [p({ id: 1, name: 'Player', pos: 'RB', proj: 100, sources: [{ label: 'ESPN', proj: 100, adp: 10 }] })];
    const rows: RawCsvRow[] = [{ name: 'Player', pos: 'RB', proj_pts: '300', adp: '5' }];
    const { players } = mergeCsvRowsIntoPool(existing, rows, 'ESPN', averagePlayerFromSources);
    expect(players[0].sources.length).toBe(1);
    expect(players[0].proj).toBe(300);
  });

  it('estimates proj from ADP when no explicit proj_pts column value is given', () => {
    const rows: RawCsvRow[] = [{ name: 'ADP Only', pos: 'RB', adp: '5' }];
    const { players } = mergeCsvRowsIntoPool([], rows, 'FFC', averagePlayerFromSources);
    expect(players[0].proj).toBeGreaterThan(0);
  });

  it('does not mutate the original input array', () => {
    const existing = [p({ id: 1, name: 'Player', pos: 'RB' })];
    const rows: RawCsvRow[] = [{ name: 'Player', pos: 'RB', proj_pts: '999', adp: '1' }];
    mergeCsvRowsIntoPool(existing, rows, 'ESPN', averagePlayerFromSources);
    expect(existing[0].proj).toBe(0); // untouched
  });
});

describe('replacePoolFromCsvRows', () => {
  it('builds a fresh pool purely from the CSV rows', () => {
    const rows: RawCsvRow[] = [
      { name: 'Player A', pos: 'QB', adp: '1', proj_pts: '300' },
      { name: 'Player B', pos: 'RB', adp: '2', proj_pts: '280' },
    ];
    const players = replacePoolFromCsvRows(rows, 'Custom');
    expect(players.length).toBe(2);
    expect(players[0].proj).toBe(300);
    expect(players.every(p => p.status === 'AVAIL')).toBe(true);
  });

  it('assigns sequential ADP when the CSV omits it', () => {
    const rows: RawCsvRow[] = [{ name: 'A', pos: 'WR' }, { name: 'B', pos: 'WR' }];
    const players = replacePoolFromCsvRows(rows, 'Custom');
    expect(players[0].adp).toBe(1);
    expect(players[1].adp).toBe(2);
  });
});
