// Figma reference: light editorial system panel.
// Self-contained — does not use the dark-theme GlassCard/StatusChip/
// MemoryHeatGrid/InfoTile/NebulaBackground components. Those still
// exist on disk; they're just not wired here anymore.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AuthDebugPanel } from './AuthDebugPanel';
import { api } from '../services/api';
import { lovable } from '../theme';
import type { SystemPowerStatus, SystemPowerToggleKey } from '../types';

function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm ' + (s % 60) + 's';
}

function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={s.meterWrap}>
      <View style={s.meterHead}>
        <Text style={s.meterLabel}>{label}</Text>
        <Text style={s.meterValue}>{(pct * 100).toFixed(1)}%{hint ? '  ' + hint : ''}</Text>
      </View>
      <View style={s.meterTrack}>
        <View style={[s.meterFill, { width: ((pct * 100) + '%') as any }]} />
      </View>
    </View>
  );
}

export function SystemPower({ onClose }: { onClose?: () => void } = {}) {
  const [status, setStatus] = useState<SystemPowerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.getSystemPowerStatus();
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onToggle = async (key: SystemPowerToggleKey, value: boolean) => {
    if (!status) return;
    const previous = status;
    setStatus({ ...status, toggles: { ...status.toggles, [key]: value } });
    setBusy(true);
    try {
      const s = await api.toggleSystemPower(key, value);
      setStatus(s);
    } catch (e) {
      setStatus(previous);
      setError(e instanceof Error ? e.message : 'Toggle failed');
    } finally {
      setBusy(false);
    }
  };

  const Header = () => (
    <View style={s.header}>
      {onClose ? (
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Back">
          <Feather name="chevron-left" size={20} color={lovable.text} />
        </Pressable>
      ) : <View style={{ width: 36 }} />}
      <View style={s.headerCenter}>
        <Text style={s.headerTitle}>System Power</Text>
      </View>
      <Pressable onPress={load} style={s.headerBtn} disabled={loading} accessibilityLabel="Refresh">
        <Feather name="refresh-cw" size={15} color={loading ? lovable.textFaint : lovable.text} />
      </Pressable>
    </View>
  );

  // OFFLINE-SAFE: never early-return on error. AuthDebugPanel must stay
  // reachable even when the backend is down, so the user can refresh
  // expired credentials from the app without shell access.
  const host = status?.host ?? { nodeVersion: '--', platform: '--', arch: '--', uptimeSeconds: 0 };
  const proc = status?.process ?? { pid: 0, rssBytes: 0, heapUsedBytes: 0, heapTotalBytes: 0 };
  const system = status?.system ?? { totalMemoryBytes: 0, freeMemoryBytes: 0, usedMemoryPercent: 0 };
  const toggles = status?.toggles ?? { accelEnabled: false, deepSim: false };
  const updatedAt = status?.updatedAt ?? Date.now();
  const heapFraction = proc.heapTotalBytes > 0 ? proc.heapUsedBytes / proc.heapTotalBytes : 0;
  const rssFraction = system.totalMemoryBytes > 0 ? proc.rssBytes / system.totalMemoryBytes : 0;
  const systemFraction = system.usedMemoryPercent / 100;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>System Power</Text>
        {!status ? (
          <View style={s.offlineBanner}>
            <Feather name="alert-circle" size={16} color={lovable.error} />
            <View style={{ flex: 1 }}>
              <Text style={s.offlineTitle}>Backend unreachable</Text>
              <Text style={s.offlineBody}>
                {error || 'Check that the backend is running and the URL is correct.'}
              </Text>
            </View>
            <Pressable onPress={load} style={s.offlineRetry} accessibilityLabel="Retry">
              <Text style={s.offlineRetryText}>{loading ? '...' : 'Retry'}</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={s.sub}>Live host, memory, and process metrics from sovereign-core.</Text>
        <Text style={s.updated}>updated {new Date(updatedAt).toLocaleTimeString()}</Text>

        {/* ── Host / Process / System ────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Kernel Level System Bridge</Text>
          <Text style={s.cardDesc}>Live data from the sovereign-core Node process.</Text>

          <View style={s.kernelSection}>
            <Text style={s.kernelLabel}>Host</Text>
            <Text style={s.kvLine}>node  <Text style={s.kv}>{host.nodeVersion}</Text></Text>
            <Text style={s.kvLine}>platform  <Text style={s.kv}>{host.platform}/{host.arch}</Text></Text>
            <Text style={s.kvLine}>uptime  <Text style={s.kv}>{fmtUptime(host.uptimeSeconds)}</Text></Text>
          </View>

          <View style={s.kernelSection}>
            <Text style={s.kernelLabel}>Process</Text>
            <Text style={s.kvLine}>pid  <Text style={s.kv}>{proc.pid}</Text></Text>
            <Text style={s.kvLine}>rss  <Text style={s.kv}>{fmtBytes(proc.rssBytes)}</Text></Text>
            <Text style={s.kvLine}>heap  <Text style={s.kv}>{fmtBytes(proc.heapUsedBytes)} / {fmtBytes(proc.heapTotalBytes)}</Text></Text>
          </View>

          <View style={s.kernelSection}>
            <Text style={s.kernelLabel}>System</Text>
            <Text style={s.kvLine}>total  <Text style={s.kv}>{fmtBytes(system.totalMemoryBytes)}</Text></Text>
            <Text style={s.kvLine}>free  <Text style={s.kv}>{fmtBytes(system.freeMemoryBytes)}</Text></Text>
            <Text style={s.kvLine}>used  <Text style={s.kv}>{system.usedMemoryPercent.toFixed(1)}%</Text></Text>
          </View>
        </View>

        {/* ── Memory meters ──────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Direct Memory Access</Text>
          <Text style={s.cardDesc}>Heap, RSS, and system RAM as real fractions of capacity.</Text>
          <Meter label="Heap used" value={heapFraction} hint={fmtBytes(proc.heapUsedBytes)} />
          <Meter label="RSS" value={rssFraction} hint={fmtBytes(proc.rssBytes)} />
          <Meter label="System RAM" value={systemFraction} hint={system.usedMemoryPercent.toFixed(0) + '%'} />
        </View>

        {/* ── Toggles ────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Hardware Accelerated Logic Synthesis</Text>
          <Text style={s.cardDesc}>
            Toggle state is persisted server-side and every change is written to the Truth Ledger.
          </Text>

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Enable Acceleration</Text>
              <Text style={s.toggleHint}>{toggles.accelEnabled ? 'active' : 'disabled'}</Text>
            </View>
            <Pressable
              onPress={() => onToggle('accelEnabled', !toggles.accelEnabled)}
              disabled={busy}
              style={[s.toggle, toggles.accelEnabled ? s.toggleOn : s.toggleOff, busy && { opacity: 0.5 }]}
              accessibilityLabel="Toggle acceleration"
            >
              <View style={[s.toggleDot, toggles.accelEnabled ? s.dotOn : s.dotOff]} />
            </Pressable>
          </View>

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Deep Simulation</Text>
              <Text style={s.toggleHint}>{toggles.deepSim ? 'active' : 'disabled'}</Text>
            </View>
            <Pressable
              onPress={() => onToggle('deepSim', !toggles.deepSim)}
              disabled={busy}
              style={[s.toggle, toggles.deepSim ? s.toggleOn : s.toggleOff, busy && { opacity: 0.5 }]}
              accessibilityLabel="Toggle deep simulation"
            >
              <View style={[s.toggleDot, toggles.deepSim ? s.dotOn : s.dotOff]} />
            </Pressable>
          </View>
        </View>

        {/* ── OS abstraction layers ──────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sovereign OS Abstraction Layer</Text>
          <Text style={s.cardDesc}>Each layer is a real capability level, not a claim.</Text>

          <View style={s.osLayer}>
            <Feather name="server" size={18} color={lovable.textMuted} />
            <View style={s.osInfo}>
              <Text style={s.osLabel}>Host OS</Text>
              <Text style={s.osDesc}>{host.platform} {host.arch} · node {host.nodeVersion}</Text>
            </View>
            <View style={[s.pill, s.pillOk]}><Text style={s.pillOkText}>Stable</Text></View>
          </View>

          <View style={s.osLayer}>
            <Feather name="box" size={18} color={lovable.textMuted} />
            <View style={s.osInfo}>
              <Text style={s.osLabel}>Virtual Layer</Text>
              <Text style={s.osDesc}>
                {toggles.deepSim ? 'deep simulation active' : 'sandboxed runtime idle'}
              </Text>
            </View>
            <View style={[s.pill, toggles.deepSim ? s.pillInfo : s.pillOk]}>
              <Text style={toggles.deepSim ? s.pillInfoText : s.pillOkText}>
                {toggles.deepSim ? 'Active' : 'Idle'}
              </Text>
            </View>
          </View>

          <View style={s.osLayer}>
            <Feather name="star" size={18} color={lovable.textMuted} />
            <View style={s.osInfo}>
              <Text style={s.osLabel}>Sovereign Layer</Text>
              <Text style={s.osDesc}>
                {toggles.accelEnabled ? 'hardware acceleration enabled' : 'hardware acceleration disabled'}
              </Text>
            </View>
            <View style={[s.pill, toggles.accelEnabled ? s.pillInfo : s.pillOk]}>
              <Text style={toggles.accelEnabled ? s.pillInfoText : s.pillOkText}>
                {toggles.accelEnabled ? 'Active' : 'Idle'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Info tiles ─────────────────────────────────────── */}
        <View style={s.infoRow}>
          <View style={s.tile}>
            <Feather name="wifi" size={16} color={error ? lovable.error : lovable.success} />
            <Text style={s.tileLabel}>Bridge</Text>
            <Text style={s.tileValue}>{error ? 'Down' : 'Up'}</Text>
          </View>
          <View style={s.tile}>
            <Feather name="activity" size={16} color={lovable.textMuted} />
            <Text style={s.tileLabel}>RSS</Text>
            <Text style={s.tileValue}>{fmtBytes(proc.rssBytes)}</Text>
          </View>
          <View style={s.tile}>
            <Feather name="cpu" size={16} color={lovable.textMuted} />
            <Text style={s.tileLabel}>RAM</Text>
            <Text style={s.tileValue}>{system.usedMemoryPercent.toFixed(0)}%</Text>
          </View>
        </View>

        {error ? <Text style={s.inlineErr}>{error}</Text> : null}

        <View style={s.card}>
          <AuthDebugPanel />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: lovable.space.sm + 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  scroll: { flex: 1 },
  content: {
    padding: lovable.space.md,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: lovable.space.lg,
  },
  errTitle: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxl,
    letterSpacing: -0.3,
    marginTop: lovable.space.sm,
  },
  errMsg: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: lovable.space.sm,
    paddingHorizontal: lovable.space.lg,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: lovable.accent,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: lovable.weight.bold,
    fontSize: lovable.font.sm,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    padding: lovable.space.sm + 4,
    borderRadius: lovable.radius.md,
    backgroundColor: lovable.errorSoft,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.22)',
    marginTop: lovable.space.sm,
    marginBottom: lovable.space.sm,
  },
  offlineTitle: {
    color: lovable.error,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.bold,
  },
  offlineBody: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 2,
    lineHeight: 15,
  },
  offlineRetry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: lovable.error,
  },
  offlineRetryText: {
    color: '#FFFFFF',
    fontSize: lovable.font.xs,
    fontWeight: lovable.weight.bold,
  },
  h1: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxxl,
    letterSpacing: -0.5,
  },
  sub: {
    color: lovable.textMuted,
    fontSize: lovable.font.md,
    marginTop: 4,
  },
  updated: {
    color: lovable.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
    marginBottom: lovable.space.md,
  },
  card: {
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: lovable.radius.lg,
    padding: lovable.space.md,
    marginBottom: lovable.space.sm + 4,
  },
  cardTitle: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.bold,
    marginBottom: 4,
  },
  cardDesc: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    marginBottom: lovable.space.md,
    lineHeight: 20,
  },
  kernelSection: {
    paddingTop: lovable.space.sm,
    paddingBottom: lovable.space.sm,
    borderTopWidth: 1,
    borderTopColor: lovable.cardBorder,
  },
  kernelLabel: {
    color: lovable.text,
    fontSize: lovable.font.xs,
    fontWeight: lovable.weight.bold,
    marginBottom: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kvLine: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    lineHeight: 20,
  },
  kv: {
    color: lovable.text,
    fontFamily: 'monospace',
  },
  meterWrap: { marginBottom: lovable.space.md },
  meterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meterLabel: {
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.medium,
  },
  meterValue: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: lovable.pillBg,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: lovable.text,
    borderRadius: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: lovable.space.sm,
  },
  toggleLabel: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  toggleHint: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    padding: 2, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: 'rgba(10,10,10,0.85)' },
  toggleOff: { backgroundColor: lovable.pillBg },
  toggleDot: { width: 22, height: 22, borderRadius: 11 },
  dotOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  dotOff: { backgroundColor: '#FFFFFF' },
  osLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm + 2,
    paddingVertical: lovable.space.sm,
    borderTopWidth: 1,
    borderTopColor: lovable.cardBorder,
  },
  osInfo: { flex: 1 },
  osLabel: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
    marginBottom: 2,
  },
  osDesc: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillOk: {
    backgroundColor: lovable.successSoft,
    borderColor: 'rgba(22,163,74,0.22)',
  },
  pillOkText: {
    color: lovable.success,
    fontSize: 11,
    fontWeight: lovable.weight.semibold,
  },
  pillInfo: {
    backgroundColor: lovable.pillBg,
    borderColor: lovable.pillBorder,
  },
  pillInfoText: {
    color: lovable.text,
    fontSize: 11,
    fontWeight: lovable.weight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    gap: lovable.space.sm,
    marginBottom: lovable.space.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: lovable.radius.md,
    padding: lovable.space.sm + 4,
    gap: 4,
  },
  tileLabel: {
    color: lovable.textMuted,
    fontSize: 10,
    fontWeight: lovable.weight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  tileValue: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
    fontFamily: 'monospace',
  },
  inlineErr: {
    color: lovable.error,
    fontSize: lovable.font.xs,
    textAlign: 'center',
    marginTop: lovable.space.sm,
  },
  sectionLabel: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    fontWeight: lovable.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: lovable.space.md,
    marginBottom: lovable.space.sm,
  },
});
