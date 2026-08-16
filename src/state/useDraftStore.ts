import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Player, LeagueConfig, WeeklyLineup, WaiverCandidate, RawCsvRow, Position,
} from '../types';
import { loadSeedPlayers } from '../lib/loadSeedPlayers';
import { computeVBD, projFromRank } from '../lib/vbd';
import { fillMissingByes } from '../lib/byeWeeks';
import { normalizeName } from '../lib/nameMatching';
import { averagePlayerFromSources, mergeDuplicatePlayers } from '../lib/sources';
import { mergeCsvRowsIntoPool, replacePoolFromCsvRows } from '../lib/csvImport';
import { autoOptimizeLineup as computeOptimalLineup, getSlotDefs } from '../lib/lineupOptimizer';

const DEFAULT_CONFIG: LeagueConfig = {
  teams: 12,
  slot: 5,
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6 },
  hiddenTeams: [],
  maxPerPosition: { QB: 4, RB: 8, WR: 8, TE: 3, DST: 3, K: 3 },
};

interface DraftStoreState {
  players: Player[];
  config: LeagueConfig;
  weeklyLineups: Record<number, WeeklyLineup>;
  waiverPool: WaiverCandidate[];
  currentWeek: number;

  // --- setup / league config ---
  ensureSeedLoaded: () => void;
  updateLeagueConfig: (config: LeagueConfig) => void;
  resetDraft: () => void;

  // --- CSV import ---
  importCsvMerge: (rows: RawCsvRow[], sourceLabel: string) => { updated: number; added: number; mergedDuplicates: number };
  importCsvReplace: (rows: RawCsvRow[], sourceLabel: string) => void;

  // --- sources ---
  removeSource: (label: string) => void;
  resetAllSources: () => void;

  // --- draft actions ---
  draftPlayer: (id: number, who: 'ME' | 'OPP') => { ok: boolean; reason?: string };
  undraftPlayer: (id: number) => void;

  // --- hidden teams ---
  hideTeam: (team: string) => void;
  unhideTeam: (team: string) => void;

  // --- season management ---
  setCurrentWeek: (week: number) => void;
  autoOptimizeLineup: () => void;
  setLineupSlot: (slotIndex: number, playerId: number | null) => void;
  dropPlayer: (id: number) => void;
  importWaiverCsv: (rows: RawCsvRow[]) => { imported: number };
  clearWaiverPool: () => void;
  addFromWaiver: (waiverIndex: number) => { ok: boolean; reason?: string };
  importWeeklyProjCsv: (rows: { name: string; proj_pts: string }[], week: number) => { matched: number; unmatched: number };
}

function recompute(players: Player[], config: LeagueConfig): Player[] {
  const next = players.map(p => ({ ...p }));
  fillMissingByes(next);
  computeVBD(next, config.teams, config.roster);
  return next;
}

