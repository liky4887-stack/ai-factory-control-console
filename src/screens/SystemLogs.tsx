import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { theme } from '../theme';

interface LogEntry { time: string; component: string; level: string; message: string; }

const SAMPLE_LOGS: LogEntry[] = [
  { time: '10:42:01', component: 'Core', level: 'info', message: 'Bridge handshake established' },
  { time: '10:42:05', component: 'Swarm', level: 'info', message: 'Agent scout-01 registered' },
  { time: '10:42:12', component: 'Ledger', level: 'info', message: 'Ledger entry created: decision-001' },
  { time: '10:42:18', component: 'Omega', level: 'warn', message: 'Mode change requested: SAFE -> CONTROLLED' },
  { time: '10:42:25', component: 'Swarm', level: 'error', message: 'Agent builder-02 connection lost' },
  { time: '10:42:30', component: 'Core', level: 'info', message: 'Health check passed' },
  { time: '10:42:38', component: 'Ledger', level: 'info', message: 'Integrity verified for 3 entries' },
  { time: '10:42:45', component: 'Omega', level: 'info', message: 'Mode change confirmed: CONTROLLED' },
];

const LEVEL_COLORS: Record<string, string> = { info: theme.cyan, warn: theme.amber, error: theme.red };

export function SystemLogs() {
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [autoscroll, setAutoscroll] = useState(true);
  const [paused, setPaused] = useState(false);

  const filtered = SAMPLE_LOGS.filter((l) => filter === 'all' || l.component.toLowerCase() === filter);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.h1}>System Logs</Text>
      <Text style={s.sub}>Live telemetry and system events</Text>

      <View style={s.filterRow}>
        {['all', 'core', 'ledger', 'omega', 'swarm'].map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={({ pressed }) => [s.pill, filter === f && s.pillActive, pressed && s.pillPressed]}>
            <Text style={[s.pillText, filter === f && s.pillTextActive]}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.controlRow}>
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Autoscroll</Text>
          <Pressable onPress={() => setAutoscroll(!autoscroll)} style={[s.toggle, autoscroll ? s.toggleOn : s.toggleOff]}>
            <View style={[s.toggleDot, autoscroll ? s.dotOn : s.dotOff]} />
          </Pressable>
        </View>
        <CommandButton label={paused ? 'Resume' : 'Pause'} variant={paused ? 'primary' : 'secondary'} onPress={() => setPaused(!paused)} />
      </View>

      <GlassCard style={s.logCard}>
        {filtered.length === 0 ? (
          <Text style={s.empty}>No logs match filter.</Text>
        ) : (
          filtered.map((log, i) => {
            const color = LEVEL_COLORS[log.level] ?? theme.cyan;
            return (
              <View key={i} style={s.logRow}>
                <Text style={s.logTime}>{log.time}</Text>
                <View style={[s.logLevel, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
                  <Text style={[s.logLevelText, { color }]}>{log.level.toUpperCase()}</Text>
                </View>
                <Text style={s.logComp}>{log.component}</Text>
                <Text style={s.logMsg} numberOfLines={2}>{log.message}</Text>
              </View>
            );
          })
        )}
      </GlassCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800' },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 18 },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  pillActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  pillPressed: { opacity: 0.7 },
  pillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  pillTextActive: { color: theme.cyan },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { color: theme.textSecondary, fontSize: 12 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.green}40` },
  toggleOff: { backgroundColor: theme.glassSoft },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  dotOn: { backgroundColor: theme.green, alignSelf: 'flex-end' },
  dotOff: { backgroundColor: theme.textMuted },
  logCard: { padding: 12 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border },
  logTime: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace', width: 64 },
  logLevel: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  logLevelText: { fontSize: 9, fontWeight: '800' },
  logComp: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', width: 56 },
  logMsg: { color: theme.text, fontSize: 12, flex: 1, lineHeight: 16 },
  empty: { color: theme.textMuted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
});
