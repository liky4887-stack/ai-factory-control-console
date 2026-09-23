import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FactoryProvider } from './store/FactoryContext';
import { MobileTabBar, type MobileTab } from './components/MobileTabBar';
import { SovereignCommand } from './screens/SovereignCommand';
import { TruthLedger } from './screens/TruthLedger';
import { OmegaSwitch } from './screens/OmegaSwitch';
import { AgentSwarm } from './screens/AgentSwarm';
import { SystemLogs } from './screens/SystemLogs';
import { theme } from './theme';

function Shell() {
  const [active, setActive] = useState<MobileTab>('overview');
  const navigate = (key: string) => setActive(key as MobileTab);

  const renderScreen = () => {
    switch (active) {
      case 'overview': return <SovereignCommand navigation={{ navigate }} />;
      case 'ledger': return <TruthLedger />;
      case 'omega': return <OmegaSwitch />;
      case 'swarm': return <AgentSwarm />;
      case 'logs': return <SystemLogs />;
      default: return <SovereignCommand navigation={{ navigate }} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.content}>
        {renderScreen()}
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
});
