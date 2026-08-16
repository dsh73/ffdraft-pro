import type { Player, Position, RawCsvRow } from '../types';
import { normalizeName } from './nameMatching';
import { projFromRank } from './vbd';

export interface CsvImportResult {
  players: Player[];
  updated: number;
  added: number;
}

function nextId(players: Player[]): number {
  return players.length ? Math.max(...players.map(p => p.id)) + 1 : 0;
}

/**
 * Merges parsed CSV rows into an existing player pool under a named source:
 * matching players (by normalized name) get this source's numbers
 * added/replaced and re-averaged; unmatched rows become new players.
 * Does not mutate the input array — returns a new one.
 */
export function mergeCsvRowsIntoPool(
  existingPlayers: Player[],
  rows: RawCsvRow[],
  sourceLabel: string,
  averageFn: (p: Player) => void,
): CsvImportResult {
  const players = existingPlayers.map(p => ({ ...p, sources: [...p.sources] }));
  let updated = 0;
  let added = 0;
  let idCounter = nextId(players);

  for (const row of rows) {
    const pos = row.pos.trim().toUpperCase() as Position;
    const adp = row.adp ? parseFloat(row.adp) : null;
    const explicitProj = row.proj_pts ? parseFloat(row.proj_pts) : null;
    const proj = explicitProj !== null && !Number.isNaN(explicitProj) ? explicitProj : (adp !== null ? projFromRank(adp, pos) : null);

    const match = players.find(p => normalizeName(p.name) === normalizeName(row.name) && p.pos === pos);

    if (match) {
      if (row.team) match.team = row.team;
      if (row.bye) match.bye = parseInt(row.bye, 10);
      match.sources = match.sources.filter(s => s.label !== sourceLabel);
      match.sources.push({ label: sourceLabel, proj, adp });
      averageFn(match);
      updated++;
    } else {
      const newAdp = adp ?? players.length + 1;
      const newProj = proj ?? projFromRank(newAdp, pos);
      players.push({
        id: idCounter++,
        name: row.name.trim(),
        pos,
        team: row.team?.trim() ?? '',
        bye: row.bye ? parseInt(row.bye, 10) : null,
        proj: newProj,
        adp: newAdp,
        vbd: 0,
        status: 'AVAIL',
        sources: [{ label: sourceLabel, proj: newProj, adp: newAdp }],
      });
      added++;
    }
  }

  return { players, updated, added };
}

/**
 * Full-replace import: wipes the pool and rebuilds it entirely from the CSV.
 * Use only when swapping in a complete alternate rankings list.
 */
export function replacePoolFromCsvRows(rows: RawCsvRow[], sourceLabel: string): Player[] {
  return rows.map((row, i) => {
    const pos = row.pos.trim().toUpperCase() as Position;
    const adp = row.adp ? parseFloat(row.adp) : i + 1;
    const explicitProj = row.proj_pts ? parseFloat(row.proj_pts) : null;
    const proj = explicitProj !== null && !Number.isNaN(explicitProj) ? explicitProj : projFromRank(adp, pos);
    return {
      id: i,
      name: row.name.trim(),
      pos,
      team: row.team?.trim() ?? '',
      bye: row.bye ? parseInt(row.bye, 10) : null,
      proj,
      adp,
      vbd: 0,
      status: 'AVAIL' as const,
      sources: [{ label: sourceLabel, proj, adp }],
    };
  });
}
