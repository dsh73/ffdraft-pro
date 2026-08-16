import { useMemo } from 'react';
import { useDraftStore } from '../state/useDraftStore';

function nextMyPick(teams: number, slot: number, totalPicksMade: number): number | null {
  for (let overall = totalPicksMade + 1; overall <= teams * 30; overall++) {
    const round = Math.ceil(overall / teams);
    const posInRound = overall - (round - 1) * teams;
    const slotAtThisPick = round % 2 === 1 ? posInRound : teams - posInRound + 1;
    if (slotAtThisPick === slot) return overall;
  }
  return null;
}

export function Header() {
  const players = useDraftStore((s) => s.players);
  const config = useDraftStore((s) => s.config);

  const { round, pickInRound, left, nextPick } = useMemo(() => {
    const totalTaken = players.filter((p) => p.status !== 'AVAIL').length;
    const round = Math.floor(totalTaken / config.teams) + 1;
    const pickInRound = (totalTaken % config.teams) + 1;
    const left = players.filter((p) => p.status === 'AVAIL').length;
    const nextPick = nextMyPick(config.teams, config.slot, totalTaken);
    return { round, pickInRound, left, nextPick };
  }, [players, config.teams, config.slot]);

  return (
    <div className="scoreboard">
      <div className="brand">
        <h1>DRAFT BOARD</h1>
        <span>PPR ASSISTANT · ESPN</span>
      </div>
      <div className="stat-strip">
        <div>ROUND <b>{round}</b></div>
        <div>PICK <b>{pickInRound}</b></div>
        <div>YOUR NEXT <b>{nextPick ? `#${nextPick}` : '—'}</b></div>
        <div>PLAYERS LEFT <b>{left}</b></div>
      </div>
    </div>
  );
}
