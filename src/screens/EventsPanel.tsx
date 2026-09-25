import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { getRecentEvents, type SovereignEventView } from '../services/deepseekApi';
import { theme } from '../theme';

const POLL_MS = 2000;
const MAX_EVENTS = 200;

function shortId(id?: string): string {
  if (!id) return '—';
  return id.length > 22 ? id.slice(0, 22) + '…' : id;
}

function shortTs(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function colorFor(event_type: string): string {
  if (event_type.startsWith('CHAT.')) return theme.cyan;
  if (event_type.startsWith('TERMUX.')) return theme.amber;
  if (event_type.startsWith('MYSTIC.')) return theme.purple;
  if (event_type.startsWith('GODMODE.')) return theme.red;
  if (event_type.startsWith('WORKSPACE.')) return theme.green;
  if (event_type.startsWith('POWERLAYER.')) return theme.gold;
  return theme.textMuted;
}

export function EventsPanel() {
  const [events, setEvents] = useState<SovereignEventView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const load = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const list = await getRecentEvents(MAX_EVENTS);
      setEvents(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      void load();
      setTick((n) => n + 1);
    }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const ordered = events.slice().reverse();

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.h2}>Event Bus</Text>
          <Text style={s.sub}>
            {events.length} events · polled every {(POLL_MS / 1000).toFixed(0)}s · tick {tick}
          </Text>
        </View>
        <Pressable
          onPress={() => setPaused((p) => !p)}
          style={[s.pauseBtn, paused && s.pauseBtnActive]}
        >
          <Text style={[s.pauseText, paused && s.pauseTextActive]}>
            {paused ? 'resume' : 'pause'}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={s.errBox}>
          <Text style={s.errText}>● {error}</Text>
        </View>
      ) : null}

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {ordered.length === 0 ? (
          <Text style={s.empty}>No events yet. Send a chat command to populate the bus.</Text>
        ) : ordered.map((e, i) => (
          <View key={`${e.timestamp}_${e.correlation_id ?? ''}_${i}`} style={s.row}>
            <Text style={s.ts}>{shortTs(e.timestamp)}</Text>
            <View style={[s.dot, { backgroundColor: colorFor(e.event_type) }]} />
            <View style={s.mid}>
              <Text style={[s.eventType, { color: colorFor(e.event_type) }]} numberOfLines={1}>
                {e.event_type}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                {e.source} · {shortId(e.correlation_id)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  h2: { color: theme.text, fontSize: 16, fontWeight: '700' },
  sub: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  pauseBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: theme.border,
  },
  pauseBtnActive: { backgroundColor: theme.cyan + '22', borderColor: theme.cyan },
  pauseText: { color: theme.textMuted, fontSize: 11, fontWeight: '600' },
  pauseTextActive: { color: theme.cyan },
  errBox: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2a1010' },
  errText: { color: theme.red, fontSize: 11, fontFamily: 'monospace' },
  scroll: { flex: 1 },
  content: { padding: 12, paddingBottom: 40 },
  empty: { color: theme.textMuted, fontSize: 13, padding: 16, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  ts: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', width: 60 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 8 },
  mid: { flex: 1 },
  eventType: { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  meta: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
});
