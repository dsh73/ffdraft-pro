import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import { parseCsvText } from '../../../lib/parseCsvFile';
import { computeWaiverSuggestions } from '../../../lib/waiver';
import { Badge } from '../../shared/Badge';

export function WaiverWirePanel() {
  const players = useDraftStore((s) => s.players);
  const waiverPool = useDraftStore((s) => s.waiverPool);
  const importWaiverCsv = useDraftStore((s) => s.importWaiverCsv);
  const clearWaiverPool = useDraftStore((s) => s.clearWaiverPool);
  const addFromWaiver = useDraftStore((s) => s.addFromWaiver);

  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const mine = useMemo(() => players.filter((p) => p.status === 'ME'), [players]);
  const suggestions = useMemo(() => computeWaiverSuggestions(mine, waiverPool), [mine, waiverPool]);
  const sortedWaivers = useMemo(
    () => waiverPool.map((wp, idx) => ({ wp, idx })).sort((a, b) => b.wp.proj - a.wp.proj),
    [waiverPool],
  );

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const rows = parseCsvText(text);
        const { imported } = importWaiverCsv(rows);
        setStatus(`Imported ${imported} available free agents.`);
      } catch (err) {
        setStatus(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleAdd(waiverIndex: number) {
    const result = addFromWaiver(waiverIndex);
    if (!result.ok) alert(result.reason);
  }

  return (
    <div className="panel">
      <h2>Waiver Wire / Free Agents</h2>
      <p className="footer-note" style={{ marginTop: 0 }}>
        Import a CSV of available free agents (same columns as before: name,pos,team,bye,proj_pts,adp).
      </p>
      <div className="import-row">
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        <button className="ghost small" onClick={() => fileRef.current?.click()}>Import Waiver Wire CSV</button>
        <button className="ghost small" onClick={() => { clearWaiverPool(); setStatus(''); }}>Clear Waiver Pool</button>
      </div>
      {status && <p className="footer-note">{status}</p>}

      {suggestions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <h2 style={{ fontSize: 14 }}>Suggested Pickups</h2>
          {suggestions.map((s) => (
            <div className="rec-row" key={s.pos}>
              <div>Add <b>{s.add.name}</b> ({s.pos}, {s.add.proj} pts){s.drop ? ` over your ${s.drop.name} (${s.drop.proj} pts)` : ''}</div>
              <div className="vbd">+{s.gain}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 10 }}>
        <table>
          <thead><tr><th>Player</th><th>Pos</th><th>Team</th><th>Bye</th><th>Proj Pts</th><th>Actions</th></tr></thead>
          <tbody>
            {sortedWaivers.length === 0
              ? <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>No waiver players imported yet.</td></tr>
              : sortedWaivers.map(({ wp, idx }) => (
                <tr key={`${wp.name}-${idx}`}>
                  <td>{wp.name}</td>
                  <td><Badge pos={wp.pos} /></td>
                  <td>{wp.team}</td>
                  <td>{wp.bye ?? ''}</td>
                  <td>{wp.proj}</td>
                  <td><button className="small" onClick={() => handleAdd(idx)}>Add</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
