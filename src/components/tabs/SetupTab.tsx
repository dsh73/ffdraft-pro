import { useRef, useState, type ChangeEvent } from 'react';
import { useDraftStore } from '../../state/useDraftStore';
import { parseCsvText } from '../../lib/parseCsvFile';
import type { LeagueConfig, Position } from '../../types';

export function SetupTab() {
  const config = useDraftStore((s) => s.config);
  const players = useDraftStore((s) => s.players);
  const updateLeagueConfig = useDraftStore((s) => s.updateLeagueConfig);
  const resetDraft = useDraftStore((s) => s.resetDraft);
  const importCsvMerge = useDraftStore((s) => s.importCsvMerge);
  const importCsvReplace = useDraftStore((s) => s.importCsvReplace);
  const removeSource = useDraftStore((s) => s.removeSource);
  const resetAllSources = useDraftStore((s) => s.resetAllSources);

  const [form, setForm] = useState<LeagueConfig>(config);
  const [sourceLabel, setSourceLabel] = useState('');
  const [status, setStatus] = useState('');

  const mergeFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  function updateRosterField(key: keyof LeagueConfig['roster'], value: number) {
    setForm((f) => ({ ...f, roster: { ...f.roster, [key]: value } }));
  }

  function updateMaxField(pos: Position, value: number) {
    setForm((f) => ({ ...f, maxPerPosition: { ...f.maxPerPosition, [pos]: value } }));
  }

  function handleSave() {
    updateLeagueConfig(form);
  }

  function readCsvFile(file: File, onRows: (rows: ReturnType<typeof parseCsvText>) => void) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const rows = parseCsvText(text);
        onRows(rows);
      } catch (err) {
        setStatus(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  }

  function handleMergeFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = sourceLabel.trim() || file.name.replace(/\.csv$/i, '') || 'Untitled Source';
    readCsvFile(file, (rows) => {
      const { updated, added, mergedDuplicates } = importCsvMerge(rows, label);
      let msg = `"${label}": updated ${updated} player(s), added ${added} new player(s).`;
      if (mergedDuplicates > 0) msg += ` Also merged ${mergedDuplicates} duplicate player(s) with mismatched suffixes.`;
      setStatus(msg);
    });
    e.target.value = '';
  }

  function handleReplaceFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = sourceLabel.trim() || file.name.replace(/\.csv$/i, '') || 'Untitled Source';
    readCsvFile(file, (rows) => {
      importCsvReplace(rows, label);
      setStatus(`Replaced pool with ${rows.length} players from "${label}".`);
    });
    e.target.value = '';
  }

  function handleExport() {
    const data = JSON.stringify({ config, players }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'draft_state.json';
    a.click();
  }

  const sourceCounts = new Map<string, number>();
  for (const p of players) for (const s of p.sources) sourceCounts.set(s.label, (sourceCounts.get(s.label) ?? 0) + 1);

  return (
    <div className="grid">
      <div>
        <div className="panel">
          <h2>League Settings</h2>
          <div className="row2">
            <div>
              <label>Number of Teams</label>
              <input type="number" min={4} max={20} value={form.teams}
                onChange={(e) => setForm((f) => ({ ...f, teams: +e.target.value }))} />
            </div>
            <div>
              <label>Your Draft Slot</label>
              <input type="number" min={1} max={20} value={form.slot}
                onChange={(e) => setForm((f) => ({ ...f, slot: +e.target.value }))} />
            </div>
          </div>

          <label>Roster — starting spots + bench</label>
          <div className="row4">
            {(['QB', 'RB', 'WR', 'TE'] as const).map((k) => (
              <div key={k}>
                <label style={{ marginTop: 0 }}>{k}</label>
                <input type="number" min={0} value={form.roster[k]} onChange={(e) => updateRosterField(k, +e.target.value)} />
              </div>
            ))}
          </div>
          <div className="row4" style={{ marginTop: 10 }}>
            <div><label style={{ marginTop: 0 }}>FLEX</label><input type="number" min={0} value={form.roster.FLEX} onChange={(e) => updateRosterField('FLEX', +e.target.value)} /></div>
            <div><label style={{ marginTop: 0 }}>DST</label><input type="number" min={0} value={form.roster.DST} onChange={(e) => updateRosterField('DST', +e.target.value)} /></div>
            <div><label style={{ marginTop: 0 }}>K</label><input type="number" min={0} value={form.roster.K} onChange={(e) => updateRosterField('K', +e.target.value)} /></div>
            <div><label style={{ marginTop: 0 }}>Bench</label><input type="number" min={0} value={form.roster.BENCH} onChange={(e) => updateRosterField('BENCH', +e.target.value)} /></div>
          </div>

          <label>Max Players Allowed Per Position (total on your roster)</label>
          <div className="row4">
            {(['QB', 'RB', 'WR', 'TE'] as const).map((pos) => (
              <div key={pos}>
                <label style={{ marginTop: 0 }}>Max {pos}</label>
                <input type="number" min={1} value={form.maxPerPosition[pos]} onChange={(e) => updateMaxField(pos, +e.target.value)} />
              </div>
            ))}
          </div>
          <div className="row4" style={{ marginTop: 10 }}>
            <div><label style={{ marginTop: 0 }}>Max DST</label><input type="number" min={1} value={form.maxPerPosition.DST} onChange={(e) => updateMaxField('DST', +e.target.value)} /></div>
            <div><label style={{ marginTop: 0 }}>Max K</label><input type="number" min={1} value={form.maxPerPosition.K} onChange={(e) => updateMaxField('K', +e.target.value)} /></div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleSave}>Save &amp; Build Board</button>
            <button className="ghost" onClick={() => { if (confirm('Reset all draft picks? Your league settings stay.')) resetDraft(); }}>Reset Draft</button>
          </div>
          <p className="footer-note">Scoring is fixed to full PPR (1 pt/reception). Changing team/roster settings recalculates replacement-level value for every player.</p>
        </div>

        <div className="panel">
          <h2>Import Your Own Rankings</h2>
          <p className="footer-note" style={{ marginTop: 0 }}>
            Paste CSV columns: <b>name,pos,team,bye,proj_pts,adp</b> (proj_pts and adp optional).
          </p>
          <label>Source Name (e.g. "ESPN", "Sleeper", "FantasyPros")</label>
          <input type="text" placeholder="Untitled Source" value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
          <div className="import-row">
            <input ref={mergeFileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleMergeFile} />
            <input ref={replaceFileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleReplaceFile} />
            <button className="ghost small" onClick={() => mergeFileRef.current?.click()}>Add/Average CSV Into Pool</button>
            <button className="ghost small" onClick={() => replaceFileRef.current?.click()}>Replace Entire Pool</button>
            <button className="ghost small" onClick={handleExport}>Export Draft (JSON)</button>
          </div>
          <p className="footer-note" style={{ marginTop: 6 }}>
            <b>Add/Average</b> keeps every existing player and treats each import as one more opinion on that player's value — projected points and ADP become the average across every source you've given them. Importing the same source name again replaces that source's numbers instead of double-counting. <b>Replace Entire Pool</b> wipes everything and starts fresh — use only for a complete alternate list.
          </p>
          {status && <p className="footer-note">{status}</p>}
        </div>
      </div>

      <div className="panel" style={{ height: 'fit-content' }}>
        <h2>Sources Feeding Your Averages</h2>
        <p className="footer-note" style={{ marginTop: 0 }}>
          Remove a source to take its numbers back out — the average recalculates from whatever's left. This doesn't touch draft picks.
        </p>
        <div>
          {sourceCounts.size === 0 ? (
            <div className="footer-note">No sources loaded yet.</div>
          ) : (
            Array.from(sourceCounts.entries()).map(([label, count]) => (
              <div key={label} className="roster-slot">
                <span><span className="pill">{label}</span> {count} player(s)</span>
                {label !== 'Built-in estimate' && (
                  <button className="ghost small" onClick={() => {
                    if (confirm(`Remove "${label}" from every player it touched?`)) {
                      removeSource(label);
                      setStatus(`Removed "${label}". Projections and ADP now reflect the remaining sources.`);
                    }
                  }}>Remove</button>
                )}
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="ghost small" onClick={() => {
            if (confirm('Reset every player back to just the built-in estimate?')) {
              resetAllSources();
              setStatus('Reset complete — all players back to the built-in estimate only.');
            }
          }}>Reset All — Back to Built-in Only</button>
        </div>
      </div>
    </div>
  );
}
