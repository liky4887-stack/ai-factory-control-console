import { useState, useCallback } from 'react';
import { LayoutDashboard, FolderTree, Users, BookMarked, Power } from 'lucide-react';
import { FactoryProvider, useFactory } from '@/store/FactoryContext';
import { CEODashboard } from '@/screens/CEODashboard';
import { GodView } from '@/screens/GodView';
import { AgentSwarm } from '@/screens/AgentSwarm';
import { TruthLedger } from '@/screens/TruthLedger';
import { OmegaSwitch } from '@/screens/OmegaSwitch';

type TabId = 'dashboard' | 'godview' | 'swarm' | 'ledger' | 'omega';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'godview', label: 'God View', icon: FolderTree },
  { id: 'swarm', label: 'Swarm', icon: Users },
  { id: 'ledger', label: 'Ledger', icon: BookMarked },
  { id: 'omega', label: 'Omega', icon: Power },
];

function OfflineBanner() {
  const { online } = useFactory();
  if (online) return null;
  return (
    <div className="bg-danger/10 border-b border-danger/20 px-4 py-2 text-center">
      <p className="text-[13px] text-danger font-medium">
        Cannot reach Termux bridge at 127.0.0.1:8787 — showing cached data
      </p>
    </div>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const navigate = useCallback((tab: string) => setActiveTab(tab as TabId), []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard': return <CEODashboard onNavigate={navigate} />;
      case 'godview': return <GodView />;
      case 'swarm': return <AgentSwarm />;
      case 'ledger': return <TruthLedger />;
      case 'omega': return <OmegaSwitch />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <OfflineBanner />
      <div className="flex-1 overflow-hidden">{renderScreen()}</div>
      <nav className="flex items-center justify-around bg-surface border-t border-border px-1 py-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isOmega = tab.id === 'omega';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors ${
                isActive
                  ? isOmega
                    ? 'text-omega'
                    : 'text-accent'
                  : 'text-textTertiary hover:text-textSecondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function App() {
  return (
    <FactoryProvider>
      <AppContent />
    </FactoryProvider>
  );
}

export default App;
