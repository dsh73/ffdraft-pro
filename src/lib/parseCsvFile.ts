import Papa from 'papaparse';
import type { RawCsvRow } from '../types';

/**
 * Parses raw CSV text into RawCsvRow objects. This is intentionally the
 * *only* file in the app that imports PapaParse — everything downstream
 * (mergeCsvRowsIntoPool, replacePoolFromCsvRows in csvImport.ts) works on
 * plain RawCsvRow objects and has no knowledge of the parsing library,
 * which is what keeps that logic unit-testable without it.
 *
 * Required columns: name, pos. Optional: team, bye, proj_pts, adp.
 */
export function parseCsvText(text: string): RawCsvRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    throw new Error(`CSV parse error at row ${first.row}: ${first.message}`);
  }

  const rows = result.data;
  if (rows.length === 0) return [];
  if (!('name' in rows[0]) || !('pos' in rows[0])) {
    throw new Error('CSV needs at least "name" and "pos" columns.');
  }

  return rows.map((row) => ({
    name: (row.name ?? '').trim(),
    pos: (row.pos ?? '').trim(),
    team: row.team?.trim(),
    bye: row.bye?.trim(),
    proj_pts: row.proj_pts?.trim(),
    adp: row.adp?.trim(),
  })).filter(r => r.name.length > 0);
}
