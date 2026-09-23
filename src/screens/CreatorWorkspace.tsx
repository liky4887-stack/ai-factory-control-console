import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { ProjectCard, type ProjectInfo } from '../components/ProjectCard';
import { SubNav } from '../components/SubNav';
import { NebulaBackground } from '../components/NebulaBackground';
import { theme } from '../theme';

const SAMPLE_PROJECTS: ProjectInfo[] = [
  { id: 'p1', name: 'Quantum Analytics', status: 'active', updated: '2m ago', domain: 'Data' },
  { id: 'p2', name: 'Neural Commerce', status: 'draft', updated: '15m ago', domain: 'Commerce' },
  { id: 'p3', name: 'Cipher Protocol', status: 'active', updated: '1h ago', domain: 'Security' },
  { id: 'p4', name: 'Legacy Forge', status: 'archived', updated: '3d ago', domain: 'DevOps' },
];

const PREVIEW_TABS = [
  { key: 'preview', label: 'Preview' },
  { key: 'blueprint', label: 'Blueprint' },
  { key: 'flow', label: 'Flow' },
];

const SAMPLE_CODE = `// Auto-generated blueprint
import { SovereignModule } from '@core';
import { AgentRouter } from '@swarm';

export const QuantumAnalytics = SovereignModule
  .compose({
    name: 'Quantum Analytics',
    domain: 'Data',
    agents: ['scout-01', 'builder-02'],
    guardrails: ['multi-confirm', 'fallback'],
  })
  .deploy();`;

