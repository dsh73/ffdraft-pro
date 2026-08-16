import { useMemo } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import { Pill } from '../../shared/Pill';
import type { Position } from '../../../types';
import { Badge } from '../../shared/Badge';

export function RosterCapsPanel() {
  const players = useDraftStore((s) => s.players);
  const maxPerPosition = useDraftStore((s) => s.config.maxPerPosition);

  const rows = useMemo(() => {
    const mine = players.filter((p) => p.status === 'ME');
    return (Object.keys(maxPerPosition) as Position[]).map((pos) => {
      const owned = mine.filter((p) => p.pos === pos).length;
      const max = maxPerPosition[pos];
      return { pos, owned, max, atCap: owned >= max };
    });
  }, [players, maxPerPosition]);

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Roster Caps</h2>
      {rows.map(({ pos, owned, max, atCap }) => (
        <div className="roster-slot" key={pos}>
          <span><Badge pos={pos} /> {owned}/{max}</span>
          {atCap && <Pill tone="red">full</Pill>}
        </div>
      ))}
    </>
  );
}
