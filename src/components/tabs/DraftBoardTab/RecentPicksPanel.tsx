import { useMemo } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';

export function RecentPicksPanel() {
  const players = useDraftStore((s) => s.players);

  const recent = useMemo(
    () => players.filter((p) => p.status !== 'AVAIL' && p.status !== 'DROPPED').slice(-12).reverse(),
    [players],
  );

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Recent Picks</h2>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--muted)', maxHeight: 260, overflow: 'auto' }}>
        {recent.length === 0
          ? 'No picks yet.'
          : recent.map((p) => <div key={p.id}>[{p.status === 'ME' ? 'YOU' : 'OPP'}] {p.name} ({p.pos})</div>)}
      </div>
    </>
  );
}