export function CreatorWorkspace() {
  const [prompt, setPrompt] = useState('');
  const [previewTab, setPreviewTab] = useState('preview');
  const [selectedProject, setSelectedProject] = useState<string | null>('p1');
  const [model, setModel] = useState('DeepSeek-V3');
  const [temp, setTemp] = useState(0.7);
  const [sysMode, setSysMode] = useState('CONTROLLED');

  const current = SAMPLE_PROJECTS.find((p) => p.id === selectedProject);

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>Creator Workspace</Text>
        <Text style={s.sub}>Architect, build, and preview sovereign projects</Text>

        <Text style={s.sectionLabel}>Projects</Text>
        <View testID="project-factory-list">
          {SAMPLE_PROJECTS.map((p) => (
            <ProjectCard key={p.id} project={p} onPress={() => setSelectedProject(p.id)} />
          ))}
        </View>

        {current ? (
          <GlassCard style={s.card} accent={theme.cyan}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>{current.name}</Text>
              <StatusChip label={current.status} status={current.status} />
            </View>
            <Text style={s.domain}>{current.domain} · Updated {current.updated}</Text>
          </GlassCard>
        ) : null}

        <Text style={s.sectionLabel}>Split View</Text>
        <View style={s.splitRow} testID="split-screen-creator-view">
          <GlassCard style={s.splitLeft}>
            <Text style={s.panelTitle}>Prompt Context</Text>
            <Text style={s.outlineItem}>• Module: Quantum Analytics</Text>
            <Text style={s.outlineItem}>• Domain: Data</Text>
            <Text style={s.outlineItem}>• Agents: scout-01, builder-02</Text>
            <Text style={s.outlineItem}>• Guardrails: multi-confirm</Text>
            <Text style={s.outlineItem}>• Version: v0.3</Text>
          </GlassCard>
          <GlassCard style={s.splitCenter}>
            <Text style={s.panelTitle}>Blueprint Editor</Text>
            <ScrollView style={s.codeScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.code}>{SAMPLE_CODE}</Text>
            </ScrollView>
          </GlassCard>
        </View>

        <GlassCard style={s.previewCard} accent={theme.purple}>
          <View style={s.previewHead}>
            <Text style={s.panelTitle}>Live Preview</Text>
            <SubNav tabs={PREVIEW_TABS} active={previewTab} onChange={setPreviewTab} />
          </View>
          <View style={s.previewBody} testID="live-preview-panel">
            {previewTab === 'preview' && (
              <View style={s.previewPlaceholder}>
                <Text style={s.previewIcon}>▣</Text>
                <Text style={s.previewText}>Rendering {current?.name ?? 'project'}…</Text>
                <Text style={s.previewHint}>UI preview will appear here</Text>
              </View>
            )}
            {previewTab === 'blueprint' && (
              <View>
                <Text style={s.bpNode}>[UI] → [API] → [Data] → [AI Agents]</Text>
                <Text style={s.bpNode}>[Logic] ← [Guardrails] ← [Ledger]</Text>
              </View>
            )}
            {previewTab === 'flow' && (
              <View>
                <Text style={s.flowStep}>1. Prompt → Parse</Text>
                <Text style={s.flowStep}>2. Parse → Blueprint</Text>
                <Text style={s.flowStep}>3. Blueprint → Agents</Text>
                <Text style={s.flowStep}>4. Agents → Preview</Text>
                <Text style={s.flowStep}>5. Preview → Deploy</Text>
              </View>
            )}
          </View>
        </GlassCard>

        <Text style={s.sectionLabel}>Version Timeline</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeline} testID="version-timeline">
          {['v0', 'v0.1', 'v0.2', 'v0.3', 'v1'].map((v, i) => (
            <Pressable key={v} style={({ pressed }) => [s.checkpoint, pressed && s.pressed]}>
              <View style={[s.cpDot, i === 3 && s.cpDotActive]} />
              <Text style={s.cpLabel}>{v}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <GlassCard style={s.correctionCard} accent={theme.amber}>
          <Text style={s.panelTitle}>Self Correction</Text>
          <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>Auto Review</Text>
            <Pressable style={[s.toggle, s.toggleOn]}><View style={[s.toggleDot, s.dotOn]} /></Pressable>
          </View>
          <Text style={s.issueItem}>• Unused import: AgentRouter</Text>
          <Text style={s.issueItem}>• Missing fallback on deploy()</Text>
          <View style={s.correctionBtns}>
            <CommandButton label="Propose Fix" variant="secondary" onPress={() => {}} />
            <CommandButton label="Simulate" variant="secondary" onPress={() => {}} />
            <CommandButton label="Apply Patch" variant="primary" onPress={() => {}} />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={s.promptBar} testID="persistent-prompt-bar">
        <View style={s.promptControls}>
          <Pressable style={s.modelPill} onPress={() => setModel(model === 'DeepSeek-V3' ? 'GPT-5' : 'DeepSeek-V3')}>
            <Text style={s.modelLabel}>{model}</Text>
          </Pressable>
          <View style={s.tempWrap}>
            <Text style={s.tempLabel}>Temp: {temp.toFixed(1)}</Text>
            <Pressable style={s.tempBtn} onPress={() => setTemp(Math.max(0, temp - 0.1))}><Text style={s.tempBtnText}>-</Text></Pressable>
            <Pressable style={s.tempBtn} onPress={() => setTemp(Math.min(1, temp + 0.1))}><Text style={s.tempBtnText}>+</Text></Pressable>
          </View>
          <Pressable style={s.modePill} onPress={() => setSysMode(sysMode === 'CONTROLLED' ? 'EXPERIMENTAL' : 'CONTROLLED')}>
            <Text style={s.modeLabel}>{sysMode}</Text>
          </Pressable>
        </View>
        <View style={s.promptInputRow}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe what you want the system to build or change…"
            placeholderTextColor={theme.textMuted}
            style={s.promptInput}
            multiline
          />
          <Pressable style={({ pressed }) => [s.executeBtn, pressed && s.pressed]} testID="execute-button">
            <Text style={s.executeText}>EXECUTE</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 14 },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  card: { marginBottom: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  domain: { color: theme.textMuted, fontSize: 11, marginTop: 4 },
  splitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  splitLeft: { flex: 1, padding: 12 },
  splitCenter: { flex: 1.4, padding: 12 },
  panelTitle: { color: theme.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  outlineItem: { color: theme.textSecondary, fontSize: 12, lineHeight: 20, fontFamily: 'monospace' },
  codeScroll: { maxHeight: 180 },
  code: { color: theme.cyan, fontSize: 11, fontFamily: 'monospace', lineHeight: 17 },
  previewCard: { marginBottom: 12 },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  previewBody: { minHeight: 120, justifyContent: 'center', alignItems: 'center' },
  previewPlaceholder: { alignItems: 'center' },
  previewIcon: { fontSize: 32, color: theme.purple, marginBottom: 8 },
  previewText: { color: theme.text, fontSize: 14, fontWeight: '600' },
  previewHint: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  bpNode: { color: theme.cyan, fontSize: 12, fontFamily: 'monospace', lineHeight: 20 },
  flowStep: { color: theme.textSecondary, fontSize: 12, lineHeight: 22, fontFamily: 'monospace' },
  timeline: { flexDirection: 'row', marginBottom: 12 },
  checkpoint: { alignItems: 'center', marginRight: 24, padding: 4 },
  pressed: { opacity: 0.7 },
  cpDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.glassSoft, borderWidth: 2, borderColor: theme.border, marginBottom: 4 },
  cpDotActive: { backgroundColor: theme.cyan, borderColor: theme.cyan },
  cpLabel: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace' },
  correctionCard: { marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, marginBottom: 4 },
  toggleLabel: { color: theme.textSecondary, fontSize: 13 },
  toggle: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.green}40` },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  dotOn: { backgroundColor: theme.green, alignSelf: 'flex-end' },
  issueItem: { color: theme.amber, fontSize: 12, lineHeight: 20, fontFamily: 'monospace' },
  correctionBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  promptBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(8, 11, 17, 0.96)', borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },
  promptControls: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  modelPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: `${theme.blue}20`, borderWidth: 1, borderColor: theme.borderStrong },
  modelLabel: { color: theme.cyan, fontSize: 11, fontWeight: '600' },
  tempWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tempLabel: { color: theme.textSecondary, fontSize: 11, fontFamily: 'monospace' },
  tempBtn: { width: 24, height: 24, borderRadius: 6, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  tempBtnText: { color: theme.text, fontSize: 14, fontWeight: '700' },
  modePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: `${theme.amber}20`, borderWidth: 1, borderColor: `${theme.amber}44` },
  modeLabel: { color: theme.amber, fontSize: 11, fontWeight: '700' },
  promptInputRow: { flexDirection: 'row', gap: 8 },
  promptInput: { flex: 1, minHeight: 44, maxHeight: 80, borderRadius: 12, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, paddingVertical: 10, color: theme.text, fontSize: 13 },
  executeBtn: { backgroundColor: theme.blue, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#62B7FF' },
  executeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
