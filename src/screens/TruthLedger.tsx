import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { theme } from '../theme';
import type { LedgerEntry } from '../types';

const KIND_COLORS: Record<string, string> = {
  decision: theme.blue, schema_change: theme.purple, prompt_change: theme.purple,
  deploy: theme.cyan, bug: theme.red, pivot: theme.amber,
  omega_action: theme.red, compliance_review: theme.purple,
  skill_install: theme.green, skill_remove: theme.amber, agent_action: theme.green,
};

export function TruthLedger() {
  const { ledger, loadLedger, activeProjectId } = useFactory();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | 'all'>('all');
  const [selected, setSelected] = useState<LedgerEntry | null>(null);

  const filtered = ledger.filter((e) => {
    if (filterType !== 'all' && e.kind !== filterType) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleRefresh = useCallback(() => { loadLedger(activeProjectId ?? undefined); }, [loadLedger, activeProjectId]);

  if (selected) {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Pressable onPress={() => setSelected(null)}><Text style={s.back}>← Back to Ledger</Text></Pressable>
        <GlassCard style={s.detail} accent={KIND_COLORS[selected.kind] ?? theme.cyan}>
          <View style={s.detailHead}>
            <StatusChip label={selected.kind.replace('_', ' ')} status="pending" />
            <Text style={s.detailTime}>{new Date(selected.createdAt).toLocaleString()}</Text>
          </View>
          <Text style={s.detailTitle}>{selected.title}</Text>
          <Text style={s.detailBody}>{selected.body}</Text>
          <View style={s.metaRow}>
            <View style={s.metaBox}><Text style={s.metaLabel}>ID</Text><Text style={s.metaVal}>{selected.id}</Text></View>
            <View style={s.metaBox}><Text style={s.metaLabel}>Source</Text><Text style={s.metaVal}>{selected.agentId ?? 'system'}</Text></View>
          </View>
          <View style={s.metaRow}>
            <View style={s.metaBox}><Text style={s.metaLabel}>Refs</Text><Text style={s.metaVal}>{selected.refs.length}</Text></View>
            <View style={s.metaBox}><Text style={s.metaLabel}>Tags</Text><Text style={s.metaVal}>{selected.tags.length}</Text></View>
          </View>
          <View style={s.actionRow}>
            <CommandButton label="Re-verify" variant="secondary" onPress={() => {}} />
            <CommandButton label="Mark Disputed" variant="danger" onPress={() => {}} />
            <CommandButton label="Pin" variant="secondary" onPress={() => {}} />
          </View>
        </GlassCard>
      </ScrollView>
    );
  }

  return (
    <View style={s.scroll}>
      <View style={s.searchWrap}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search events..." placeholderTextColor={theme.textMuted} style={s.search} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.filterRow}>
          {['all', 'decision', 'deploy', 'bug', 'omega_action', 'agent_action'].map((k) => (
            <Pressable key={k} onPress={() => setFilterType(k)} style={({ pressed }) => [s.pill, filterType === k && s.pillActive, pressed && s.pillPressed]}>
              <Text style={[s.pillText, filterType === k && s.pillTextActive]}>{k === 'all' ? 'All' : k.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>

        <CommandButton label="Refresh Ledger" variant="primary" onPress={handleRefresh} style={s.refreshBtn} />

        <GlassCard style={s.healthCard} accent={theme.green}>
          <Text style={s.cardTitle}>Ledger Health</Text>
          <View style={s.healthRow}>
            <StatusChip label="Verified" status="verified" />
            <Text style={s.healthNum}>{ledger.length}</Text>
            <StatusChip label="Flagged" status="flagged" />
            <Text style={s.healthNum}>0</Text>
          </View>
        </GlassCard>

        {filtered.length === 0 ? (
          <Text style={s.empty}>No events match your filters.</Text>
        ) : (
          filtered.map((entry) => (
            <Pressable key={entry.id} onPress={() => setSelected(entry)} style={({ pressed }) => [s.entry, pressed && s.entryPressed]}>
              <View style={s.entryHead}>
                <StatusChip label={entry.kind.replace('_', ' ')} status="pending" />
                <Text style={s.entryTime}>{new Date(entry.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={s.entryTitle}>{entry.title}</Text>
              <Text style={s.entryBody} numberOfLines={2}>{entry.body}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  searchWrap: { padding: 16, paddingBottom: 0 },
  search: { height: 42, borderRadius: 12, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, color: theme.text, fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  pillActive: { backgroundColor: `${theme.blue}30`, borderColor: theme.borderStrong },
  pillPressed: { opacity: 0.7 },
  pillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  pillTextActive: { color: theme.cyan },
  refreshBtn: { marginBottom: 14 },
  healthCard: { marginBottom: 14 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  healthNum: { color: theme.text, fontSize: 16, fontWeight: '800', marginRight: 8 },
  entry: { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 14, marginBottom: 8 },
  entryPressed: { opacity: 0.8 },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  entryTime: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' },
  entryTitle: { color: theme.text, fontSize: 13, fontWeight: '600' },
  entryBody: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
  empty: { color: theme.textMuted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
  back: { color: theme.cyan, fontSize: 13, fontWeight: '600', marginBottom: 14 },
  detail: { marginBottom: 14 },
  detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailTime: { color: theme.textMuted, fontSize: 12, fontFamily: 'monospace' },
  detailTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  detailBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaBox: { flex: 1, backgroundColor: theme.glassSoft, borderRadius: 10, padding: 10 },
  metaLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaVal: { color: theme.text, fontSize: 12, fontFamily: 'monospace', marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
