import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FactoryProvider } from './store/FactoryContext';
import { MobileTabBar, type MobileTab } from './components/MobileTabBar';
import { UniversalAnchor } from './components/UniversalAnchor';
import { SovereignCommand } from './screens/SovereignCommand';
import { CreatorWorkspace } from './screens/CreatorWorkspace';
import { GodMode } from './screens/GodMode';
import { SystemPower } from './screens/SystemPower';
import { MysticRealm } from './screens/MysticRealm';
import { TruthLedger } from './screens/TruthLedger';
import { OmegaSwitch } from './screens/OmegaSwitch';
import { AgentSwarm } from './screens/AgentSwarm';
import { SystemLogs } from './screens/SystemLogs';
import { theme } from './theme';

function Shell() {
  const [active, setActive] = useState<MobileTab>('command');
  const navigate = (key: string) => {
    const tabMap: Record<string, MobileTab> = {
      command: 'command',
      creator: 'creator',
      'new-project': 'creator',
      'launch-swarm': 'command',
      'omega-switch': 'command',
      'void-forge': 'mystic',
      'chaos-engine': 'godmode',
      'soul-sync': 'mystic',
    };
    setActive(tabMap[key] ?? 'command');
  };

  const renderScreen = () => {
    switch (active) {
      case 'command': return <SovereignCommand navigation={{ navigate }} />;
      case 'creator': return <CreatorWorkspace />;
      case 'godmode': return <GodMode />;
      case 'system': return <SystemPower />;
      case 'mystic': return <MysticRealm />;
      default: return <SovereignCommand navigation={{ navigate }} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {renderScreen()}
      </View>
      <View style={styles.anchorWrap}>
        <UniversalAnchor />
      </View>
      <MobileTabBar active={active} onChange={setActive} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FactoryProvider>
        <StatusBar style="light" />
        <Shell />
      </FactoryProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    flex: 1,
  },
  anchorWrap: {
    position: 'absolute',
    bottom: 64,
    right: 16,
    zIndex: 100,
  },
});
