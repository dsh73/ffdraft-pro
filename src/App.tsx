import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TabNav, type TabName } from './components/TabNav';
import { SetupTab } from './components/tabs/SetupTab';
import { DraftBoardTab } from './components/tabs/DraftBoardTab';
import { MyTeamTab } from './components/tabs/MyTeamTab';
import { SeasonTab } from './components/tabs/SeasonTab';
import { useDraftStore } from './state/useDraftStore';

export default function App() {
  const [tab, setTab] = useState<TabName>('setup');
  const ensureSeedLoaded = useDraftStore((s) => s.ensureSeedLoaded);

  useEffect(() => {
    ensureSeedLoaded();
  }, [ensureSeedLoaded]);

  return (
    <>
      <Header />
      <TabNav active={tab} onChange={setTab} />
      <div className="wrap">
        {tab === 'setup' && <SetupTab />}
        {tab === 'board' && <DraftBoardTab />}
        {tab === 'team' && <MyTeamTab />}
        {tab === 'season' && <SeasonTab />}

        <p className="footer-note">
          Seed rankings are approximate 2026 preseason consensus values for a quick start — import a CSV from your
          preferred ranking source before your real draft for best accuracy. VBD (Value Based Drafting) = a
          player's projected points minus the expected points of a replacement-level player at that position,
          given your league's size and starting roster requirements.
        </p>
      </div>
    </>
  );
}
