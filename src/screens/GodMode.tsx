import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { ProbabilityBar } from '../components/ProbabilityBar';
import { SubNav } from '../components/SubNav';
import { NebulaBackground } from '../components/NebulaBackground';
import { theme } from '../theme';

const FLOW_VIEWS = [
  { key: 'data', label: 'Data Flow' },
  { key: 'state', label: 'State Flow' },
  { key: 'error', label: 'Error Flow' },
];

const SCENARIOS = [
  { label: 'Success', value: 72, color: theme.green },
  { label: 'Failure', value: 18, color: theme.red },
  { label: 'Edge Case', value: 10, color: theme.amber },
];

const NODES_DATA: Array<{ x: number; y: number; label: string; color: string }> = [
  { x: 20, y: 30, label: 'Input', color: theme.cyan },
  { x: 50, y: 20, label: 'Parse', color: theme.blue },
  { x: 50, y: 50, label: 'Validate', color: theme.blue },
  { x: 80, y: 35, label: 'Store', color: theme.purple },
];

const NODES_STATE: Array<{ x: number; y: number; label: string; color: string }> = [
  { x: 15, y: 40, label: 'Idle', color: theme.textMuted },
  { x: 40, y: 25, label: 'Loading', color: theme.cyan },
  { x: 65, y: 40, label: 'Active', color: theme.green },
  { x: 85, y: 25, label: 'Error', color: theme.red },
];

const NODES_ERROR: Array<{ x: number; y: number; label: string; color: string }> = [
  { x: 20, y: 35, label: 'Try', color: theme.green },
  { x: 50, y: 25, label: 'Catch', color: theme.amber },
  { x: 50, y: 50, label: 'Log', color: theme.blue },
  { x: 80, y: 35, label: 'Recover', color: theme.cyan },
];

