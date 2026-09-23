import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { MemoryHeatGrid } from '../components/MemoryHeatGrid';
import { InfoTile } from '../components/InfoTile';
import { NebulaBackground } from '../components/NebulaBackground';
import { theme } from '../theme';

const OS_LAYERS = [
  { label: 'Host OS', desc: 'Physical machine layer', color: theme.textMuted, icon: '🖥' },
  { label: 'Virtual Layer', desc: 'Sandboxed runtime', color: theme.blue, icon: '◇' },
  { label: 'Sovereign Layer', desc: 'Autonomous control', color: theme.gold, icon: '★' },
];

export function SystemPower() {
  const [accelEnabled, setAccelEnabled] = useState(true);
  const [deepSim, setDeepSim] = useState(false);

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>System Power Layer</Text>
        <Text style={s.sub}>Native bridge, memory, hardware, and OS abstraction</Text>

        <GlassCard style={s.card} accent={theme.cyan}>
          <Text style={s.cardTitle}>Kernel Level System Bridge</Text>
          <View style={s.kernelPanels} testID="kernel-system-bridge">
            <View style={s.kernelSection}>
              <Text style={s.kernelLabel}>File Operations</Text>
              <View style={s.kernelBtns}>
                <CommandButton label="Read" variant="secondary" onPress={() => {}} />
                <CommandButton label="Write" variant="secondary" onPress={() => {}} />
                <CommandButton label="Sync" variant="secondary" onPress={() => {}} />
              </View>
            </View>
            <View style={s.kernelSection}>
              <Text style={s.kernelLabel}>Script Triggers</Text>
              <View style={s.kernelBtns}>
                <CommandButton label="Run" variant="secondary" onPress={() => {}} />
                <CommandButton label="Schedule" variant="secondary" onPress={() => {}} />
                <CommandButton label="Cancel" variant="danger" onPress={() => {}} />
              </View>
            </View>
            <View style={s.kernelSection}>
              <Text style={s.kernelLabel}>Resource Controls</Text>
              <View style={s.kernelBtns}>
                <CommandButton label="Allocate" variant="secondary" onPress={() => {}} />
                <CommandButton label="Throttle" variant="secondary" onPress={() => {}} />
                <CommandButton label="Release" variant="secondary" onPress={() => {}} />
              </View>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.blue}>
          <Text style={s.cardTitle}>Direct Memory Access</Text>
          <Text style={s.cardDesc}>Visual memory map heat grid across system zones</Text>
          <MemoryHeatGrid />
        </GlassCard>

        <GlassCard style={s.card} accent={theme.green}>
          <Text style={s.cardTitle}>Hardware Accelerated Logic Synthesis</Text>
          <View style={s.gpuPanel} testID="hardware-acceleration-panel">
            <View style={s.gpuBar}>
              <Text style={s.gpuLabel}>GPU Core</Text>
              <View style={s.gpuTrack}><View style={[s.gpuFill, { width: '67%', backgroundColor: theme.green }]} /></View>
              <Text style={s.gpuVal}>67%</Text>
            </View>
            <View style={s.gpuBar}>
              <Text style={s.gpuLabel}>Tensor</Text>
              <View style={s.gpuTrack}><View style={[s.gpuFill, { width: '84%', backgroundColor: theme.cyan }]} /></View>
              <Text style={s.gpuVal}>84%</Text>
            </View>
            <View style={s.gpuBar}>
              <Text style={s.gpuLabel}>Neural</Text>
              <View style={s.gpuTrack}><View style={[s.gpuFill, { width: '45%', backgroundColor: theme.purple }]} /></View>
              <Text style={s.gpuVal}>45%</Text>
            </View>
            <View style={s.gpuBar}>
              <Text style={s.gpuLabel}>Cache</Text>
              <View style={s.gpuTrack}><View style={[s.gpuFill, { width: '92%', backgroundColor: theme.amber }]} /></View>
              <Text style={s.gpuVal}>92%</Text>
            </View>
          </View>
          <View style={s.hwToggles}>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Enable Acceleration</Text>
              <Pressable onPress={() => setAccelEnabled(!accelEnabled)} style={[s.toggle, accelEnabled ? s.toggleOn : s.toggleOff]}>
                <View style={[s.toggleDot, accelEnabled ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Deep Simulation</Text>
              <Pressable onPress={() => setDeepSim(!deepSim)} style={[s.toggle, deepSim ? s.toggleOn : s.toggleOff]}>
                <View style={[s.toggleDot, deepSim ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.gold}>
          <Text style={s.cardTitle}>Sovereign OS Abstraction Layer</Text>
          <Text style={s.cardDesc}>Stacked layers from hardware to sovereign control</Text>
          <View style={s.osStack} testID="sovereign-os-abstraction">
            {OS_LAYERS.map((layer, i) => (
              <View key={i} style={[s.osLayer, { borderColor: `${layer.color}44`, backgroundColor: `${layer.color}10`, marginBottom: i < OS_LAYERS.length - 1 ? 8 : 0 }]}>
                <Text style={s.osIcon}>{layer.icon}</Text>
                <View style={s.osInfo}>
                  <Text style={[s.osLabel, { color: layer.color }]}>{layer.label}</Text>
                  <Text style={s.osDesc}>{layer.desc}</Text>
                </View>
                <StatusChip label={i === 2 ? 'Active' : 'Stable'} status={i === 2 ? 'active' : 'success'} />
              </View>
            ))}
          </View>
        </GlassCard>

        <View style={s.infoRow}>
          <InfoTile label="Bridge" value="Active" color={theme.cyan} icon="◉" />
          <InfoTile label="Memory" value="2.4GB" color={theme.blue} icon="▣" />
          <InfoTile label="GPU" value="67%" color={theme.green} icon="◆" />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 14 },
  card: { marginBottom: 12 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textMuted, fontSize: 12, marginBottom: 10 },
  kernelPanels: { gap: 12 },
  kernelSection: {},
  kernelLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  kernelBtns: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  gpuPanel: { gap: 8, marginBottom: 12 },
  gpuBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpuLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', width: 56 },
  gpuTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  gpuFill: { height: '100%', borderRadius: 4 },
  gpuVal: { color: theme.text, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', width: 36 },
  hwToggles: { gap: 4 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  toggleLabel: { color: theme.textSecondary, fontSize: 13 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.green}40` },
  toggleOff: { backgroundColor: theme.glassSoft },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  dotOn: { backgroundColor: theme.green, alignSelf: 'flex-end' },
  dotOff: { backgroundColor: theme.textMuted },
  osStack: {},
  osLayer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  osIcon: { fontSize: 20 },
  osInfo: { flex: 1 },
  osLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  osDesc: { color: theme.textMuted, fontSize: 11 },
  infoRow: { flexDirection: 'row', gap: 8 },
});
