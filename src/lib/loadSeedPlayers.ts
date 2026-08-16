import type { Player } from '../types';
import { SEED_PLAYERS } from './seedData';
import { projFromRank } from './vbd';

/** Builds the initial player pool from the built-in seed data. */
export function loadSeedPlayers(): Player[] {
  return SEED_PLAYERS.map(([name, pos, team, bye, rank], id) => {
    const proj = projFromRank(rank, pos);
    return {
      id,
      name,
      pos,
      team,
      bye,
      proj,
      adp: rank,
      vbd: 0,
      status: 'AVAIL' as const,
      sources: [{ label: 'Built-in estimate', proj, adp: rank }],
    };
  });
}
