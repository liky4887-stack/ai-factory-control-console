/**
 * screens/SystemPower.tsx
 * Pure presentation. All values rendered here come from the backend
 * /system-power/status endpoint. All toggle actions call
 * /system-power/toggle. No local fake data.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { MemoryHeatGrid } from '../components/MemoryHeatGrid';
import { AuthDebugPanel } from './AuthDebugPanel';
import { InfoTile } from '../components/InfoTile';
import { NebulaBackground } from '../components/NebulaBackground';
import { api } from '../services/api';
import { theme } from '../theme';
import type { SystemPowerStatus, SystemPowerToggleKey } from '../types';

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
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
    // optimistic — flip in place, then reconcile with server response
    setStatus({ ...status, toggles: { ...status.toggles, [key]: value } });
    setBusy(true);
    try {
      const s = await api.toggleSystemPower(key, value);
      setStatus(s);
    } catch (e) {
      // rollback
      setStatus(status);
      setError(e instanceof Error ? e.message : 'Toggle failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) {
    return (
      <View style={s.root}>
        <NebulaBackground />
      {onClose ? (
        <Pressable onPress={onClose} style={s.backBtn} hitSlop={12}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
      ) : null}
        <View style={s.center}><ActivityIndicator color={theme.cyan} /></View>
      </View>
    );
  }

  if (error && !status) {
    return (
      <View style={s.root}>
        <NebulaBackground />
      {onClose ? (
        <Pressable onPress={onClose} style={s.backBtn} hitSlop={12}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
      ) : null}
        <View style={s.center}>
          <Text style={s.errTitle}>Backend unreachable</Text>
          <Text style={s.errMsg}>{error}</Text>
          <Pressable onPress={load} style={s.retryBtn}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!status) return null;

  const { host, process: proc, system, toggles, updatedAt } = status;

  const heapFraction = proc.heapTotalBytes > 0 ? proc.heapUsedBytes / proc.heapTotalBytes : 0;
  const rssFraction = system.totalMemoryBytes > 0 ? proc.rssBytes / system.totalMemoryBytes : 0;

  return (
    <View style={s.root}>
      <NebulaBackground />
      {onClose ? (
        <Pressable onPress={onClose} style={s.backBtn} hitSlop={12}>
          <Text style={s.backIcon}>‹</Text>
        </Pressable>
      ) : null}
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>System Power Layer</Text>
        <Text style={s.sub}>Live host, memory, and process metrics from sovereign-core</Text>
        <Text style={s.updated}>updated {new Date(updatedAt).toLocaleTimeString()}</Text>

        {/* HOST / PROCESS — real data */}
        <GlassCard style={s.card} accent={theme.cyan}>
          <Text style={s.cardTitle}>Kernel Level System Bridge</Text>
          <Text style={s.cardDesc}>Live data from the sovereign-core Node process</Text>
          <View style={s.kernelPanels} testID="kernel-system-bridge">
            <View style={s.kernelSection}>
              <Text style={s.kernelLabel}>Host</Text>
              <Text style={s.kvLine}>node <Text style={s.kv}>{host.nodeVersion}</Text></Text>
              <Text style={s.kvLine}>platform <Text style={s.kv}>{host.platform}/{host.arch}</Text></Text>
              <Text style={s.kvLine}>uptime <Text style={s.kv}>{fmtUptime(host.uptimeSeconds)}</Text></Text>
            </View>
            <View style={s.kernelSection}>
              <Text style={s.kernelLabel}>Process</Text>
              <Text style={s.kvLine}>pid <Text style={s.kv}>{proc.pid}</Text></Text>
              <Text style={s.kvLine}>rss <Text style={s.kv}>{fmtBytes(proc.rssBytes)}</Text></Text>
              <Text style={s.kvLine}>heap <Text style={s.kv}>{fmtBytes(proc.heapUsedBytes)} / {fmtBytes(proc.heapTotalBytes)}</Text></Text>
            </View>
            <View style={s.kernelSection}>
              <Text style={s.kernelLabel}>System</Text>
              <Text style={s.kvLine}>total <Text style={s.kv}>{fmtBytes(system.totalMemoryBytes)}</Text></Text>
              <Text style={s.kvLine}>free <Text style={s.kv}>{fmtBytes(system.freeMemoryBytes)}</Text></Text>
              <Text style={s.kvLine}>used <Text style={s.kv}>{system.usedMemoryPercent.toFixed(1)}%</Text></Text>
            </View>
          </View>
        </GlassCard>

        {/* MEMORY — real heat grid */}
        <GlassCard style={s.card} accent={theme.blue}>
          <Text style={s.cardTitle}>Direct Memory Access</Text>
          <Text style={s.cardDesc}>Heap, RSS, and system RAM as real fractions of capacity</Text>
          <MemoryHeatGrid
            heapUsedFraction={heapFraction}
            rssFraction={rssFraction}
            systemUsedPercent={system.usedMemoryPercent}
          />
        </GlassCard>

        {/* TOGGLES — real, persisted, ledger-logged */}
        <GlassCard style={s.card} accent={theme.green}>
          <Text style={s.cardTitle}>Hardware Accelerated Logic Synthesis</Text>
          <Text style={s.cardDesc}>
            Toggle state is persisted server-side and every change is written to the Truth Ledger.
          </Text>
          <View style={s.hwToggles} testID="hardware-acceleration-panel">
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Enable Acceleration</Text>
                <Text style={s.toggleHint}>{toggles.accelEnabled ? 'active' : 'disabled'}</Text>
              </View>
              <Pressable
                onPress={() => onToggle('accelEnabled', !toggles.accelEnabled)}
                disabled={busy}
                style={[s.toggle, toggles.accelEnabled ? s.toggleOn : s.toggleOff, busy && s.toggleBusy]}
              >
                <View style={[s.toggleDot, toggles.accelEnabled ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
            <View style={s.toggleRow}>
              <View>
                <Text style={s.toggleLabel}>Deep Simulation</Text>
                <Text style={s.toggleHint}>{toggles.deepSim ? 'active' : 'disabled'}</Text>
              </View>
              <Pressable
                onPress={() => onToggle('deepSim', !toggles.deepSim)}
                disabled={busy}
                style={[s.toggle, toggles.deepSim ? s.toggleOn : s.toggleOff, busy && s.toggleBusy]}
              >
                <View style={[s.toggleDot, toggles.deepSim ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
          </View>
        </GlassCard>

        {/* OS ABSTRACTION — layered, driven by toggle state */}
        <GlassCard style={s.card} accent={theme.gold}>
          <Text style={s.cardTitle}>Sovereign OS Abstraction Layer</Text>
          <Text style={s.cardDesc}>Each layer is a real capability level, not a claim</Text>
          <View style={s.osStack} testID="sovereign-os-abstraction">
            <View style={[s.osLayer, { borderColor: `${theme.textMuted}44`, backgroundColor: `${theme.textMuted}10` }]}>
              <Text style={s.osIcon}>🖥</Text>
              <View style={s.osInfo}>
                <Text style={[s.osLabel, { color: theme.textMuted }]}>Host OS</Text>
                <Text style={s.osDesc}>{host.platform} {host.arch} · node {host.nodeVersion}</Text>
              </View>
              <StatusChip label="Stable" status="success" />
            </View>
            <View style={[s.osLayer, { borderColor: `${theme.blue}44`, backgroundColor: `${theme.blue}10`, marginTop: 8 }]}>
              <Text style={s.osIcon}>◇</Text>
              <View style={s.osInfo}>
                <Text style={[s.osLabel, { color: theme.blue }]}>Virtual Layer</Text>
                <Text style={s.osDesc}>
                  {toggles.deepSim ? 'deep simulation active' : 'sandboxed runtime idle'}
                </Text>
              </View>
              <StatusChip label={toggles.deepSim ? 'Active' : 'Idle'} status={toggles.deepSim ? 'active' : 'success'} />
            </View>
            <View style={[s.osLayer, { borderColor: `${theme.gold}44`, backgroundColor: `${theme.gold}10`, marginTop: 8 }]}>
              <Text style={s.osIcon}>★</Text>
              <View style={s.osInfo}>
                <Text style={[s.osLabel, { color: theme.gold }]}>Sovereign Layer</Text>
                <Text style={s.osDesc}>
                  {toggles.accelEnabled ? 'hardware acceleration enabled' : 'hardware acceleration disabled'}
                </Text>
              </View>
              <StatusChip label={toggles.accelEnabled ? 'Active' : 'Idle'} status={toggles.accelEnabled ? 'active' : 'success'} />
            </View>
          </View>
        </GlassCard>

        {/* INFO TILES — real values */}
        <View style={s.infoRow}>
          <InfoTile label="Bridge" value={error ? 'Down' : 'Up'} color={error ? theme.red : theme.cyan} icon="◉" />
          <InfoTile label="RSS" value={fmtBytes(proc.rssBytes)} color={theme.blue} icon="▣" />
          <InfoTile label="RAM" value={`${system.usedMemoryPercent.toFixed(0)}%`} color={theme.green} icon="◆" />
        </View>

        {error && (
          <Text style={s.inlineErr}>{error}</Text>
        )}
        {/* Debug — auth values */}
        <Text style={s.sectionLabel}>Auth Debug</Text>
        <GlassCard style={s.card} accent={theme.amber}>
          <AuthDebugPanel />
        </GlassCard>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  errMsg: { color: theme.textMuted, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.cyan },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3 },
  updated: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 2, marginBottom: 14 },
  card: { marginBottom: 12 },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 100,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginTop: -3,
  },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textMuted, fontSize: 12, marginBottom: 10 },
  kernelPanels: { gap: 12 },
  kernelSection: {},
  kernelLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  kvLine: { color: theme.textMuted, fontSize: 12, lineHeight: 18 },
  kv: { color: theme.text, fontFamily: 'monospace' },
  hwToggles: { gap: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: '600' },
  toggleHint: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.green}40` },
  toggleOff: { backgroundColor: theme.glassSoft },
  toggleBusy: { opacity: 0.5 },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  dotOn: { backgroundColor: theme.green, alignSelf: 'flex-end' },
  dotOff: { backgroundColor: theme.textMuted },
  osStack: {},
  osLayer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  osIcon: { fontSize: 20 },
  osInfo: { flex: 1 },
  osLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  osDesc: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' },
  infoRow: { flexDirection: 'row', gap: 8 },
  inlineErr: { color: theme.red, fontSize: 11, marginTop: 12, textAlign: 'center' },
});
