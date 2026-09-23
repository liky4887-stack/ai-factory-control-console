/**
 * screens/GodMode.tsx
 * Pure presentation. All data comes from the backend /god-mode endpoints.
 * No local fake nodes, no hardcoded percentages, no local-only toggles.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  ActivityIndicator,
  type DimensionValue,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { ProbabilityBar } from '../components/ProbabilityBar';
import { SubNav } from '../components/SubNav';
import { NebulaBackground } from '../components/NebulaBackground';
import { api } from '../services/api';
import { theme } from '../theme';
import type {
  LogicView, GodModeLogicGraph, LogicNodeColor,
  ChaosToggles, ChaosRun, ProbabilityReport,
  SearchMode, SearchResult, GodModeProjectMap,
} from '../types';

const FLOW_VIEWS: { key: LogicView; label: string }[] = [
  { key: 'data', label: 'Data Flow' },
  { key: 'state', label: 'State Flow' },
  { key: 'error', label: 'Error Flow' },
];

const SEARCH_MODES: SearchMode[] = ['Code', 'Ledger', 'Docs', 'Logs', 'All'];

const NODE_COLORS: Record<LogicNodeColor, string> = {
  cyan:   theme.cyan,
  blue:   theme.blue,
  purple: theme.purple,
  green:  theme.green,
  red:    theme.red,
  amber:  theme.amber,
  muted:  theme.textMuted,
};

const SCENARIO_COLORS: Record<'green' | 'red' | 'amber', string> = {
  green: theme.green,
  red:   theme.red,
  amber: theme.amber,
};

export function GodMode() {
  // ── Logic graph ──────────────────────────────────────────────
  const [flowView, setFlowView] = useState<LogicView>('data');
  const [graph, setGraph] = useState<GodModeLogicGraph | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // ── Probability ──────────────────────────────────────────────
  const [report, setReport] = useState<ProbabilityReport | null>(null);

  // ── Chaos ────────────────────────────────────────────────────
  const [chaosToggles, setChaosToggles] = useState<ChaosToggles>({
    edgeCases: false, latencyStorm: false, dataCorruption: false,
  });
  const [chaosRun, setChaosRun] = useState<ChaosRun | null>(null);
  const [chaosBusy, setChaosBusy] = useState(false);

  // ── Search ───────────────────────────────────────────────────
  const [searchMode, setSearchMode] = useState<SearchMode>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  // ── Project map ──────────────────────────────────────────────
  const [projectMap, setProjectMap] = useState<GodModeProjectMap | null>(null);

  // ── Errors ───────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);

  // ── Initial loads ────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [p, m] = await Promise.all([
        api.getGodModeProbability(),
        api.getGodModeProjectMap(),
      ]);
      setReport(p);
      setProjectMap(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach backend');
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // ── Load graph when view changes ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setGraphLoading(true);
    (async () => {
      try {
        const g = await api.getGodModeLogic(flowView);
        if (!cancelled) setGraph(g);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'graph fetch failed');
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [flowView]);

  // ── Chaos actions ────────────────────────────────────────────
  const onToggleChaos = (key: keyof ChaosToggles) => {
    setChaosToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const unleashChaos = async () => {
    setChaosBusy(true);
    setError(null);
    try {
      const run = await api.postGodModeChaos(chaosToggles);
      setChaosRun(run);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'chaos run failed');
    } finally {
      setChaosBusy(false);
    }
  };

  // ── Search ───────────────────────────────────────────────────
  const runSearch = async () => {
    setSearchBusy(true);
    setError(null);
    try {
      const r = await api.searchGodMode(searchQuery, searchMode);
      setSearchResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'search failed');
    } finally {
      setSearchBusy(false);
    }
  };

  const nodes = graph?.nodes ?? [];

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>God Mode</Text>
        <Text style={s.sub}>Logic visualization, chaos testing, and probability analysis</Text>
        {graph && (
          <Text style={s.window}>
            ledger window: {graph.totalEvents} events · updated on view change
          </Text>
        )}

        {error && <Text style={s.errBanner}>{error}</Text>}

        {/* ── Logic Visualizer ──────────────────────────────── */}
        <GlassCard style={s.card} accent={theme.cyan}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Logic Visualizer</Text>
            <SubNav tabs={FLOW_VIEWS} active={flowView} onChange={(v) => setFlowView(v as LogicView)} />
          </View>
          <View style={s.graphCanvas} testID="logic-visualizer">
            {graphLoading && (
              <View style={s.center}><ActivityIndicator color={theme.cyan} /></View>
            )}
            {!graphLoading && nodes.map((n) => {
              const color = NODE_COLORS[n.color] ?? theme.textMuted;
              return (
                <View
                  key={n.id}
                  style={[s.node, {
                    left: `${n.x}%`, top: `${n.y}%`,
                    borderColor: `${color}66`, backgroundColor: `${color}18`,
                  }]}
                >
                  <Text style={[s.nodeLabel, { color }]}>{n.label}</Text>
                  <Text style={[s.nodeCount, { color }]}>{n.count}</Text>
                </View>
              );
            })}
            {!graphLoading && nodes.slice(0, -1).map((n, i) => {
              const next = nodes[i + 1];
              return (
                <View
                  key={`l${i}`}
                  style={[s.link, { left: `${n.x}%`, top: `${n.y + 5}%`, width: `${Math.max(0, next.x - n.x)}%` }]}
                />
              );
            })}
          </View>
        </GlassCard>

        {/* ── Chaos Engine ─────────────────────────────────── */}
        <GlassCard style={s.card} accent={theme.amber}>
          <Text style={s.cardTitle}>Chaos Engine</Text>
          <Text style={s.cardDesc}>
            Runs a real projection against the Truth Ledger and records an OMEGA_ACTION entry.
          </Text>
          <View style={s.chaosToggles} testID="chaos-engine-panel">
            <ChaosRow label="Random Edge Cases" value={chaosToggles.edgeCases} onPress={() => onToggleChaos('edgeCases')} />
            <ChaosRow label="Latency Storm" value={chaosToggles.latencyStorm} onPress={() => onToggleChaos('latencyStorm')} />
            <ChaosRow label="Data Corruption" value={chaosToggles.dataCorruption} onPress={() => onToggleChaos('dataCorruption')} />
          </View>
          <Pressable
            onPress={unleashChaos}
            disabled={chaosBusy}
            style={({ pressed }) => [s.chaosBtn, pressed && s.pressed, chaosBusy && s.btnBusy]}
            testID="unleash-chaos-button"
          >
            <Text style={s.chaosBtnText}>{chaosBusy ? 'RUNNING…' : 'UNLEASH CHAOS'}</Text>
          </Pressable>

          {chaosRun && (
            <View style={s.chaosResult}>
              <Text style={s.chaosLine}>
                risk <Text style={s.mono}>{chaosRun.projection.riskLevel.toUpperCase()}</Text>
              </Text>
              <Text style={s.chaosLine}>
                projected latency <Text style={s.mono}>{chaosRun.projection.projectedLatencyMs} ms</Text>
              </Text>
              <Text style={s.chaosLine}>
                projected error rate <Text style={s.mono}>{(chaosRun.projection.projectedErrorRate * 100).toFixed(1)}%</Text>
              </Text>
              <Text style={s.chaosLine}>
                edge case count <Text style={s.mono}>{chaosRun.projection.projectedEdgeCaseCount}</Text>
              </Text>
              {chaosRun.projection.notes.map((n, i) => (
                <Text key={i} style={s.chaosNote}>· {n}</Text>
              ))}
              <Text style={s.chaosRef}>logged: {chaosRun.ledgerEntryId}</Text>
            </View>
          )}
        </GlassCard>

        {/* ── Probability Engine ───────────────────────────── */}
        <GlassCard style={s.card} accent={theme.purple}>
          <Text style={s.cardTitle}>Probability Engine</Text>
          <Text style={s.cardDesc}>
            {report
              ? `${report.totalSamples} classified events in ${report.windowEntries}-event ledger window${report.sufficientData ? '' : ' (insufficient data)'}`
              : 'Computing from Truth Ledger…'}
          </Text>
          <View style={s.probPanel} testID="probability-engine-panel">
            {(report?.scenarios ?? []).map((sc) => (
              <ProbabilityBar
                key={sc.label}
                label={sc.label}
                value={sc.value}
                color={SCENARIO_COLORS[sc.color]}
              />
            ))}
          </View>
          {report && (
            <View style={s.scenarioCards}>
              {report.scenarios.map((sc) => (
                <View key={sc.label} style={[s.scCard, { borderColor: `${SCENARIO_COLORS[sc.color]}44`, backgroundColor: `${SCENARIO_COLORS[sc.color]}10` }]}>
                  <Text style={[s.scLabel, { color: SCENARIO_COLORS[sc.color] }]}>{sc.label}</Text>
                  <Text style={s.scVal}>{sc.value}%</Text>
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        {/* ── Omni Search ──────────────────────────────────── */}
        <GlassCard style={s.card} accent={theme.blue}>
          <Text style={s.cardTitle}>Omni Search</Text>
          <Text style={s.cardDesc}>Searches the Truth Ledger by type, source, payload, or tags.</Text>
          <View style={s.searchModes} testID="omni-search">
            {SEARCH_MODES.map((m) => (
              <Pressable
                key={m}
                onPress={() => setSearchMode(m)}
                style={({ pressed }) => [s.searchPill, searchMode === m && s.searchPillActive, pressed && s.pressed]}
              >
                <Text style={[s.searchPillText, searchMode === m && s.searchPillTextActive]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.searchInputRow}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="type a query…"
              placeholderTextColor={theme.textMuted}
              style={s.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={runSearch}
            />
            <Pressable
              onPress={runSearch}
              disabled={searchBusy}
              style={({ pressed }) => [s.searchBtn, pressed && s.pressed, searchBusy && s.btnBusy]}
            >
              <Text style={s.searchBtnText}>{searchBusy ? '…' : 'GO'}</Text>
            </Pressable>
          </View>
          {searchResult && (
            <View style={s.searchResults}>
              <Text style={s.searchMeta}>
                {searchResult.total} hit{searchResult.total === 1 ? '' : 's'} · mode {searchResult.mode}
              </Text>
              {searchResult.hits.slice(0, 8).map((h) => (
                <View key={h.id} style={s.searchHit}>
                  <Text style={s.searchHitType}>{h.type}</Text>
                  <Text style={s.searchHitSrc} numberOfLines={1}>{h.source}</Text>
                  <Text style={s.searchHitSnippet} numberOfLines={2}>{h.snippet}</Text>
                </View>
              ))}
              {searchResult.total === 0 && <Text style={s.searchEmpty}>no matches</Text>}
            </View>
          )}
        </GlassCard>

        {/* ── Project Map ──────────────────────────────────── */}
        <GlassCard style={s.card} accent={theme.green}>
          <Text style={s.cardTitle}>Global Project Map</Text>
          <Text style={s.cardDesc}>
            {projectMap
              ? `${projectMap.nodes.length} project${projectMap.nodes.length === 1 ? '' : 's'} on record`
              : 'Loading…'}
          </Text>
          <View style={s.mapCanvas} testID="global-project-map">
            {(projectMap?.nodes ?? []).slice(0, 8).map((n, i, arr) => {
              const positions: Array<{ left: DimensionValue; top: DimensionValue }> = [
                { left: '10%', top: '18%' },
                { left: '45%', top: '12%' },
                { left: '68%', top: '48%' },
                { left: '22%', top: '58%' },
                { left: '55%', top: '62%' },
                { left: '5%', top: '40%' },
                { left: '78%', top: '15%' },
                { left: '35%', top: '35%' },
              ];
              const pos = positions[i % positions.length];
              const color = n.archived ? theme.textMuted : (n.openTaskCount > 0 ? theme.cyan : theme.green);
              return (
                <View
                  key={n.id}
                  style={[s.mapNode, {
                    left: pos.left, top: pos.top,
                    borderColor: `${color}66`, backgroundColor: `${color}18`,
                  }]}
                >
                  <Text style={[s.mapNodeLabel, { color }]} numberOfLines={1}>{n.label}</Text>
                  <Text style={s.mapNodeMeta}>{n.taskCount} task{n.taskCount === 1 ? '' : 's'}</Text>
                </View>
              );
            })}
            {projectMap && projectMap.nodes.length === 0 && (
              <Text style={s.mapEmpty}>no projects yet</Text>
            )}
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function ChaosRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Pressable onPress={onPress} style={[s.toggle, value ? s.toggleOn : s.toggleOff]}>
        <View style={[s.toggleDot, value ? s.dotOn : s.dotOff]} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3 },
  window: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 2, marginBottom: 14 },
  errBanner: { color: theme.red, fontSize: 12, fontFamily: 'monospace', marginBottom: 12 },
  card: { marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textMuted, fontSize: 12, marginBottom: 10 },
  graphCanvas: { height: 180, backgroundColor: 'rgba(8, 11, 17, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: theme.border, position: 'relative' },
  node: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  nodeLabel: { fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  nodeCount: { fontSize: 12, fontWeight: '800', fontFamily: 'monospace', marginTop: 2 },
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
  btnBusy: { opacity: 0.6 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  chaosBtnText: { color: '#FFD8DC', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  chaosResult: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: theme.glassSoft, gap: 4 },
  chaosLine: { color: theme.textMuted, fontSize: 12 },
  chaosNote: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  chaosRef: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 6 },
  mono: { color: theme.text, fontFamily: 'monospace' },
  probPanel: { marginBottom: 12 },
  scenarioCards: { flexDirection: 'row', gap: 8 },
  scCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, alignItems: 'center' },
  scLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  scVal: { color: theme.text, fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },
  searchModes: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  searchPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  searchPillActive: { backgroundColor: `${theme.cyan}20`, borderColor: theme.cyan },
  searchPillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  searchPillTextActive: { color: theme.cyan, fontWeight: '800' },
  searchInputRow: { flexDirection: 'row', gap: 6 },
  searchInput: { flex: 1, height: 40, borderRadius: 10, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: theme.text, fontSize: 13 },
  searchBtn: { paddingHorizontal: 16, height: 40, borderRadius: 10, backgroundColor: theme.cyan, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#000', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  searchResults: { marginTop: 12, gap: 6 },
  searchMeta: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  searchHit: { padding: 10, borderRadius: 8, backgroundColor: theme.glassSoft, gap: 2 },
  searchHitType: { color: theme.cyan, fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  searchHitSrc: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace' },
  searchHitSnippet: { color: theme.textSecondary, fontSize: 11, marginTop: 2 },
  searchEmpty: { color: theme.textMuted, fontSize: 11, fontStyle: 'italic' },
  mapCanvas: { height: 220, backgroundColor: 'rgba(8, 11, 17, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: theme.border, position: 'relative' },
  mapNode: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, maxWidth: 140 },
  mapNodeLabel: { fontSize: 10, fontWeight: '700' },
  mapNodeMeta: { color: theme.textMuted, fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
  mapEmpty: { color: theme.textMuted, fontSize: 11, position: 'absolute', top: '45%', left: 0, right: 0, textAlign: 'center' },
});
