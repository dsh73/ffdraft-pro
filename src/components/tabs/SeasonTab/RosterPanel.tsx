import { useMemo } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import { Badge } from '../../shared/Badge';

export function RosterPanel() {
  const players = useDraftStore((s) => s.players);
  const dropPlayer = useDraftStore((s) => s.dropPlayer);

  const mine = useMemo(() => players.filter((p) => p.status === 'ME'), [players]);

  function handleDrop(id: number, name: string) {
    if (confirm(`Drop ${name} from your roster? You can add a waiver player after.`)) {
      dropPlayer(id);
    }
  }

  return (
    <div className="panel" style={{ height: 'fit-content' }}>
      <h2>My Roster</h2>
      <p className="footer-note" style={{ marginTop: 0 }}>Drop a player to free a roster spot for a waiver pickup.</p>
      <div style={{ maxHeight: 600, overflow: 'auto' }}>
        {mine.length === 0
          ? <div className="roster-slot empty"><span className="name">No players on your roster yet — finish your draft first.</span></div>
          : mine.map((p) => (
            <div className="roster-slot filled" key={p.id}>
              <span>
                <Badge pos={p.pos} /> <span className="name">{p.name}</span>{' '}
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{p.team}{p.bye ? ` · Bye ${p.bye}` : ''}</span>
              </span>
              <span className="fill">
                {p.proj} pts <button className="ghost small" onClick={() => handleDrop(p.id, p.name)}>Drop</button>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
