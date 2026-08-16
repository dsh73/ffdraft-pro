import type { Player, PlayerSource } from '../types';
import { normalizeName } from './nameMatching';

/**
 * Recomputes a player's proj/adp as the average across all their attached
 * sources, in place. Called any time a source is added, replaced, or removed.
 */
export function averagePlayerFromSources(player: Player): void {
  const projVals = player.sources.map(s => s.proj).filter((v): v is number => v !== null && !Number.isNaN(v));
  const adpVals = player.sources.map(s => s.adp).filter((v): v is number => v !== null && !Number.isNaN(v));
  if (projVals.length) {
    player.proj = Math.round((projVals.reduce((a, b) => a + b, 0) / projVals.length) * 10) / 10;
  }
  if (adpVals.length) {
    player.adp = Math.round((adpVals.reduce((a, b) => a + b, 0) / adpVals.length) * 10) / 10;
  }
}

/**
 * Adds or replaces a single named source's contribution to a player, then
 * re-averages. Re-importing the same source label replaces its prior entry
 * instead of double-counting it.
 */
export function upsertSource(player: Player, source: PlayerSource): void {
  player.sources = player.sources.filter(s => s.label !== source.label);
  player.sources.push(source);
  averagePlayerFromSources(player);
}

/**
 * Finds players that are the same person under name normalization (scoped by
 * position, to avoid an unrelated name collision across positions) and merges
 * them into one entry: combines their sources (de-duped by label), keeps
 * drafted status if either had one, and re-averages.
 *
 * Returns a new players array plus the number of duplicates removed.
 */
export function mergeDuplicatePlayers(players: Player[]): { players: Player[]; removedCount: number } {
  const groups = new Map<string, Player[]>();
  for (const p of players) {
    const key = `${normalizeName(p.name)}|${p.pos}`;
    const group = groups.get(key);
    if (group) group.push(p); else groups.set(key, [p]);
  }

  const merged: Player[] = [];
  let removedCount = 0;

  for (const group of groups.values()) {
    if (group.length === 1) { merged.push(group[0]); continue; }

    // Prefer the shortest display name — usually the one without a stray suffix.
    const canonical = group.reduce((a, b) => (a.name.length <= b.name.length ? a : b));

    const sourceMap = new Map<string, PlayerSource>();
    for (const p of group) for (const s of p.sources) sourceMap.set(s.label, s);
    canonical.sources = Array.from(sourceMap.values());

    const draftedOne = group.find(p => p.status !== 'AVAIL');
    if (draftedOne) canonical.status = draftedOne.status;

    if (!canonical.team) canonical.team = group.find(p => p.team)?.team ?? canonical.team;
    if (canonical.bye === null || canonical.bye === undefined) {
      canonical.bye = group.find(p => p.bye !== null && p.bye !== undefined)?.bye ?? canonical.bye;
    }

    averagePlayerFromSources(canonical);
    merged.push(canonical);
    removedCount += group.length - 1;
  }

  return { players: merged, removedCount };
}
