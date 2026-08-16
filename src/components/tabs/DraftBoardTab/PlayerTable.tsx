import { useMemo, useState } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import type { Player, Position } from '../../../types';
import { Badge } from '../../shared/Badge';

type SortKey = 'adp' | 'name' | 'bye' | 'proj' | 'vbd' | 'team';

export function PlayerTable() {
  const players = useDraftStore((s) => s.players);
  const config = useDraftStore((s) => s.config);
  const draftPlayer = useDraftStore((s) => s.draftPlayer);
  const undraftPlayer = useDraftStore((s) => s.undraftPlayer);

  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'AVAIL' | 'ALL'>('AVAIL');
  const [sortKey, setSortKey] = useState<SortKey>('adp');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === 'vbd' || key === 'proj' ? -1 : 1);
    }
  }

  function handleDraft(id: number, who: 'ME' | 'OPP') {
    const result = draftPlayer(id, who);
    if (!result.ok) alert(result.reason);
  }

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    let list = players.filter((p) => {
      if (config.hiddenTeams.includes(p.team)) return false;
      if (posFilter !== 'ALL' && p.pos !== posFilter) return false;
      if (!q && statusFilter === 'AVAIL' && p.status !== 'AVAIL') return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))) return false;
      return true;
    });

    list = list.slice().sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sortDir;
      const an = av === null ? -Infinity : Number(av);
      const bn = bv === null ? -Infinity : Number(bv);
      return (an - bn) * sortDir;
    });

    return list;
  }, [players, config.hiddenTeams, search, posFilter, statusFilter, sortKey, sortDir]);

  return (
    <div className="panel">
      <div className="search-bar">
        <input type="text" placeholder="Search player or team..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={posFilter} onChange={(e) => setPosFilter(e.target.value as Position | 'ALL')}>
          <option value="ALL">All Positions</option>
          <option value="QB">QB</option><option value="RB">RB</option>
          <option value="WR">WR</option><option value="TE">TE</option>
          <option value="DST">DST</option><option value="K">K</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'AVAIL' | 'ALL')}>
          <option value="AVAIL">Available Only</option>
          <option value="ALL">All Players</option>
        </select>
      </div>
      <div style={{ maxHeight: 640, overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('adp')}>#</th>
              <th onClick={() => handleSort('name')}>Player</th>
              <th>Pos</th>
              <th onClick={() => handleSort('team')}>Team</th>
              <th onClick={() => handleSort('bye')}>Bye</th>
              <th onClick={() => handleSort('proj')}>Proj Pts</th>
              <th onClick={() => handleSort('vbd')}>Value (VBD)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} style={{ color: 'var(--muted)' }}>No players match.</td></tr>
            )}
            {rows.map((p) => <PlayerRow key={p.id} player={p} onDraft={handleDraft} onUndraft={undraftPlayer} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerRow({ player, onDraft, onUndraft }: {
  player: Player;
  onDraft: (id: number, who: 'ME' | 'OPP') => void;
  onUndraft: (id: number) => void;
}) {
  const cls = player.status === 'ME' ? 'taken-me' : player.status === 'OPP' ? 'taken-opp' : '';
  const srcTitle = player.sources.map((s) => `${s.label}: ${s.proj ?? '—'} pts`).join(' | ');
  const sourceTag = player.sources.length > 1 ? `${player.sources.length} src` : (player.sources[0]?.label ?? 'no source');

  return (
    <tr className={cls}>
      <td>{player.adp ?? ''}</td>
      <td>{player.name}</td>
      <td><Badge pos={player.pos} /></td>
      <td>{player.team}</td>
      <td>{player.bye ?? ''}</td>
      <td title={srcTitle}>{player.proj} <span className="pill">{sourceTag}</span></td>
      <td className="vbd">+{player.vbd}</td>
      <td className="actions">
        {player.status === 'AVAIL' ? (
          <>
            <button className="small" onClick={() => onDraft(player.id, 'ME')}>Draft (Me)</button>
            <button className="small ghost" onClick={() => onDraft(player.id, 'OPP')}>Taken</button>
          </>
        ) : (
          <button className="small ghost" onClick={() => onUndraft(player.id)}>Undo</button>
        )}
      </td>
    </tr>
  );
}
