import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FactoryProvider } from './store/FactoryContext';
import { CEODashboard } from './screens/CEODashboard';
import { GodView } from './screens/GodView';
import { AgentSwarm } from './screens/AgentSwarm';
import { TruthLedger } from './screens/TruthLedger';
import { OmegaSwitch } from './screens/OmegaSwitch';

const Tab = createBottomTabNavigator();

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#F7F8FA',
    card: '#FFFFFF',
    text: '#0B0D12',
    border: '#EEF0F4',
    primary: '#6366F1',
    notification: '#6366F1',
  },
};

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return <Ionicons name={name as any} size={size} color={color} />;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9AA1AE',
        tabBarStyle: { paddingBottom: 4, height: 56 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={(props: any) => <CEODashboard navigation={props.navigation} />}
        options={{ tabBarIcon: ({ color, size }) => <TabIcon name="grid-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="GodView"
        component={GodView}
        options={{ tabBarLabel: 'God View', tabBarIcon: ({ color, size }) => <TabIcon name="folder-tree-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Swarm"
        component={AgentSwarm}
        options={{ tabBarIcon: ({ color, size }) => <TabIcon name="people-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Ledger"
        component={TruthLedger}
        options={{ tabBarIcon: ({ color, size }) => <TabIcon name="book-outline" color={color} size={size} /> }}
      />
      <Tab.Screen
        name="Omega"
        component={OmegaSwitch}
        options={{ tabBarIcon: ({ color, size }) => <TabIcon name="flash-outline" color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FactoryProvider>
        <NavigationContainer theme={NAV_THEME}>
          <StatusBar style="dark" />
          <Tabs />
        </NavigationContainer>
      </FactoryProvider>
    </SafeAreaProvider>
  );
}
