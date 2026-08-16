import { useMemo } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import type { Position } from '../../../types';
import { Badge } from '../../shared/Badge';

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];

export function PositionScarcityPanel() {
  const players = useDraftStore((s) => s.players);
  const hiddenTeams = useDraftStore((s) => s.config.hiddenTeams);

  const rows = useMemo(() => POSITIONS.map((pos) => {
    const notHidden = players.filter((p) => p.pos === pos && !hiddenTeams.includes(p.team));
    const avail = notHidden.filter((p) => p.status === 'AVAIL').length;
    const pct = notHidden.length ? Math.round((avail / notHidden.length) * 100) : 0;
    return { pos, avail, pct };
  }), [players, hiddenTeams]);

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Positions Left on Board</h2>
      {rows.map(({ pos, avail, pct }) => (
        <div className="roster-slot" key={pos}>
          <span><Badge pos={pos} /> {avail} left</span>
          <span className="fill">{pct}% of pool</span>
        </div>
      ))}
    </>
  );
}