export const useDraftStore = create<DraftStoreState>()(
  persist(
    (set, get) => ({
      players: [],
      config: DEFAULT_CONFIG,
      weeklyLineups: {},
      waiverPool: [],
      currentWeek: 1,

      ensureSeedLoaded: () => {
        if (get().players.length === 0) {
          const seeded = loadSeedPlayers();
          set({ players: recompute(seeded, get().config) });
        }
      },

      updateLeagueConfig: (config) => {
        set({ config, players: recompute(get().players, config) });
      },

      resetDraft: () => {
        set({ players: get().players.map(p => ({ ...p, status: 'AVAIL' as const })) });
      },

      importCsvMerge: (rows, sourceLabel) => {
        const { players: mergedIn, updated, added } = mergeCsvRowsIntoPool(
          get().players, rows, sourceLabel, averagePlayerFromSources,
        );
        const { players: deduped, removedCount } = mergeDuplicatePlayers(mergedIn);
        set({ players: recompute(deduped, get().config) });
        return { updated, added, mergedDuplicates: removedCount };
      },

      importCsvReplace: (rows, sourceLabel) => {
        const fresh = replacePoolFromCsvRows(rows, sourceLabel);
        set({ players: recompute(fresh, get().config) });
      },

      removeSource: (label) => {
        const next = get().players.map(p => {
          if (!p.sources.some(s => s.label === label)) return p;
          const player = { ...p, sources: p.sources.filter(s => s.label !== label) };
          if (player.sources.length === 0) {
            const est = projFromRank(player.adp || 200, player.pos);
            player.sources = [{ label: 'Built-in estimate', proj: est, adp: player.adp || 200 }];
          }
          averagePlayerFromSources(player);
          return player;
        });
        set({ players: recompute(next, get().config) });
      },

      resetAllSources: () => {
        const next = get().players.map(p => {
          const builtin = p.sources.find(s => s.label === 'Built-in estimate');
          const player = { ...p };
          if (builtin) {
            player.sources = [builtin];
          } else {
            const est = projFromRank(player.adp || 200, player.pos);
            player.sources = [{ label: 'Built-in estimate', proj: est, adp: player.adp || 200 }];
          }
          averagePlayerFromSources(player);
          return player;
        });
        set({ players: recompute(next, get().config) });
      },

      draftPlayer: (id, who) => {
        const { players, config } = get();
        const target = players.find(p => p.id === id);
        if (!target) return { ok: false, reason: 'Player not found.' };

        if (who === 'ME') {
          const owned = players.filter(p => p.status === 'ME' && p.pos === target.pos).length;
          const max = config.maxPerPosition[target.pos];
          if (max != null && owned >= max) {
            return { ok: false, reason: `You already have the max allowed ${target.pos}s on your roster (${max}). Drop one before adding another.` };
          }
        }

        set({ players: players.map(p => (p.id === id ? { ...p, status: who } : p)) });
        return { ok: true };
      },

      undraftPlayer: (id) => {
        set({ players: get().players.map(p => (p.id === id ? { ...p, status: 'AVAIL' as const } : p)) });
      },

      hideTeam: (team) => {
        const { config } = get();
        if (config.hiddenTeams.includes(team)) return;
        set({ config: { ...config, hiddenTeams: [...config.hiddenTeams, team] } });
      },

      unhideTeam: (team) => {
        const { config } = get();
        set({ config: { ...config, hiddenTeams: config.hiddenTeams.filter(t => t !== team) } });
      },

      setCurrentWeek: (week) => set({ currentWeek: week }),

      autoOptimizeLineup: () => {
        const { players, config, currentWeek } = get();
        const mine = players.filter(p => p.status === 'ME');
        const lineup = computeOptimalLineup(config.roster, mine, currentWeek);
        set({ weeklyLineups: { ...get().weeklyLineups, [currentWeek]: lineup } });
      },

      setLineupSlot: (slotIndex, playerId) => {
        const { weeklyLineups, currentWeek, config } = get();
        const slotCount = getSlotDefs(config.roster).length;
        const existing = weeklyLineups[currentWeek] ?? Array.from({ length: slotCount }, () => null);
        const next = [...existing];
        next[slotIndex] = playerId;
        set({ weeklyLineups: { ...weeklyLineups, [currentWeek]: next } });
      },

      dropPlayer: (id) => {
        const { players, weeklyLineups } = get();
        const nextPlayers = players.map(p => (p.id === id ? { ...p, status: 'DROPPED' as const } : p));
        const nextLineups: Record<number, WeeklyLineup> = {};
        for (const [week, lineup] of Object.entries(weeklyLineups)) {
          nextLineups[Number(week)] = lineup.map(pid => (pid === id ? null : pid));
        }
        set({ players: nextPlayers, weeklyLineups: nextLineups });
      },

      importWaiverCsv: (rows) => {
        const { players } = get();
        const myNames = new Set(players.filter(p => p.status === 'ME').map(p => normalizeName(p.name)));
        const candidates: WaiverCandidate[] = rows
          .filter(r => !myNames.has(normalizeName(r.name)))
          .map(r => {
            const pos = r.pos.trim().toUpperCase() as Position;
            const adp = r.adp ? parseFloat(r.adp) : undefined;
            const explicitProj = r.proj_pts ? parseFloat(r.proj_pts) : undefined;
            const proj = explicitProj ?? (adp !== undefined ? projFromRank(adp, pos) : projFromRank(200, pos));
            return {
              name: r.name.trim(),
              pos,
              team: r.team?.trim() ?? '',
              bye: r.bye ? parseInt(r.bye, 10) : null,
              proj,
            };
          });
        set({ waiverPool: candidates });
        return { imported: candidates.length };
      },

      clearWaiverPool: () => set({ waiverPool: [] }),

      addFromWaiver: (waiverIndex) => {
        const { waiverPool, players, config } = get();
        const wp = waiverPool[waiverIndex];
        if (!wp) return { ok: false, reason: 'Player not found in waiver pool.' };

        const mine = players.filter(p => p.status === 'ME');
        const rosterCap = Object.values(config.roster).reduce((a, b) => a + b, 0);
        const maxAtPos = config.maxPerPosition[wp.pos];
        const ownedAtPos = mine.filter(p => p.pos === wp.pos).length;

        if (maxAtPos != null && ownedAtPos >= maxAtPos) {
          return { ok: false, reason: `You already have the max allowed ${wp.pos}s on your roster (${maxAtPos}). Drop one before adding another.` };
        }
        if (mine.length >= rosterCap) {
          return { ok: false, reason: `Your roster is full (${rosterCap} spots). Drop a player first.` };
        }

        const existing = players.find(p => normalizeName(p.name) === normalizeName(wp.name) && p.pos === wp.pos);
        let nextPlayers: Player[];
        if (existing) {
          nextPlayers = players.map(p => (p.id === existing.id
            ? { ...p, status: 'ME' as const, team: wp.team || p.team, bye: wp.bye ?? p.bye, proj: wp.proj || p.proj }
            : p));
        } else {
          const nextId = players.length ? Math.max(...players.map(p => p.id)) + 1 : 0;
          const newPlayer: Player = {
            id: nextId, name: wp.name, pos: wp.pos, team: wp.team, bye: wp.bye,
            proj: wp.proj, adp: 999, vbd: 0, status: 'ME',
            sources: [{ label: 'Waiver Import', proj: wp.proj, adp: 999 }],
          };
          nextPlayers = [...players, newPlayer];
        }

        set({
          players: recompute(nextPlayers, config),
          waiverPool: waiverPool.filter((_, i) => i !== waiverIndex),
        });
        return { ok: true };
      },

      importWeeklyProjCsv: (rows, week) => {
        const { players } = get();
        let matched = 0, unmatched = 0;
        const next = players.map(p => ({ ...p, weeklyProj: p.weeklyProj ? { ...p.weeklyProj } : undefined }));
        for (const row of rows) {
          const proj = parseFloat(row.proj_pts);
          if (Number.isNaN(proj)) continue;
          const target = next.find(p => normalizeName(p.name) === normalizeName(row.name));
          if (target) {
            target.weeklyProj = { ...(target.weeklyProj ?? {}), [week]: proj };
            matched++;
          } else {
            unmatched++;
          }
        }
        set({ players: next });
        return { matched, unmatched };
      },
    }),
    {
      name: 'ffdraft-pro-state',
      partialize: (state) => ({
        players: state.players,
        config: state.config,
        weeklyLineups: state.weeklyLineups,
        waiverPool: state.waiverPool,
        currentWeek: state.currentWeek,
      }),
    },
  ),
);
