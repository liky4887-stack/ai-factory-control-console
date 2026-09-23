import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { api } from '../services/api';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { MetricTile } from '../components/MetricTile';
import { theme } from '../theme';
import type { Agent as AgentType } from '../types';

const STATUS_MAP: Record<string, string> = { busy: 'running', idle: 'idle', paused: 'paused', offline: 'error' };

export function AgentSwarm() {
  const { agents, loadAgents } = useFactory();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AgentType | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'activity' | 'config'>('overview');
  const [liveTelemetry, setLiveTelemetry] = useState(true);
  const [preset, setPreset] = useState('Research');
  const [configTemp, setConfigTemp] = useState('0.7');
  const [configMaxSteps, setConfigMaxSteps] = useState('50');

  const filtered = agents.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.role.toLowerCase().includes(search.toLowerCase()));
  const active = agents.filter((a) => a.status === 'busy').length;
  const idle = agents.filter((a) => a.status === 'idle').length;
  const degraded = agents.filter((a) => a.status === 'offline' || a.status === 'paused').length;

  const handlePause = useCallback(async (id: string) => { await api.pauseAgent(id); await loadAgents(); }, [loadAgents]);
  const handleResume = useCallback(async (id: string) => { await api.resumeAgent(id); await loadAgents(); }, [loadAgents]);

  if (selected) {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Pressable onPress={() => setSelected(null)}><Text style={s.back}>← Back to Swarm</Text></Pressable>
        <GlassCard style={s.card} accent={theme.blue}>
          <View style={s.detailHead}>
            <Text style={s.detailName}>{selected.name}</Text>
            <StatusChip label={selected.status} status={STATUS_MAP[selected.status] ?? 'idle'} />
          </View>
          <Text style={s.detailRole}>{selected.role.replace('_', ' ')}</Text>
          <View style={s.tabRow}>
            {(['overview', 'activity', 'config'] as const).map((t) => (
              <Pressable key={t} onPress={() => setDetailTab(t)} style={({ pressed }) => [s.tab, detailTab === t && s.tabActive, pressed && s.pillPressed]}>
                <Text style={[s.tabText, detailTab === t && s.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          {detailTab === 'overview' && (
            <View>
              <Text style={s.detailLabel}>Persona</Text>
              <Text style={s.detailBody}>{selected.persona}</Text>
              <Text style={s.detailLabel}>Skills</Text>
              <Text style={s.detailBody}>{selected.skills.join(', ') || 'none'}</Text>
              <Text style={s.detailLabel}>Stats</Text>
              <View style={s.statsRow}>
                <View style={s.statBox}><Text style={s.statVal}>{selected.stats.tasksCompleted}</Text><Text style={s.statLabel}>Completed</Text></View>
                <View style={s.statBox}><Text style={s.statVal}>{selected.stats.tasksFailed}</Text><Text style={s.statLabel}>Failed</Text></View>
              </View>
            </View>
          )}
          {detailTab === 'activity' && (
            <View>
              <Text style={s.detailBody}>{selected.currentTaskId ? `Current task: ${selected.currentTaskId}` : 'No active task.'}</Text>
            </View>
          )}
          {detailTab === 'config' && (
            <View>
              <Text style={s.detailLabel}>Temperature</Text>
              <TextInput value={configTemp} onChangeText={setConfigTemp} style={s.configInput} placeholderTextColor={theme.textMuted} />
              <Text style={s.detailLabel}>Max Steps</Text>
              <TextInput value={configMaxSteps} onChangeText={setConfigMaxSteps} style={s.configInput} placeholderTextColor={theme.textMuted} />
              <CommandButton label="Save Config" variant="primary" onPress={() => {}} style={{ marginTop: 10 }} />
            </View>
          )}
          <View style={s.actionRow}>
            {selected.status === 'paused' ? (
              <CommandButton label="Restart" variant="primary" onPress={() => handleResume(selected.id)} />
            ) : (
              <CommandButton label="Pause" variant="danger" onPress={() => handlePause(selected.id)} />
            )}
          </View>
        </GlassCard>
      </ScrollView>
    );
  }

  return (
    <View style={s.scroll}>
      <View style={s.searchWrap}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search agents..." placeholderTextColor={theme.textMuted} style={s.search} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.metrics}>
          <MetricTile label="Total" value={agents.length} accent={theme.cyan} />
          <MetricTile label="Active" value={active} accent={theme.green} />
        </View>
        <View style={s.metrics}>
          <MetricTile label="Idle" value={idle} accent={theme.textMuted} />
          <MetricTile label="Degraded" value={degraded} accent={degraded > 0 ? theme.red : theme.green} />
        </View>

        <GlassCard style={s.card}>
          <Text style={s.cardTitle}>Swarm Control</Text>
          <View style={s.presetRow}>
            {['Research', 'Monitoring', 'Synthesis', 'Red Team'].map((p) => (
              <Pressable key={p} onPress={() => setPreset(p)} style={({ pressed }) => [s.pill, preset === p && s.pillActive, pressed && s.pillPressed]}>
                <Text style={[s.pillText, preset === p && s.pillTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Live Telemetry</Text>
            <Pressable onPress={() => setLiveTelemetry(!liveTelemetry)} style={[s.toggle, liveTelemetry ? s.toggleOn : s.toggleOff]}>
              <View style={[s.toggleDot, liveTelemetry ? s.dotOn : s.dotOff]} />
            </Pressable>
          </View>
          <View style={s.actionRow}>
            <CommandButton label="Launch Swarm Run" variant="primary" onPress={() => {}} />
            <CommandButton label="Schedule Run" variant="secondary" onPress={() => {}} />
          </View>
        </GlassCard>

        <Text style={s.sectionLabel}>Agents</Text>
        {filtered.length === 0 ? (
          <Text style={s.empty}>No agents found.</Text>
        ) : (
          filtered.map((a) => (
            <Pressable key={a.id} onPress={() => setSelected(a)} style={({ pressed }) => [s.agentCard, pressed && s.pillPressed]}>
              <View style={s.agentHead}>
                <Text style={s.agentName}>{a.name}</Text>
                <StatusChip label={a.status} status={STATUS_MAP[a.status] ?? 'idle'} />
              </View>
              <Text style={s.agentRole}>{a.role.replace('_', ' ')}</Text>
              <Text style={s.agentTask} numberOfLines={1}>{a.currentTaskId ? `Task: ${a.currentTaskId}` : 'No active task'}</Text>
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
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: { marginBottom: 12 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  presetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  pillActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  pillPressed: { opacity: 0.7 },
  pillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  pillTextActive: { color: theme.cyan },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  toggleLabel: { color: theme.textSecondary, fontSize: 13 },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.green}40` },
  toggleOff: { backgroundColor: theme.glassSoft },
  toggleDot: { width: 22, height: 22, borderRadius: 11 },
  dotOn: { backgroundColor: theme.green, alignSelf: 'flex-end' },
  dotOff: { backgroundColor: theme.textMuted },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  agentCard: { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 14, marginBottom: 8 },
  agentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  agentName: { color: theme.text, fontSize: 14, fontWeight: '600' },
  agentRole: { color: theme.textMuted, fontSize: 12, textTransform: 'capitalize' },
  agentTask: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 3 },
  empty: { color: theme.textMuted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
  back: { color: theme.cyan, fontSize: 13, fontWeight: '600', marginBottom: 14 },
  detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailName: { color: theme.text, fontSize: 16, fontWeight: '700' },
  detailRole: { color: theme.textMuted, fontSize: 12, textTransform: 'capitalize', marginBottom: 12 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  tabActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  tabText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: theme.cyan },
  detailLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },
  detailBody: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statBox: { flex: 1, backgroundColor: theme.glassSoft, borderRadius: 10, padding: 10, alignItems: 'center' },
  statVal: { color: theme.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
  configInput: { height: 40, borderRadius: 10, backgroundColor: '#0A0D12', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: theme.text, fontSize: 13, marginTop: 4 },
});
