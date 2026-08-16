import { LineupPanel } from './LineupPanel';
import { WaiverWirePanel } from './WaiverWirePanel';
import { RosterPanel } from './RosterPanel';

export function SeasonTab() {
  return (
    <div className="grid">
      <div>
        <LineupPanel />
        <WaiverWirePanel />
      </div>
      <RosterPanel />
    </div>
  );
}
