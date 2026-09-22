import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { StatCard } from '../components/StatCard';
import { SectionHeader } from '../components/SectionHeader';
import { StatusIndicator } from '../components/StatusIndicator';
import { IncidentRow } from '../components/IncidentRow';
import type { LedgerEntry } from '../types';

export function CEODashboard({ navigation }: { navigation: any }) {
  const { projects, activeProjectId, agents, ledger, loading, error, refreshAll } = useFactory();
  const [refreshing, setRefreshing] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activeAgents = agents.filter((a) => a.status === 'busy' || a.status === 'idle');
  const recentIncidents = ledger.slice(0, 5);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CEO Dashboard</Text>
          <Text style={styles.subtitle}>
            {activeProject ? activeProject.name : 'All projects'}
          </Text>
        </View>
        <StatusIndicator status={error ? 'disconnected' : 'connected'} label={error ? 'Offline' : 'Online'} />
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Bridge: {error}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <StatCard label="Projects" value={projects.length} accent="#6366F1" />
        <StatCard label="Active Agents" value={activeAgents.length} accent="#10B981" />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Ledger Entries" value={ledger.length} accent="#8B5CF6" />
        <StatCard label="Tasks" value={agents.filter((a) => a.currentTaskId).length} accent="#F59E0B" />
      </View>

      <SectionHeader
        title="Recent Ledger"
        action={{ label: 'View all', onPress: () => navigation.navigate('Ledger') }}
      />
      {recentIncidents.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No ledger entries.</Text>
        </View>
      ) : (
        recentIncidents.map((entry: LedgerEntry) => (
          <IncidentRow
            key={entry.id}
            kind={entry.kind}
            title={entry.title}
            meta={entry.body.slice(0, 80)}
            timestamp={entry.createdAt}
          />
        ))
      )}

      <SectionHeader
        title="Agents"
        action={{ label: 'View swarm', onPress: () => navigation.navigate('Swarm') }}
      />
      {agents.slice(0, 4).map((agent) => (
        <View key={agent.id} style={styles.agentRow}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentRole}>{agent.role.replace('_', ' ')}</Text>
          </View>
          <StatusIndicator status={agent.status} />
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0B0D12' },
  subtitle: { fontSize: 13, color: '#5C6472', marginTop: 2 },
  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#EF4444' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  empty: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9AA1AE' },
  agentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 8 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 14, fontWeight: '600', color: '#0B0D12' },
  agentRole: { fontSize: 12, color: '#5C6472', marginTop: 2, textTransform: 'capitalize' },
});
