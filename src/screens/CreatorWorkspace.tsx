/**
 * screens/CreatorWorkspace.tsx
 * Pure presentation. Data from /projects and /ide/* endpoints.
 * No hardcoded projects, blueprints, or code samples.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { SubNav } from '../components/SubNav';
import { NebulaBackground } from '../components/NebulaBackground';
import { FileTreePanel } from './FileTreePanel';
import { api } from '../services/api';
import { theme } from '../theme';
import type {
  Project, Blueprint, IdeSession, IdeRunSummary, IdeCorrection,
  IdeExecuteResult,
} from '../types';

const PREVIEW_TABS = [
  { key: 'output',   label: 'Output' },
  { key: 'blueprint', label: 'Blueprint' },
  { key: 'flow',     label: 'Flow' },
];

export function CreatorWorkspace() {
  // ── Data ─────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [session, setSession] = useState<IdeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Editor ───────────────────────────────────────────────────
  const [activeBlueprintId, setActiveBlueprintId] = useState<string | null>(null);
  const [draftCode, setDraftCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ── Execute ──────────────────────────────────────────────────
  const [command, setCommand] = useState('pwd');
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<IdeExecuteResult | null>(null);
  const [previewTab, setPreviewTab] = useState('output');

  // ── Prompt bar (local-only) ──────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('DeepSeek-V3');
  const [temp, setTemp] = useState(0.7);
  const [sysMode, setSysMode] = useState('CONTROLLED');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, session] = await Promise.all([
        api.listProjects(),
        api.getIdeSession(),
      ]);
      setProjects(projects);
      setSession(session);
      if (!selectedProjectId && projects.length > 0) {
        setSelectedProjectId(projects[0].id);
      }
      if (!activeBlueprintId && session.blueprints.length > 0) {
        const first = session.blueprints[0];
        setActiveBlueprintId(first.id);
        setDraftCode(first.code);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, activeBlueprintId]);

  useEffect(() => { void loadAll(); }, []); // eslint-disable-line

  const activeBlueprint: Blueprint | null =
    session?.blueprints.find((b) => b.id === activeBlueprintId) ?? null;

  const dirty = activeBlueprint ? draftCode !== activeBlueprint.code : false;

  const selectBlueprint = (bp: Blueprint) => {
    setActiveBlueprintId(bp.id);
    setDraftCode(bp.code);
    setSaveMsg(null);
    setRunResult(null);
  };

  const saveBlueprint = async () => {
    if (!activeBlueprint) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const fresh = await api.updateBlueprint(activeBlueprint.id, { code: draftCode });
      // Update session in place
      setSession((prev) => prev ? {
        ...prev,
        blueprints: prev.blueprints.map((b) => b.id === fresh.id ? fresh : b),
      } : prev);
      setSaveMsg(`saved · v${fresh.version}`);
    } catch (e) {
      setSaveMsg(`save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const runExecute = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await api.executeIde({
        command,
        blueprintId: activeBlueprint?.id,
      });
      setRunResult(r);
      setPreviewTab('output');
      // refresh history so timeline + flow update
      const fresh = await api.getIdeSession();
      setSession(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'execute failed');
    } finally {
      setRunning(false);
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  if (loading && !session) {
    return (
      <View style={s.root}>
        <NebulaBackground />
        <View style={s.center}><ActivityIndicator color={theme.cyan} /></View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>Creator Workspace</Text>
        <Text style={s.sub}>Architect, build, and preview sovereign projects</Text>

        {error && <Text style={s.errBanner}>{error}</Text>}

        {/* Projects */}
        <Text style={s.sectionLabel}>Projects ({projects.length})</Text>
        <View testID="project-factory-list">
          {projects.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelectedProjectId(p.id)}
              style={({ pressed }) => [
                s.projectRow,
                p.id === selectedProjectId && s.projectRowActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.projectName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.projectMeta} numberOfLines={1}>
                  {p.archived ? 'archived' : 'active'} · {p.metrics.openTaskCount} open · {p.metrics.doneTaskCount} done
                </Text>
              </View>
              <StatusChip
                label={p.archived ? 'archived' : 'active'}
                status={p.archived ? 'error' : 'success'}
              />
            </Pressable>
          ))}
          {projects.length === 0 && <Text style={s.empty}>No projects yet.</Text>}
        </View>

        {currentProject && (
          <GlassCard style={s.card} accent={theme.cyan}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>{currentProject.name}</Text>
              <StatusChip
                label={currentProject.archived ? 'archived' : 'active'}
                status={currentProject.archived ? 'error' : 'success'}
              />
            </View>
            <Text style={s.domain} numberOfLines={2}>{currentProject.description}</Text>
          </GlassCard>
        )}

        {/* Blueprints + Editor */}
        <Text style={s.sectionLabel}>Blueprints ({session?.blueprints.length ?? 0})</Text>
        <View style={s.splitRow} testID="split-screen-creator-view">
          <GlassCard style={s.splitLeft}>
            <Text style={s.panelTitle}>Blueprints</Text>
            {(session?.blueprints ?? []).map((bp) => (
              <Pressable
                key={bp.id}
                onPress={() => selectBlueprint(bp)}
                style={({ pressed }) => [
                  s.bpRow,
                  bp.id === activeBlueprintId && s.bpRowActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[s.bpName, bp.id === activeBlueprintId && s.bpNameActive]} numberOfLines={1}>
                  {bp.name}
                </Text>
                <Text style={s.bpMeta}>v{bp.version} · {bp.language}</Text>
              </Pressable>
            ))}
            {session && session.blueprints.length === 0 && (
              <Text style={s.empty}>No blueprints yet.</Text>
            )}
          </GlassCard>

          <GlassCard style={s.splitCenter}>
            <View style={s.editorHead}>
              <Text style={s.panelTitle}>Editor</Text>
              {activeBlueprint && (
                <View style={s.editorActions}>
                  {dirty && <Text style={s.dirty}>● unsaved</Text>}
                  <Pressable
                    onPress={saveBlueprint}
                    disabled={!dirty || saving}
                    style={[s.saveBtn, (!dirty || saving) && s.btnDisabled]}
                  >
                    <Text style={s.saveBtnText}>{saving ? '…' : 'Save'}</Text>
                  </Pressable>
                </View>
              )}
            </View>
            {activeBlueprint ? (
              <ScrollView style={s.codeScroll} showsVerticalScrollIndicator={false}>
                <TextInput
                  value={draftCode}
                  onChangeText={setDraftCode}
                  multiline
                  style={s.code}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </ScrollView>
            ) : (
              <Text style={s.empty}>Select a blueprint to edit.</Text>
            )}
            {saveMsg && (
              <Text style={saveMsg.startsWith('saved') ? s.saveOk : s.saveErr}>{saveMsg}</Text>
            )}
          </GlassCard>
        </View>

        {/* Workspace Files */}
        <Text style={s.sectionLabel}>Workspace Files</Text>
        <GlassCard style={s.card} accent={theme.green}>
          <FileTreePanel />
        </GlassCard>

        {/* Live Preview */}
        <GlassCard style={s.previewCard} accent={theme.purple}>
          <View style={s.previewHead}>
            <Text style={s.panelTitle}>Live Preview</Text>
            <SubNav tabs={PREVIEW_TABS} active={previewTab} onChange={setPreviewTab} />
          </View>
          <View style={s.previewBody} testID="live-preview-panel">
            {previewTab === 'output' && (
              !runResult ? (
                <View style={s.previewPlaceholder}>
                  <Text style={s.previewIcon}>▣</Text>
                  <Text style={s.previewText}>Run a command to see output</Text>
                  <Text style={s.previewHint}>Command executes on the server allowlist</Text>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <View style={s.runMetaRow}>
                    <Text style={[s.runMeta, { color: runResult.exitCode === 0 ? theme.green : theme.red }]}>
                      exit {runResult.exitCode ?? 'killed'}
                    </Text>
                    <Text style={s.runMeta}>·</Text>
                    <Text style={s.runMeta}>{runResult.durationMs} ms</Text>
                    {runResult.truncated && (
                      <>
                        <Text style={s.runMeta}>·</Text>
                        <Text style={[s.runMeta, { color: theme.amber }]}>truncated</Text>
                      </>
                    )}
                  </View>
                  {runResult.stdout.length > 0 && (
                    <>
                      <Text style={s.runLabel}>stdout</Text>
                      <View style={s.runOutput}>
                        <Text style={s.runMono}>{runResult.stdout}</Text>
                      </View>
                    </>
                  )}
                  {runResult.stderr.length > 0 && (
                    <>
                      <Text style={s.runLabel}>stderr</Text>
                      <View style={[s.runOutput, { borderLeftColor: theme.red }]}>
                        <Text style={[s.runMono, { color: theme.red }]}>{runResult.stderr}</Text>
                      </View>
                    </>
                  )}
                  {runResult.stdout.length === 0 && runResult.stderr.length === 0 && (
                    <Text style={s.empty}>(no output)</Text>
                  )}
                  <Text style={s.runRef}>ledger: {runResult.ledgerEntryId}</Text>
                </View>
              )
            )}
            {previewTab === 'blueprint' && (
              <View style={{ width: '100%' }}>
                {activeBlueprint ? (
                  <>
                    <Text style={s.bpNode}>name: {activeBlueprint.name}</Text>
                    <Text style={s.bpNode}>language: {activeBlueprint.language}</Text>
                    <Text style={s.bpNode}>version: v{activeBlueprint.version}</Text>
                    <Text style={s.bpNode}>updated: {new Date(activeBlueprint.updatedAt).toLocaleString()}</Text>
                    <Text style={s.bpNode}>lines: {activeBlueprint.code.split('\n').length}</Text>
                  </>
                ) : (
                  <Text style={s.empty}>No blueprint selected.</Text>
                )}
              </View>
            )}
            {previewTab === 'flow' && (
              <View style={{ width: '100%' }}>
                <Text style={s.flowStep}>1. Prompt → Edit blueprint → Save</Text>
                <Text style={s.flowStep}>2. Save → PATCH /ide/blueprints/:id (bumps version)</Text>
                <Text style={s.flowStep}>3. Execute → POST /ide/execute (CommandRunner)</Text>
                <Text style={s.flowStep}>4. Result → ledger → back to Output tab</Text>
                <Text style={s.flowStep}>5. History + Corrections → session refresh</Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Command runner */}
        <GlassCard style={s.card} accent={theme.cyan}>
          <Text style={s.panelTitle}>Execute</Text>
          <View style={s.cmdRow}>
            <TextInput
              value={command}
              onChangeText={setCommand}
              placeholder="shell command (e.g. pwd, ls, date)"
              placeholderTextColor={theme.textMuted}
              style={s.cmdInput}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={runExecute}
            />
            <Pressable
              onPress={runExecute}
              disabled={running || !command.trim()}
              style={[s.runBtn, (running || !command.trim()) && s.btnDisabled]}
              testID="execute-button"
            >
              <Text style={s.runBtnText}>{running ? '…' : 'RUN'}</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Version timeline (from real runs) */}
        <Text style={s.sectionLabel}>Recent Runs</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeline} testID="version-timeline">
          {(session?.recentRuns ?? []).slice(0, 12).map((r, i) => (
            <View key={r.id} style={s.checkpoint}>
              <View style={[s.cpDot, r.exitCode === 0 ? s.cpDotOk : s.cpDotBad]} />
              <Text style={s.cpLabel} numberOfLines={1}>{r.command}</Text>
              <Text style={s.cpMeta}>{r.durationMs} ms</Text>
            </View>
          ))}
          {(session?.recentRuns?.length ?? 0) === 0 && (
            <Text style={s.empty}>No runs yet.</Text>
          )}
        </ScrollView>

        {/* Self correction */}
        <GlassCard style={s.correctionCard} accent={theme.amber}>
          <Text style={s.panelTitle}>Self Correction ({session?.corrections.length ?? 0})</Text>
          {(session?.corrections ?? []).map((c) => (
            <Text key={c.id} style={[s.issueItem, c.severity === 'error' ? { color: theme.red } : { color: theme.amber }]}>
              • [{c.severity}] {c.command} — {c.issue}
            </Text>
          ))}
          {session && session.corrections.length === 0 && (
            <Text style={s.empty}>No issues detected.</Text>
          )}
        </GlassCard>
      </ScrollView>

      {/* Prompt bar (local-only) */}
      <View style={s.promptBar} testID="persistent-prompt-bar">
        <View style={s.promptControls}>
          <Pressable style={s.modelPill} onPress={() => setModel(model === 'DeepSeek-V3' ? 'GPT-5' : 'DeepSeek-V3')}>
            <Text style={s.modelLabel}>{model}</Text>
          </Pressable>
          <View style={s.tempWrap}>
            <Text style={s.tempLabel}>Temp: {temp.toFixed(1)}</Text>
            <Pressable style={s.tempBtn} onPress={() => setTemp(Math.max(0, +(temp - 0.1).toFixed(1)))}>
              <Text style={s.tempBtnText}>−</Text>
            </Pressable>
            <Pressable style={s.tempBtn} onPress={() => setTemp(Math.min(1, +(temp + 0.1).toFixed(1)))}>
              <Text style={s.tempBtnText}>+</Text>
            </Pressable>
          </View>
          <Pressable style={s.modePill} onPress={() => setSysMode(sysMode === 'CONTROLLED' ? 'EXPERIMENTAL' : 'CONTROLLED')}>
            <Text style={s.modeLabel}>{sysMode}</Text>
          </Pressable>
        </View>
        <View style={s.promptInputRow}>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe what you want… (local only, no LLM wired yet)"
            placeholderTextColor={theme.textMuted}
            style={s.promptInput}
            multiline
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 140 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 14 },
  errBanner: { color: theme.red, fontSize: 12, fontFamily: 'monospace', marginBottom: 12 },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12, marginBottom: 8 },
  card: { marginBottom: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  domain: { color: theme.textMuted, fontSize: 11, marginTop: 4 },
  empty: { color: theme.textMuted, fontSize: 12, fontStyle: 'italic', padding: 6 },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, marginBottom: 6 },
  projectRowActive: { borderColor: theme.cyan, backgroundColor: `${theme.cyan}10` },
  projectName: { color: theme.text, fontSize: 13, fontWeight: '600' },
  projectMeta: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  splitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  splitLeft: { flex: 1, padding: 12 },
  splitCenter: { flex: 1.4, padding: 12 },
  panelTitle: { color: theme.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  bpRow: { padding: 8, borderRadius: 8, marginBottom: 4, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  bpRowActive: { borderColor: theme.cyan, backgroundColor: `${theme.cyan}12` },
  bpName: { color: theme.text, fontSize: 12, fontWeight: '600' },
  bpNameActive: { color: theme.cyan },
  bpMeta: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  editorHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  editorActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dirty: { color: theme.amber, fontSize: 10, fontFamily: 'monospace' },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.cyan },
  saveBtnText: { color: '#000', fontSize: 11, fontWeight: '800' },
  btnDisabled: { opacity: 0.4 },
  codeScroll: { maxHeight: 220, backgroundColor: 'rgba(8, 11, 17, 0.6)', borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  code: { color: theme.cyan, fontSize: 11, fontFamily: 'monospace', lineHeight: 17, padding: 10, minHeight: 180, textAlignVertical: 'top' },
  saveOk: { color: theme.green, fontSize: 11, fontFamily: 'monospace', marginTop: 6 },
  saveErr: { color: theme.red, fontSize: 11, fontFamily: 'monospace', marginTop: 6 },
  previewCard: { marginBottom: 12 },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  previewBody: { minHeight: 120, justifyContent: 'center', alignItems: 'center' },
  previewPlaceholder: { alignItems: 'center' },
  previewIcon: { fontSize: 32, color: theme.purple, marginBottom: 8 },
  previewText: { color: theme.text, fontSize: 14, fontWeight: '600' },
  previewHint: { color: theme.textMuted, fontSize: 12, marginTop: 4 },
  bpNode: { color: theme.cyan, fontSize: 12, fontFamily: 'monospace', lineHeight: 20 },
  flowStep: { color: theme.textSecondary, fontSize: 12, lineHeight: 22, fontFamily: 'monospace' },
  runMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  runMeta: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' },
  runLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, marginBottom: 4 },
  runOutput: { padding: 10, borderRadius: 8, backgroundColor: 'rgba(8, 11, 17, 0.9)', borderLeftWidth: 3, borderLeftColor: theme.cyan },
  runMono: { color: theme.text, fontSize: 11, fontFamily: 'monospace' },
  runRef: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 6 },
  cmdRow: { flexDirection: 'row', gap: 8 },
  cmdInput: { flex: 1, minHeight: 42, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, color: theme.text, fontSize: 13, fontFamily: 'monospace' },
  runBtn: { paddingHorizontal: 20, borderRadius: 10, backgroundColor: theme.cyan, alignItems: 'center', justifyContent: 'center' },
  runBtnText: { color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  timeline: { flexDirection: 'row', marginBottom: 12 },
  checkpoint: { alignItems: 'center', marginRight: 18, padding: 4, minWidth: 70 },
  cpDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.glassSoft, borderWidth: 2, borderColor: theme.border, marginBottom: 4 },
  cpDotOk: { backgroundColor: theme.green, borderColor: theme.green },
  cpDotBad: { backgroundColor: theme.red, borderColor: theme.red },
  cpLabel: { color: theme.text, fontSize: 10, fontFamily: 'monospace' },
  cpMeta: { color: theme.textMuted, fontSize: 9, fontFamily: 'monospace', marginTop: 2 },
  correctionCard: { marginBottom: 12 },
  issueItem: { color: theme.amber, fontSize: 12, lineHeight: 20, fontFamily: 'monospace' },
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
});
