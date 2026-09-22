import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { api } from '../services/api';
import { SectionHeader } from '../components/SectionHeader';
import { PillBadge } from '../components/PillBadge';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusIndicator } from '../components/StatusIndicator';
import type { Agent as AgentType } from '../types';

const STATUS_ORDER = ['busy', 'idle', 'paused', 'offline'] as const;

const STATUS_VARIANT: Record<string, string> = {
  busy: '#10B981',
  idle: '#9AA1AE',
  paused: '#6366F1',
  offline: '#EF4444',
};

export function AgentSwarm() {
  const { agents, activeProjectId, loadAgents } = useFactory();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<AgentType | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; agent: AgentType } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgents();
    setRefreshing(false);
  }, [loadAgents]);

  const filtered = agents.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.role.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = STATUS_ORDER.map((s) => ({
    status: s,
    items: filtered.filter((a) => a.status === s),
  })).filter((g) => g.items.length > 0);

  const handleAction = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.action === 'pause') await api.pauseAgent(confirm.agent.id);
      else await api.resumeAgent(confirm.agent.id);
      await loadAgents();
    } catch {
      // silent
    }
    setBusy(false);
    setConfirm(null);
  };

  if (selected) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={styles.backLink}>Back to swarm</Text>
        </Pressable>
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailName}>{selected.name}</Text>
            <PillBadge label={selected.status} color={STATUS_VARIANT[selected.status] ?? '#9AA1AE'} />
          </View>
          <View style={styles.detailMeta}>
            <PillBadge label={selected.role.replace('_', ' ')} color="#6366F1" />
            <Text style={styles.detailText}>Skills: {selected.skills.join(', ') || 'none'}</Text>
          </View>
          <Text style={styles.detailLabel}>Persona</Text>
          <Text style={styles.detailBody}>{selected.persona}</Text>
          {selected.currentTaskId ? (
            <>
              <Text style={styles.detailLabel}>Current Task</Text>
              <Text style={styles.detailBody}>{selected.currentTaskId}</Text>
            </>
          ) : null}
          <Text style={styles.detailLabel}>Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{selected.stats.tasksCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{selected.stats.tasksFailed}</Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{(selected.stats.avgTaskDurationMs / 1000).toFixed(1)}s</Text>
              <Text style={styles.statLabel}>Avg Time</Text>
            </View>
          </View>
        </View>
        <View style={styles.actionRow}>
          {selected.status === 'paused' ? (
            <Pressable style={styles.actionBtn} onPress={() => setConfirm({ action: 'resume', agent: selected })}>
              <Text style={styles.actionBtnText}>Resume</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.actionBtn} onPress={() => setConfirm({ action: 'pause', agent: selected })}>
              <Text style={styles.actionBtnText}>Pause</Text>
            </Pressable>
          )}
        </View>
        <ConfirmModal
          visible={!!confirm}
          title={`Confirm ${confirm?.action ?? ''}`}
          message={`Are you sure you want to ${confirm?.action} agent ${confirm?.agent.name}?`}
          confirmLabel={confirm?.action ? confirm.action.charAt(0).toUpperCase() + confirm.action.slice(1) : ''}
          destructive={confirm?.action === 'pause'}
          onConfirm={handleAction}
          onCancel={() => setConfirm(null)}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search agents..."
          style={styles.searchInput}
          placeholderTextColor="#9AA1AE"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View style={styles.filterRow}>
          <Pressable onPress={() => setFilterStatus('all')} style={[styles.filterPill, filterStatus === 'all' && styles.filterPillActive]}>
            <Text style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}>All</Text>
          </Pressable>
          {STATUS_ORDER.map((s) => (
            <Pressable key={s} onPress={() => setFilterStatus(s)} style={[styles.filterPill, filterStatus === s && styles.filterPillActive]}>
              <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>
        {grouped.map((group) => (
          <View key={group.status}>
            <SectionHeader title={group.status.charAt(0).toUpperCase() + group.status.slice(1)} />
            {group.items.map((agent) => (
              <Pressable key={agent.id} onPress={() => setSelected(agent)} style={styles.agentCard}>
                <View style={styles.agentHeader}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <PillBadge label={agent.status} color={STATUS_VARIANT[agent.status] ?? '#9AA1AE'} />
                </View>
                <Text style={styles.agentRole}>{agent.role.replace('_', ' ')}</Text>
                <Text style={styles.agentTask} numberOfLines={1}>
                  {agent.currentTaskId ? `Task: ${agent.currentTaskId}` : 'No active task'}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No agents match your filters.</Text>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16 },
  searchContainer: { padding: 16, paddingBottom: 0 },
  searchInput: { height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', paddingHorizontal: 14, fontSize: 14, color: '#0B0D12' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4' },
  filterPillActive: { backgroundColor: '#0B0D12' },
  filterText: { fontSize: 12, fontWeight: '500', color: '#5C6472', textTransform: 'capitalize' },
  filterTextActive: { color: '#FFFFFF' },
  agentCard: { padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 8 },
  agentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  agentName: { fontSize: 15, fontWeight: '600', color: '#0B0D12' },
  agentRole: { fontSize: 12, color: '#5C6472', textTransform: 'capitalize' },
  agentTask: { fontSize: 12, color: '#9AA1AE', marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9AA1AE' },
  backLink: { fontSize: 13, color: '#6366F1', fontWeight: '600', marginBottom: 16 },
  detailCard: { padding: 20, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailName: { fontSize: 18, fontWeight: '700', color: '#0B0D12' },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailText: { fontSize: 13, color: '#5C6472' },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#9AA1AE', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  detailBody: { fontSize: 14, color: '#0B0D12', lineHeight: 20 },
  statsGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  statBox: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F7F8FA', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0B0D12' },
  statLabel: { fontSize: 11, color: '#9AA1AE', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
