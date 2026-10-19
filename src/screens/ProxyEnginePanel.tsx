import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api } from '../services/api';
import { lovable } from '../theme';

interface Props {
  engineId: string;
  label: string;
  provider: string;
  proxyUrl: string;
  notes?: string;
}

export function ProxyEnginePanel({ engineId, label, provider, proxyUrl, notes }: Props) {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.getEngineHealth(engineId);
      setHealth(r.health || r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [engineId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const healthy = !!health?.healthy;
  const configured = !!health?.configured;

  return (
    <View style={s.panel}>
      <Text style={s.h1}>{label} via {provider}</Text>
      <Text style={s.sub}>Cookie + session token managed by the local proxy.</Text>

      <View style={s.statusPills}>
        <View style={[s.pill, { backgroundColor: configured ? lovable.successSoft : lovable.errorSoft, borderColor: configured ? 'rgba(22,163,74,0.22)' : 'rgba(220,38,38,0.22)' }]}>
          <View style={[s.pillDot, { backgroundColor: configured ? lovable.success : lovable.error }]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.pillLabel, { color: configured ? lovable.success : lovable.error }]}>CONFIGURED</Text>
            <Text style={s.pillSub} numberOfLines={1}>{configured ? 'yes' : 'no'}</Text>
          </View>
        </View>
        <View style={[s.pill, { backgroundColor: healthy ? lovable.successSoft : lovable.errorSoft, borderColor: healthy ? 'rgba(22,163,74,0.22)' : 'rgba(220,38,38,0.22)' }]}>
          <View style={[s.pillDot, { backgroundColor: healthy ? lovable.success : lovable.error }]} />
          <View style={{ flex: 1 }}>
            <Text style={[s.pillLabel, { color: healthy ? lovable.success : lovable.error }]}>HEALTHY</Text>
            <Text style={s.pillSub} numberOfLines={1}>{healthy ? 'yes' : 'no'}</Text>
          </View>
        </View>
      </View>

      <View style={s.proxyBox}>
        <Feather name="link" size={12} color={lovable.textMuted} />
        <Text style={s.proxyText} numberOfLines={1}>{proxyUrl}</Text>
      </View>

      <View style={s.healthRow}>
        <Text style={s.healthText} numberOfLines={1}>
          {health?.lastCallError ? 'err: ' + String(health.lastCallError).slice(0, 40) : health?.lastCallOk === true ? 'last call OK' : 'no calls yet'}
        </Text>
        <Pressable onPress={refresh} disabled={loading} style={[s.healthBtn, loading && { opacity: 0.5 }]}>
          <Text style={s.healthBtnText}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={s.err}>● {error}</Text> : null}
      {notes ? <View style={s.warnBox}><Text style={s.warnText}>⚠ {notes}</Text></View> : null}
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
  proxyBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: lovable.pillBg, borderWidth: 1, borderColor: lovable.cardBorder, marginBottom: 10 },
  proxyText: { color: lovable.text, fontSize: 10, fontFamily: 'monospace', flex: 1 },
  healthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: lovable.pillBg, borderWidth: 1, borderColor: lovable.cardBorder, marginBottom: 10 },
  healthText: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', flex: 1 },
  healthBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: lovable.accent },
  healthBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  err: { color: lovable.error, fontSize: 11, fontFamily: 'monospace', marginBottom: 8 },
  warnBox: { marginTop: 14, padding: 10, borderRadius: 8, backgroundColor: lovable.warningSoft, borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)' },
  warnText: { color: lovable.warning, fontSize: 11, lineHeight: 16 },
});
