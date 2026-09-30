// Live activity feed — the Glass Box. Renders ActivityLog events.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useRecentEvents } from '../state/ideStore';
import type { ActivityEvent, ActivitySource } from '../core/types';

const SOURCE_COLOR: Record<ActivitySource, string> = {
  Orchestrator: theme.text,
  Planning:     theme.blue,
  Audit:        theme.purple,
  CodeGen:      theme.cyan,
  Refactor:     theme.teal,
  Diff:         theme.magenta,
  Test:         theme.green,
  Simulation:   theme.gold,
  Deploy:       theme.cyan,
  Heal:         theme.green,
  Evolution:    theme.purple,
  Market:       theme.amber,
  Meta:         theme.textMuted,
  System:       theme.textMuted,
};

const STATUS_DOT = {
  start:    theme.cyan,
  progress: theme.cyan,
  success:  theme.green,
  warn:     theme.amber,
  error:    theme.red,
  info:     theme.textMuted,
};

const FILTERS: Array<ActivitySource | 'ALL'> = [
  'ALL', 'Orchestrator', 'Planning', 'CodeGen', 'Audit', 'Diff', 'Simulation', 'Deploy', 'Heal',
];

function relTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 1000) return 'now';
  if (d < 60_000) return Math.floor(d / 1000) + 's';
  if (d < 3_600_000) return Math.floor(d / 60_000) + 'm';
  return Math.floor(d / 3_600_000) + 'h';
}

function Row({ ev }: { ev: ActivityEvent }) {
  const srcColor = SOURCE_COLOR[ev.source] || theme.textMuted;
  const dot = STATUS_DOT[ev.status] || theme.textMuted;
  return (
    <View style={s.row}>
      <View style={[s.statusDot, { backgroundColor: dot }]} />
      <Text style={s.time}>{relTime(ev.timestamp)}</Text>
      <Text style={[s.src, { color: srcColor }]} numberOfLines={1}>{ev.source}</Text>
      <Text style={[s.phase, { color: theme.textMuted }]} numberOfLines={1}>{ev.phase}</Text>
      <Text style={s.msg} numberOfLines={2}>{ev.message}</Text>
    </View>
  );
}

interface Props {
  /** How many events to consider. Default 200. */
  limit?: number;
  /** Fixed height; if omitted, feed fills parent. */
  height?: number;
}

export function ActivityFeed({ limit = 200, height }: Props) {
  const events = useRecentEvents(limit);
  const [filter, setFilter] = useState<ActivitySource | 'ALL'>('ALL');

  const filtered = useMemo(
    () => (filter === 'ALL' ? events : events.filter((e) => e.source === filter)),
    [events, filter],
  );

  return (
    <View style={[s.root, height ? { height } : null]}>
      <View style={s.headerRow}>
        <Feather name="activity" size={12} color={theme.cyan} />
        <Text style={s.headerText}>GLASS BOX</Text>
        <Text style={s.headerCount}>{filtered.length}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          const c = f === 'ALL' ? theme.text : (SOURCE_COLOR[f] || theme.textMuted);
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[s.filterPill, active && { backgroundColor: c + '22', borderColor: c + '66' }]}
            >
              <Text style={[s.filterText, { color: active ? c : theme.textMuted }]}>{f}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.listBody}>
        {filtered.length === 0 ? (
          <Text style={s.empty}>No events yet.</Text>
        ) : (
          filtered.map((ev) => <Row key={ev.id} ev={ev} />)
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingTop: 6 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingBottom: 8,
  },
  headerText: { color: theme.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  headerCount: { color: theme.textMuted, fontSize: 10, fontFamily: theme.mono },

  filterRow: { paddingHorizontal: 12, gap: 6, paddingBottom: 8 },
  filterPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1, borderColor: theme.border,
  },
  filterText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  listBody: { paddingHorizontal: 12, paddingBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  time: { color: theme.textMuted, fontFamily: theme.mono, fontSize: 10, width: 32, marginTop: 2 },
  src: { fontSize: 10, fontWeight: '700', width: 82, marginTop: 2 },
  phase: { fontSize: 10, fontFamily: theme.mono, width: 70, marginTop: 2 },
  msg: { color: theme.text, fontSize: 11, flex: 1, lineHeight: 15 },

  empty: { color: theme.textMuted, fontSize: 12, fontStyle: 'italic', padding: 12 },
});
