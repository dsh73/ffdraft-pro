import { OnClockPanel } from './OnClockPanel';
import { PlayerTable } from './PlayerTable';
import { MyTeamPanel } from './MyTeamPanel';
import { PositionScarcityPanel } from './PositionScarcityPanel';
import { RecentPicksPanel } from './RecentPicksPanel';
import { HiddenTeamsPanel } from './HiddenTeamsPanel';
import { RosterCapsPanel } from './RosterCapsPanel';

export function DraftBoardTab() {
  return (
    <div className="grid">
      <div>
        <OnClockPanel />
        <PlayerTable />
      </div>
      <div className="panel" style={{ height: 'fit-content' }}>
        <MyTeamPanel />
        <RosterCapsPanel />
        <PositionScarcityPanel />
        <RecentPicksPanel />
        <HiddenTeamsPanel />
      </div>
    </div>
  );
}
