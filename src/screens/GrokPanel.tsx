import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../services/api';
import { lovable } from '../theme';

export function GrokPanel() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getEngineHealth('engine_grok');
      setHealth(r.health || r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const cookiesLen = health?.cookiesLength ?? 0;
  const hasBearer = !!health?.hasBearer;
  const hasCsrf = !!health?.hasCsrf;
  const healthy = !!health?.healthy;
  const cookieState = cookiesLen > 0 ? 'ok' : 'bad';
  const bearerState = hasBearer ? 'ok' : 'bad';

  const Pill = ({ label, state, sub }: { label: string; state: string; sub: string }) => {
    const color = state === 'ok' ? lovable.success : state === 'bad' ? lovable.error : lovable.textMuted;
    const bg = state === 'ok' ? lovable.successSoft : state === 'bad' ? lovable.errorSoft : lovable.pillBg;
    const border = state === 'ok' ? 'rgba(22,163,74,0.22)' : state === 'bad' ? 'rgba(220,38,38,0.22)' : lovable.cardBorder;
    return (
      <View style={[s.pill, { backgroundColor: bg, borderColor: border }]}>
        <View style={[s.pillDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.pillLabel, { color }]}>{label}</Text>
          <Text style={s.pillSub} numberOfLines={1}>{sub}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={s.panel}>
      <Text style={s.h1}>Grok Auth</Text>
      <Text style={s.sub}>Cookie + bearer, loaded from file at boot</Text>

      <View style={s.statusPills}>
        <Pill label="COOKIES" state={cookieState} sub={cookiesLen + ' chars'} />
        <Pill label="BEARER" state={bearerState} sub={hasBearer ? 'set' : 'missing'} />
        <Pill label="CSRF" state={hasCsrf ? 'ok' : 'unknown'} sub={hasCsrf ? 'set' : 'not set'} />
      </View>

      <View style={s.healthRow}>
        <Text style={s.healthText} numberOfLines={1}>
          {healthy ? 'healthy' : 'not healthy'}
          {health?.provider ? ' · ' + health.provider : ''}
        </Text>
        <Pressable onPress={refresh} disabled={loading} style={[s.healthBtn, loading && { opacity: 0.5 }]}>
          <Text style={s.healthBtnText}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={s.err}>● {error}</Text> : null}

      <View style={s.warnBox}>
        <Text style={s.warnText}>⚠ Credentials loaded from ~/cookies/grok-creds.json at backend boot.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { gap: 0 },
  h1: { color: lovable.text, fontSize: lovable.font.lg, fontWeight: 'bold' },
  sub: { color: lovable.textMuted, fontSize: lovable.font.sm, marginTop: 2, marginBottom: 12 },
  statusPills: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  pillSub: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 1 },
  healthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: lovable.pillBg, borderWidth: 1, borderColor: lovable.cardBorder, marginBottom: 10 },
  healthText: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', flex: 1 },
  healthBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: lovable.accent },
  healthBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  err: { color: lovable.error, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 },
  warnBox: { marginTop: 14, padding: 10, borderRadius: 8, backgroundColor: lovable.warningSoft, borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)' },
  warnText: { color: lovable.warning, fontSize: 11, lineHeight: 16 },
});
