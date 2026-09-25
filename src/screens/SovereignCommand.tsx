/**
 * screens/SovereignCommand.tsx
 * Command tab root. Sub-navigation surfaces the four operational views
 * (Ledger, Omega, Swarm, Logs) that were orphaned by the 5-tab
 * restructure. Overview holds the original mission-control content.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { GlassCard } from '../components/GlassCard';
import { MetricTile } from '../components/MetricTile';
import { StatusChip } from '../components/StatusChip';
import { ModeToggle, type AppMode } from '../components/ModeToggle';
import { SubNav } from '../components/SubNav';
import { NebulaBackground } from '../components/NebulaBackground';
import { theme } from '../theme';

// Operational views (each was already wired to the backend)
import { TruthLedger } from './TruthLedger';
import { OmegaSwitch } from './OmegaSwitch';
import { AgentSwarm } from './AgentSwarm';
import { SystemLogs } from './SystemLogs';
import { EventsPanel } from './EventsPanel';

const SUB_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'ledger',   label: 'Ledger' },
  { key: 'omega',    label: 'Omega' },
  { key: 'swarm',    label: 'Swarm' },
  { key: 'logs',     label: 'Logs' },
  { key: 'events',   label: 'Events' },
];

const QUICK_ACTIONS = [
  { id: 'new-project',  label: 'New Project',  icon: '✚', accent: theme.cyan },
  { id: 'launch-swarm', label: 'Launch Swarm', icon: '✣', accent: theme.blue },
  { id: 'omega-switch', label: 'Omega Switch', icon: '◈', accent: theme.red },
  { id: 'void-forge',   label: 'Void Forge',   icon: '◉', accent: theme.purple },
  { id: 'chaos-engine', label: 'Chaos Engine', icon: '⚡', accent: theme.amber },
  { id: 'soul-sync',    label: 'Soul Sync',    icon: '☯', accent: theme.gold },
];

export function SovereignCommand({ navigation }: { navigation: any }) {
  const [subTab, setSubTab] = useState('overview');

  return (
    <View style={s.root}>
      <NebulaBackground />
      <View style={s.subNavWrap}>
        <SubNav tabs={SUB_TABS} active={subTab} onChange={setSubTab} />
      </View>

      <View style={s.body}>
        {subTab === 'overview' && <OverviewPane navigation={navigation} />}
        {subTab === 'ledger'   && <TruthLedger />}
        {subTab === 'omega'    && <OmegaSwitch />}
        {subTab === 'swarm'    && <AgentSwarm />}
        {subTab === 'logs'     && <SystemLogs />}
        {subTab === 'events'   && <EventsPanel />}
      </View>
    </View>
  );
}

// ── Overview pane (extracted from the original screen) ──────────────
function OverviewPane({ navigation }: { navigation: any }) {
  const { projects, agents, ledger, error } = useFactory();
  const [mode, setMode] = useState<AppMode>('commander');

  const activeAgents = agents.filter((a) => a.status === 'busy');
  const degradedAgents = agents.filter((a) => a.status === 'offline' || a.status === 'paused');

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.h1}>Sovereign Command</Text>
          <Text style={s.sub}>Mission control and system integrity</Text>
        </View>
        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      <View style={s.metrics}>
        <MetricTile label="Projects" value={projects.length} accent={theme.cyan} detail="active" />
        <MetricTile label="Agents" value={agents.length} accent={theme.blue} detail={`${activeAgents.length} running`} />
      </View>
      <View style={s.metrics}>
        <MetricTile label="Ledger" value={ledger.length} accent={theme.purple} detail="events" />
        <MetricTile label="Degraded" value={degradedAgents.length} accent={degradedAgents.length > 0 ? theme.red : theme.green} detail="agents" />
      </View>

      <Text style={s.sectionLabel}>Quick Actions</Text>
      <View style={s.actionGrid} testID="quick-actions-grid">
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.id}
            testID={`quick-action-${a.id}`}
            onPress={() => navigation?.navigate?.(a.id)}
            style={({ pressed }) => [s.actionCard, pressed && s.pressed]}
          >
            <GlassCard style={s.actionInner} accent={a.accent}>
              <Text style={[s.actionIcon, { color: a.accent }]}>{a.icon}</Text>
              <Text style={s.actionLabel}>{a.label}</Text>
            </GlassCard>
          </Pressable>
        ))}
      </View>

      <GlassCard style={s.card} accent={theme.cyan}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>System Status</Text>
          <StatusChip label={error ? 'Offline' : 'Online'} status={error ? 'error' : 'success'} />
        </View>
        <Text style={s.cardBody}>
          {error ? `Bridge error: ${error}` : 'All systems nominal. Bridge connected. Sovereign layer active.'}
        </Text>
      </GlassCard>

      <GlassCard style={s.card} accent={theme.purple}>
        <Text style={s.cardTitle}>Recent Ledger Events</Text>
        {ledger.length === 0 ? (
          <Text style={s.empty}>No events recorded.</Text>
        ) : (
          ledger.slice(0, 3).map((e) => (
            <View key={e.id} style={s.row}>
              <StatusChip label={e.kind.replace('_', ' ')} status="pending" />
              <Text style={s.rowTitle} numberOfLines={1}>{e.title}</Text>
            </View>
          ))
        )}
      </GlassCard>

      <GlassCard style={s.card} accent={theme.blue}>
        <Text style={s.cardTitle}>Agent Swarm</Text>
        {agents.length === 0 ? (
          <Text style={s.empty}>No agents detected.</Text>
        ) : (
          agents.slice(0, 3).map((a) => (
            <View key={a.id} style={s.row}>
              <Text style={s.rowTitle}>{a.name}</Text>
              <StatusChip label={a.status} status={a.status === 'busy' ? 'running' : a.status} />
            </View>
          ))
        )}
      </GlassCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  subNavWrap: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  body: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 8 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 8 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: { flex: 1, minWidth: 100 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  actionInner: { alignItems: 'center', padding: 14, minHeight: 90 },
  actionIcon: { fontSize: 22, marginBottom: 6 },
  actionLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  card: { marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  cardBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  rowTitle: { color: theme.textSecondary, fontSize: 12, flex: 1, marginLeft: 8 },
  empty: { color: theme.textMuted, fontSize: 13, paddingVertical: 8 },
});
