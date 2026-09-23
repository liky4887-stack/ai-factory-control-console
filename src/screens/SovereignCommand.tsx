import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { GlassCard } from '../components/GlassCard';
import { MetricTile } from '../components/MetricTile';
import { StatusChip } from '../components/StatusChip';
import { theme } from '../theme';

export function SovereignCommand({ navigation }: { navigation: any }) {
  const { projects, agents, ledger, error } = useFactory();
  const activeAgents = agents.filter((a) => a.status === 'busy');
  const idleAgents = agents.filter((a) => a.status === 'idle');
  const degradedAgents = agents.filter((a) => a.status === 'offline' || a.status === 'paused');

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.h1}>Sovereign Command</Text>
      <Text style={s.sub}>Mission overview and system integrity</Text>

      <View style={s.metrics}>
        <MetricTile label="Projects" value={projects.length} accent={theme.cyan} detail="active" />
        <MetricTile label="Agents" value={agents.length} accent={theme.blue} detail={`${activeAgents.length} running`} />
      </View>
      <View style={s.metrics}>
        <MetricTile label="Ledger" value={ledger.length} accent={theme.purple} detail="events" />
        <MetricTile label="Degraded" value={degradedAgents.length} accent={degradedAgents.length > 0 ? theme.red : theme.green} detail="agents" />
      </View>

      <GlassCard style={s.card} accent={theme.cyan}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>System Status</Text>
          <StatusChip label={error ? 'Offline' : 'Online'} status={error ? 'error' : 'success'} />
        </View>
        <Text style={s.cardBody}>{error ? `Bridge error: ${error}` : 'All systems nominal. Bridge connected.'}</Text>
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
  scroll: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 18 },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: { marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  cardBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  rowTitle: { color: theme.textSecondary, fontSize: 12, flex: 1, marginLeft: 8 },
  empty: { color: theme.textMuted, fontSize: 13, paddingVertical: 8 },
});
