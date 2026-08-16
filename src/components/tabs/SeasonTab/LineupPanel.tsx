import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useDraftStore } from '../../../state/useDraftStore';
import { getSlotDefs, getWeekProj, lineupTotal, benchPlayers } from '../../../lib/lineupOptimizer';
import { isOnBye } from '../../../lib/byeWeeks';
import { Badge } from '../../shared/Badge';

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

export function LineupPanel() {
  const players = useDraftStore((s) => s.players);
  const config = useDraftStore((s) => s.config);
  const currentWeek = useDraftStore((s) => s.currentWeek);
  const weeklyLineups = useDraftStore((s) => s.weeklyLineups);
  const setCurrentWeek = useDraftStore((s) => s.setCurrentWeek);
  const autoOptimizeLineup = useDraftStore((s) => s.autoOptimizeLineup);
  const setLineupSlot = useDraftStore((s) => s.setLineupSlot);
  const importWeeklyProjCsv = useDraftStore((s) => s.importWeeklyProjCsv);

  const [projStatus, setProjStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const mine = useMemo(() => players.filter((p) => p.status === 'ME'), [players]);
  const slots = useMemo(() => getSlotDefs(config.roster), [config.roster]);
  const lineup = weeklyLineups[currentWeek] ?? slots.map(() => null);

  const onByeThisWeek = mine.filter((p) => isOnBye(p, currentWeek));
  const { total, usingRealData } = lineupTotal(lineup, mine, currentWeek);
  const bench = benchPlayers(lineup, mine);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const iName = header.indexOf('name');
        const iProj = header.indexOf('proj_pts');
        if (iName < 0 || iProj < 0) throw new Error('CSV needs name,proj_pts columns');
        const rows = lines.slice(1).map((l) => {
          const c = l.split(',');
          return { name: c[iName].trim(), proj_pts: c[iProj].trim() };
        });
        const { matched, unmatched } = importWeeklyProjCsv(rows, currentWeek);
        setProjStatus(`Week ${currentWeek}: matched ${matched} player(s)${unmatched ? `, ${unmatched} name(s) not found` : ''}.`);
      } catch (err) {
        setProjStatus(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Week {currentWeek} Lineup</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ margin: 0, textTransform: 'none', fontSize: 12 }}>Week</label>
          <select style={{ width: 80 }} value={currentWeek} onChange={(e) => setCurrentWeek(+e.target.value)}>
            {WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
          <button className="small" onClick={autoOptimizeLineup}>Auto-Optimize Lineup</button>
        </div>
      </div>

      <div className="import-row" style={{ marginTop: 10 }}>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        <button className="ghost small" onClick={() => fileRef.current?.click()}>Import Week {currentWeek} Projections CSV</button>
        {projStatus && <span className="footer-note" style={{ margin: 0 }}>{projStatus}</span>}
      </div>
      <p className="footer-note" style={{ marginTop: 4 }}>
        Without this, the total below is your season-long average, repeated every week. Import a CSV (columns: name,proj_pts) built from real Week {currentWeek} projections — e.g. a screenshot of ESPN's weekly roster "PROJ" column.
      </p>

      {onByeThisWeek.length > 0 ? (
        <div className="rec-row" style={{ borderColor: 'var(--red)', marginTop: 8 }}>
          <span>⚠ {onByeThisWeek.length} player(s) on bye this week: {onByeThisWeek.map((p) => p.name).join(', ')}</span>
        </div>
      ) : (
        <div className="footer-note" style={{ marginTop: 8 }}>No bye-week conflicts on your roster this week.</div>
      )}

      <div style={{ marginTop: 12 }}>
        {slots.map((slot, i) => {
          const assignedId = lineup[i];
          const assignedP = assignedId !== null ? mine.find((p) => p.id === assignedId) ?? null : null;
          const byeConflict = assignedP ? isOnBye(assignedP, currentWeek) : false;
          const wp = assignedP ? getWeekProj(assignedP, currentWeek) : null;
          const usedElsewhere = new Set(lineup.filter((id): id is number => id !== null));
          const eligible = mine.filter((p) => slot.eligible.includes(p.pos));

          return (
            <div className={`roster-slot ${assignedP ? 'filled' : 'empty'}`} key={i}>
              <span>
                <span className="pill">{slot.label}</span>
                <select
                  style={{ width: 'auto', display: 'inline-block', padding: '4px 8px', fontSize: 13, marginLeft: 6 }}
                  value={assignedId ?? ''}
                  onChange={(e) => setLineupSlot(i, e.target.value === '' ? null : +e.target.value)}
                >
                  <option value="">— Empty —</option>
                  {eligible.map((p) => {
                    const byeTag = isOnBye(p, currentWeek) ? ' (BYE)' : '';
                    const elsewhere = usedElsewhere.has(p.id) && p.id !== assignedId ? ' — in another slot' : '';
                    return <option key={p.id} value={p.id}>{p.name}{byeTag}{elsewhere}</option>;
                  })}
                </select>
                {byeConflict && <span className="pill" style={{ color: 'var(--red)', borderColor: 'var(--red)', marginLeft: 6 }}>BYE — 0 pts</span>}
                {assignedP && !byeConflict && wp && (
                  <span className="pill" style={{ marginLeft: 6, color: wp.isReal ? 'var(--green)' : undefined, borderColor: wp.isReal ? 'var(--green)' : undefined }}>
                    {wp.isReal ? `Week ${currentWeek} proj` : 'season avg'}
                  </span>
                )}
              </span>
              <span className="fill">{assignedP && !byeConflict && wp ? `${wp.value} pts` : ''}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontFamily: 'var(--mono)', color: 'var(--amber)', fontSize: 15 }}>
        {usingRealData
          ? `Projected Week ${currentWeek} lineup total: ${total.toFixed(1)} pts (mix of real weekly data and season-avg fallback where not yet imported)`
          : `Projected lineup total: ${total.toFixed(1)} pts — this is your season-long average repeated, not real Week ${currentWeek} data. Import weekly projections above for an actual week-specific number.`}
      </div>

      <h2 style={{ marginTop: 20 }}>Bench This Week</h2>
      {bench.length === 0
        ? <div className="roster-slot empty"><span className="name">Everyone on your roster is in the starting lineup.</span></div>
        : bench.map((p) => {
          const bye = isOnBye(p, currentWeek);
          return (
            <div className="roster-slot filled" key={p.id}>
              <span>
                <Badge pos={p.pos} /> <span className="name">{p.name}</span>{' '}
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>{p.team}{p.bye ? ` · Bye ${p.bye}` : ''}</span>{' '}
                {bye && <span className="pill" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>BYE</span>}
              </span>
              <span className="fill">{p.proj} pts</span>
            </div>
          );
        })}
    </div>
  );
}
