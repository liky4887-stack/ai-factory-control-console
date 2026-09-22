import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  RefreshControl, StyleSheet,
} from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { SectionHeader } from '../components/SectionHeader';
import { PillBadge } from '../components/PillBadge';
import type { LedgerEntry, LedgerKind } from '../types';

const KIND_COLORS: Record<string, string> = {
  decision: '#6366F1',
  schema_change: '#8B5CF6',
  prompt_change: '#8B5CF6',
  deploy: '#3B82F6',
  bug: '#EF4444',
  pivot: '#F59E0B',
  omega_action: '#DC2626',
  compliance_review: '#8B5CF6',
  skill_install: '#10B981',
  skill_remove: '#F59E0B',
  agent_action: '#10B981',
};

const ALL_KINDS: (LedgerKind | 'all')[] = [
  'all', 'decision', 'schema_change', 'prompt_change', 'deploy',
  'bug', 'pivot', 'omega_action', 'compliance_review',
  'skill_install', 'skill_remove', 'agent_action',
];

export function TruthLedger() {
  const { ledger, activeProjectId, loadLedger } = useFactory();
  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState<LedgerKind | 'all'>('all');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLedger(activeProjectId ?? undefined);
    setRefreshing(false);
  }, [loadLedger, activeProjectId]);

  const filtered = ledger.filter((e) => {
    if (filterKind !== 'all' && e.kind !== filterKind) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (selected) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={styles.backLink}>Back to ledger</Text>
        </Pressable>
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <PillBadge label={selected.kind.replace('_', ' ')} color={KIND_COLORS[selected.kind] ?? '#9AA1AE'} />
            <Text style={styles.detailTime}>{new Date(selected.createdAt).toLocaleString()}</Text>
          </View>
          <Text style={styles.detailTitle}>{selected.title}</Text>
          <Text style={styles.detailBody}>{selected.body}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaBox}><Text style={styles.metaLabel}>Source</Text><Text style={styles.metaValue}>{selected.agentId ?? 'system'}</Text></View>
            <View style={styles.metaBox}><Text style={styles.metaLabel}>Project</Text><Text style={styles.metaValue}>{selected.projectId ?? 'global'}</Text></View>
            <View style={styles.metaBox}><Text style={styles.metaLabel}>Refs</Text><Text style={styles.metaValue}>{selected.refs.length}</Text></View>
            <View style={styles.metaBox}><Text style={styles.metaLabel}>Tags</Text><Text style={styles.metaValue}>{selected.tags.length}</Text></View>
          </View>
          {selected.refs.length > 0 ? (
            <><Text style={styles.refsLabel}>References</Text>{selected.refs.map((ref, i) => (<Text key={i} style={styles.refItem}>{ref}</Text>))}</>
          ) : null}
          {selected.tags.length > 0 ? (
            <><Text style={styles.refsLabel}>Tags</Text><View style={styles.tagRow}>{selected.tags.map((tag) => (<PillBadge key={tag} label={tag} color="#9AA1AE" />))}</View></>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search ledger entries..." style={styles.searchInput} placeholderTextColor="#9AA1AE" />
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {ALL_KINDS.map((k) => (
              <Pressable key={k} onPress={() => setFilterKind(k)} style={[styles.filterPill, filterKind === k && styles.filterPillActive]}>
                <Text style={[styles.filterText, filterKind === k && styles.filterTextActive]}>{k === 'all' ? 'All' : k.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {filtered.map((entry) => (
          <Pressable key={entry.id} onPress={() => setSelected(entry)} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <PillBadge label={entry.kind.replace('_', ' ')} color={KIND_COLORS[entry.kind] ?? '#9AA1AE'} />
              <Text style={styles.entryTime}>{new Date(entry.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            <Text style={styles.entryBody} numberOfLines={2}>{entry.body}</Text>
          </Pressable>
        ))}
        {filtered.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No ledger entries match your filters.</Text></View>
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
  filterScroll: { marginBottom: 8, maxHeight: 50 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 0 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4' },
  filterPillActive: { backgroundColor: '#0B0D12' },
  filterText: { fontSize: 12, fontWeight: '500', color: '#5C6472' },
  filterTextActive: { color: '#FFFFFF' },
  entryCard: { padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryTime: { fontSize: 11, color: '#9AA1AE' },
  entryTitle: { fontSize: 14, fontWeight: '600', color: '#0B0D12' },
  entryBody: { fontSize: 12, color: '#5C6472', marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9AA1AE' },
  backLink: { fontSize: 13, color: '#6366F1', fontWeight: '600', marginBottom: 16 },
  detailCard: { padding: 20, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 16 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailTime: { fontSize: 12, color: '#9AA1AE' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#0B0D12', marginBottom: 8 },
  detailBody: { fontSize: 14, color: '#5C6472', lineHeight: 20 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  metaBox: { flex: 1, minWidth: 140, padding: 12, borderRadius: 10, backgroundColor: '#F7F8FA' },
  metaLabel: { fontSize: 11, color: '#9AA1AE', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#0B0D12', marginTop: 2 },
  refsLabel: { fontSize: 12, fontWeight: '600', color: '#9AA1AE', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  refItem: { fontSize: 13, color: '#5C6472', fontFamily: 'monospace', marginBottom: 2 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
});
