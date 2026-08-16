import { useMemo } from 'react';
import { useDraftStore } from '../../state/useDraftStore';
import { getSlotDefs } from '../../lib/lineupOptimizer';
import type { Player } from '../../types';
import { Badge } from '../shared/Badge';

export function MyTeamTab() {
  const players = useDraftStore((s) => s.players);
  const roster = useDraftStore((s) => s.config.roster);

  const { assigned, bench } = useMemo(() => {
    const mine = players.filter((p) => p.status === 'ME');
    const slots = getSlotDefs(roster);
    const used = new Set<number>();

    const assigned = slots.map((slot) => {
      const match = mine.find((p) => !used.has(p.id) && slot.eligible.includes(p.pos));
      if (match) used.add(match.id);
      return { slot, player: match ?? null };
    });

    // Show a fixed number of bench slots (filled or empty), matching your league's bench size,
    // plus any overflow beyond that if you somehow exceed it.
    const benchPlayers = mine.filter((p) => !used.has(p.id));
    const benchSlotCount = Math.max(roster.BENCH, benchPlayers.length);
    const bench: (Player | null)[] = Array.from({ length: benchSlotCount }, (_, i) => benchPlayers[i] ?? null);

    return { assigned, bench };
  }, [players, roster]);

  function teamBye(p: Player | null) {
    if (!p) return '';
    return `${p.team ?? ''}${p.bye ? ' · Bye ' + p.bye : ''}`;
  }

  return (
    <div className="panel">
      <h2>My Roster</h2>
      <div className="roster-slot" style={{ paddingTop: 0 }}><b>STARTING ROSTER ({assigned.length})</b></div>
      {assigned.map((a, i) => (
        <div className={`roster-slot ${a.player ? 'filled' : 'empty'}`} key={i}>
          <span><span className="pill">{a.slot.label}</span> <span className="name">{a.player ? a.player.name : 'Empty'}</span> <span style={{ color: 'var(--muted)', fontSize: 11 }}>{teamBye(a.player)}</span></span>
          <span className="fill">{a.player ? `${a.player.proj} pts` : ''}</span>
        </div>
      ))}
      <div className="roster-slot" style={{ borderTop: '2px solid var(--line)', marginTop: 8, paddingTop: 10 }}>
        <b>BENCH ({roster.BENCH})</b>
      </div>
      {bench.map((p, i) => (
        p ? (
          <div className="roster-slot filled" key={p.id}>
            <span><Badge pos={p.pos} /> <span className="name">{p.name}</span> <span style={{ color: 'var(--muted)', fontSize: 11 }}>{teamBye(p)}</span></span>
            <span className="fill">{p.proj} pts</span>
          </div>
        ) : (
          <div className="roster-slot empty" key={`empty-${i}`}><span className="name">Empty</span></div>
        )
      ))}
    </div>
  );
}
