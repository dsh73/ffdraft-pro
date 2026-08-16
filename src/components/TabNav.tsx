export type TabName = 'setup' | 'board' | 'team' | 'season';

interface TabNavProps {
  active: TabName;
  onChange: (tab: TabName) => void;
}

const TABS: { key: TabName; label: string }[] = [
  { key: 'setup', label: 'Setup' },
  { key: 'board', label: 'Draft Board' },
  { key: 'team', label: 'My Team' },
  { key: 'season', label: 'Season' },
];

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div className="tabs">
      {TABS.map((tab) => (
        <div
          key={tab.key}
          className={`tab ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}
