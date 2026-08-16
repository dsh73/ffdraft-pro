import { useMemo, useState } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';

export function HiddenTeamsPanel() {
  const players = useDraftStore((s) => s.players);
  const hiddenTeams = useDraftStore((s) => s.config.hiddenTeams);
  const hideTeam = useDraftStore((s) => s.hideTeam);
  const unhideTeam = useDraftStore((s) => s.unhideTeam);

  const allTeams = useMemo(
    () => Array.from(new Set(players.map((p) => p.team).filter(Boolean))).sort(),
    [players],
  );
  const selectableTeams = allTeams.filter((t) => !hiddenTeams.includes(t));
  const [selected, setSelected] = useState('');

  const currentSelection = selectableTeams.includes(selected) ? selected : (selectableTeams[0] ?? '');

  return (
    <>
      <h2 style={{ marginTop: 20 }}>Hidden Teams</h2>
      <p className="footer-note" style={{ marginTop: 0 }}>
        Players from a hidden team are removed from the board and recommendations entirely.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <select style={{ flex: 1 }} value={currentSelection} onChange={(e) => setSelected(e.target.value)}>
          {selectableTeams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="small" onClick={() => currentSelection && hideTeam(currentSelection)}>Hide</button>
      </div>
      <div style={{ marginTop: 10 }}>
        {hiddenTeams.length === 0
          ? <div className="footer-note" style={{ marginTop: 0 }}>No teams hidden.</div>
          : hiddenTeams.map((t) => (
            <div className="roster-slot" key={t}>
              <span>{t}</span>
              <button className="ghost small" onClick={() => unhideTeam(t)}>Unhide</button>
            </div>
          ))}
      </div>
    </>
  );
}
