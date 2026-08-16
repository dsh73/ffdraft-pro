import { useMemo } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import { Pill } from '../../shared/Pill';
import { myRosterNeeds } from '../../../lib/rosterNeeds';

export function OnClockPanel() {
  const players = useDraftStore((s) => s.players);
  const config = useDraftStore((s) => s.config);

  const { top, recommendations } = useMemo(() => {
    const available = players
      .filter((p) => p.status === 'AVAIL' && !config.hiddenTeams.includes(p.team))
      .sort((a, b) => b.vbd - a.vbd);

    const mine = players.filter((p) => p.status === 'ME');
    const needs = myRosterNeeds(mine, config.roster);
    const needPositions = new Set(Object.entries(needs).filter(([k, v]) => k !== 'FLEX' && (v ?? 0) > 0).map(([k]) => k));

    const recommendations = available
      .slice(0, 40)
      .map((p) => ({ player: p, needBoost: needPositions.has(p.pos) ? 1 : 0 }))
      .sort((a, b) => (b.needBoost - a.needBoost) || (b.player.vbd - a.player.vbd))
      .slice(0, 5);

    return { top: available[0] ?? null, recommendations };
  }, [players, config]);

  return (
    <div className="onclock">
      <div className="eyebrow">On the clock — best available</div>
      <div className="pick">{top ? top.name : 'No players left'}</div>
      <div className="meta">
        {top ? `${top.pos} · ${top.team} · Bye ${top.bye ?? '—'} · Proj ${top.proj} pts · VBD +${top.vbd}` : ''}
      </div>
      <div className="rec-list">
        {recommendations.length === 0 && <div className="rec-row">No players available</div>}
        {recommendations.map(({ player, needBoost }) => (
          <div className="rec-row" key={player.id}>
            <div>
              <span className="name">{player.name}</span>
              <span className={`pos badge ${player.pos}`}>{player.pos}</span>
              {needBoost > 0 && <Pill>fills need</Pill>}
            </div>
            <div className="vbd">+{player.vbd}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