export function GodMode() {
  const [flowView, setFlowView] = useState('data');
  const [chaosActive, setChaosActive] = useState(false);
  const [edgeCases, setEdgeCases] = useState(true);
  const [latencyStorm, setLatencyStorm] = useState(false);
  const [dataCorruption, setDataCorruption] = useState(false);

  const nodes = flowView === 'data' ? NODES_DATA : flowView === 'state' ? NODES_STATE : NODES_ERROR;

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>God Mode</Text>
        <Text style={s.sub}>Logic visualization, chaos testing, and probability analysis</Text>

        <GlassCard style={s.card} accent={theme.cyan}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Logic Visualizer</Text>
            <SubNav tabs={FLOW_VIEWS} active={flowView} onChange={setFlowView} />
          </View>
          <View style={s.graphCanvas} testID="logic-visualizer">
            {nodes.map((n, i) => (
              <View key={i} style={[s.node, { left: `${n.x}%`, top: `${n.y}%`, borderColor: `${n.color}66`, backgroundColor: `${n.color}18` }]}>
                <Text style={[s.nodeLabel, { color: n.color }]}>{n.label}</Text>
              </View>
            ))}
            {nodes.slice(0, -1).map((n, i) => {
              const next = nodes[i + 1];
              return <View key={`l${i}`} style={[s.link, { left: `${n.x}%`, top: `${n.y + 5}%`, width: `${next.x - n.x}%` }]} />;
            })}
          </View>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.amber}>
          <Text style={s.cardTitle}>Chaos Engine</Text>
          <Text style={s.cardDesc}>Stress test the system with simulated edge conditions</Text>
          <View style={s.chaosToggles} testID="chaos-engine-panel">
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Random Edge Cases</Text>
              <Pressable onPress={() => setEdgeCases(!edgeCases)} style={[s.toggle, edgeCases ? s.toggleOn : s.toggleOff]}>
                <View style={[s.toggleDot, edgeCases ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Latency Storm</Text>
              <Pressable onPress={() => setLatencyStorm(!latencyStorm)} style={[s.toggle, latencyStorm ? s.toggleOn : s.toggleOff]}>
                <View style={[s.toggleDot, latencyStorm ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Data Corruption</Text>
              <Pressable onPress={() => setDataCorruption(!dataCorruption)} style={[s.toggle, dataCorruption ? s.toggleOn : s.toggleOff]}>
                <View style={[s.toggleDot, dataCorruption ? s.dotOn : s.dotOff]} />
              </Pressable>
            </View>
          </View>
          <Pressable
            onPress={() => setChaosActive(!chaosActive)}
            style={({ pressed }) => [s.chaosBtn, pressed && s.pressed, chaosActive && s.chaosBtnActive]}
            testID="unleash-chaos-button"
          >
            <Text style={[s.chaosBtnText, chaosActive && s.chaosBtnTextActive]}>{chaosActive ? 'CHAOS ACTIVE' : 'UNLEASH CHAOS'}</Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.purple}>
          <Text style={s.cardTitle}>Probability Engine</Text>
          <Text style={s.cardDesc}>Hypothetical scenario analysis with stacked probability bars</Text>
          <View style={s.probPanel} testID="probability-engine-panel">
            {SCENARIOS.map((sc) => (
              <ProbabilityBar key={sc.label} label={sc.label} value={sc.value} color={sc.color} />
            ))}
          </View>
          <View style={s.scenarioCards}>
            {SCENARIOS.map((sc) => (
              <View key={sc.label} style={[s.scCard, { borderColor: `${sc.color}44`, backgroundColor: `${sc.color}10` }]}>
                <Text style={[s.scLabel, { color: sc.color }]}>{sc.label}</Text>
                <Text style={s.scVal}>{sc.value}%</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.blue}>
          <Text style={s.cardTitle}>Omni Search</Text>
          <View style={s.searchModes} testID="omni-search">
            {['Code', 'Ledger', 'Docs', 'Logs', 'All'].map((m) => (
              <Pressable key={m} style={({ pressed }) => [s.searchPill, pressed && s.pressed]}>
                <Text style={s.searchPillText}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.searchHint}>Global search across all system sources</Text>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.green}>
          <Text style={s.cardTitle}>Global Project Map</Text>
          <Text style={s.cardDesc}>Node graph of all projects and their relationships</Text>
          <View style={s.mapCanvas} testID="global-project-map">
            <View style={[s.mapNode, { left: '15%', top: '20%', borderColor: `${theme.cyan}66`, backgroundColor: `${theme.cyan}18` }]}>
              <Text style={[s.mapNodeLabel, { color: theme.cyan }]}>Quantum</Text>
            </View>
            <View style={[s.mapNode, { left: '50%', top: '15%', borderColor: `${theme.blue}66`, backgroundColor: `${theme.blue}18` }]}>
              <Text style={[s.mapNodeLabel, { color: theme.blue }]}>Neural</Text>
            </View>
            <View style={[s.mapNode, { left: '70%', top: '50%', borderColor: `${theme.purple}66`, backgroundColor: `${theme.purple}18` }]}>
              <Text style={[s.mapNodeLabel, { color: theme.purple }]}>Cipher</Text>
            </View>
            <View style={[s.mapNode, { left: '25%', top: '60%', borderColor: `${theme.amber}66`, backgroundColor: `${theme.amber}18` }]}>
              <Text style={[s.mapNodeLabel, { color: theme.amber }]}>Forge</Text>
            </View>
          </View>
          <View style={s.filterRow}>
            {['By Domain', 'By Dependency', 'By Status'].map((f) => (
              <Pressable key={f} style={({ pressed }) => [s.filterPill, pressed && s.pressed]}>
                <Text style={s.filterPillText}>{f}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textMuted, fontSize: 12, marginBottom: 10 },
  graphCanvas: { height: 180, backgroundColor: 'rgba(8, 11, 17, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: theme.border, position: 'relative' },
  node: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  nodeLabel: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  link: { position: 'absolute', height: 1, backgroundColor: `${theme.cyan}33` },
  chaosToggles: { gap: 4, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  toggleLabel: { color: theme.textSecondary, fontSize: 13 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.amber}40` },
  toggleOff: { backgroundColor: theme.glassSoft },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  dotOn: { backgroundColor: theme.amber, alignSelf: 'flex-end' },
  dotOff: { backgroundColor: theme.textMuted },
  chaosBtn: { backgroundColor: '#3A1518', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FF6B7A66' },
  chaosBtnActive: { backgroundColor: theme.red, borderColor: theme.red },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  chaosBtnText: { color: '#FFD8DC', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  chaosBtnTextActive: { color: '#FFFFFF' },
  probPanel: { marginBottom: 12 },
  scenarioCards: { flexDirection: 'row', gap: 8 },
  scCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, alignItems: 'center' },
  scLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  scVal: { color: theme.text, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },
  searchModes: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  searchPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  searchPillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  searchHint: { color: theme.textMuted, fontSize: 11 },
  mapCanvas: { height: 160, backgroundColor: 'rgba(8, 11, 17, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: theme.border, position: 'relative', marginBottom: 10 },
  mapNode: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  mapNodeLabel: { fontSize: 10, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  filterPillText: { color: theme.textSecondary, fontSize: 11 },
});
