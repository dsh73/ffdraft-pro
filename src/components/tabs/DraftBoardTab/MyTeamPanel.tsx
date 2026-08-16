import { useMemo } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import { getSlotDefs } from '../../../lib/lineupOptimizer';
import type { Player } from '../../../types';
import { Badge } from '../../shared/Badge';

export function MyTeamPanel() {
  const players = useDraftStore((s) => s.players);
  const config = useDraftStore((s) => s.config);

  const { assigned, bench } = useMemo(() => {
    const mine = players.filter((p) => p.status === 'ME');
    const slots = getSlotDefs(config.roster);
    const used = new Set<number>();

    const assigned = slots.map((slot) => {
      const match = mine.find((p) => !used.has(p.id) && slot.eligible.includes(p.pos));
      if (match) used.add(match.id);
      return { slot, player: match ?? null };
    });

    const bench = mine.filter((p) => !used.has(p.id));
    return { assigned, bench };
  }, [players, config.roster]);

  function teamBye(p: Player | null) {
    if (!p) return '';
    return `${p.team ?? ''}${p.bye ? ' · Bye ' + p.bye : ''}`;
  }

  return (
    <>
      <h2>My Team</h2>
      <div style={{ maxHeight: 340, overflow: 'auto' }}>
        <div className="roster-slot" style={{ paddingTop: 0 }}><b style={{ fontSize: 11, color: 'var(--muted)' }}>STARTING ROSTER</b></div>
        {assigned.map((a, i) => (
          <div className={`roster-slot ${a.player ? 'filled' : 'empty'}`} key={i}>
            <span><span className="pill">{a.slot.label}</span> <span className="name">{a.player ? a.player.name : '—'}</span> <span style={{ color: 'var(--muted)', fontSize: 11 }}>{teamBye(a.player)}</span></span>
            <span className="fill">{a.player ? `${a.player.proj} pts` : ''}</span>
          </div>
        ))}
        <div className="roster-slot" style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 8 }}>
          <b style={{ fontSize: 11, color: 'var(--muted)' }}>BENCH</b>
        </div>
        {bench.length === 0
          ? <div className="roster-slot empty"><span className="name">No bench players yet</span></div>
          : bench.map((p) => (
            <div className="roster-slot filled" key={p.id}>
              <span><Badge pos={p.pos} /> <span className="name">{p.name}</span></span>
              <span className="fill">{p.proj} pts</span>
            </div>
          ))}
      </div>
    </>
  );
}
