// The Brain — unified project screen.
//
// This IS the project detail page. There is no separate "brain" vs
// "files" split. You type, and the orchestrator decides whether to
// chat back, plan, or execute a full build. Files are one tap away.
//
// Layout:
//   Header         X   project name   [files N]   [...]
//   State strip    ● IDLE ● UNDERSTAND ● PLAN ● GENERATE
//   Chat feed      your messages + the Brain's replies
//   Glass Box      collapsible live activity feed
//   Engine pills   DeepSeek / Qwen / Kimi / DeepHat / Both
//   Input          [attach] [ ask the brain… ] [↑]

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { api, type BuiltFile, type BuildAttachmentsPayload } from '../../services/api';
import { getChatHistory, type ChatHistoryMessage } from '../../services/deepseekApi';
import { AttachmentSheet, type PromptAttachment } from '../../components/AttachmentSheet';
import { ActivityFeed } from '../ui/ActivityFeed';
import { NeonStatusTag } from '../ui/NeonStatusTag';
import { getOrchestrator } from '../core/createOrchestrator';
import type { ActivityPhase, OrchestratorSnapshot } from '../core/types';

type EngineChoice = 'deepseek' | 'qwen' | 'kimi' | 'deephad' | 'both';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  engineLabel?: string;
  fellBack?: boolean;
  error?: boolean;
  /** When set, the message is a build result and shows file list. */
  builtFiles?: Array<{ path: string; bytes: number }>;
}

interface Props {
  id: string;
  title?: string;
  initialPrompt?: string;
  onClose: () => void;
  onOpenPreview?: () => void;
  onDeleted?: () => void;
}

const PHASES: Array<{ key: ActivityPhase; label: string }> = [
  { key: 'understand', label: 'UNDERSTAND' },
  { key: 'plan', label: 'PLAN' },
  { key: 'generate', label: 'GENERATE' },
];

const ENGINES: Array<{ key: EngineChoice; label: string; icon: keyof typeof Feather.glyphMap; engineId: string | null }> = [
  { key: 'deepseek', label: 'DeepSeek', icon: 'zap',       engineId: 'engine_deepseek' },
  { key: 'qwen',     label: 'Qwen',     icon: 'cloud',     engineId: 'engine_qwen' },
  { key: 'kimi',     label: 'Kimi',     icon: 'star',      engineId: 'engine_kimi' },
  { key: 'deephad',  label: 'DeepHat',  icon: 'cpu',       engineId: 'engine_deephad' },
  { key: 'both',     label: 'Both',     icon: 'git-merge', engineId: null },
];

// Heuristic: does this message look like a request to change the code?
// If yes, we route through the build pipeline (plan → write files).
// If no, we just chat.
const BUILD_INTENT = /\b(build|create|generate|make|add|write|refactor|change|update|fix|implement|scaffold|redesign|modify|remove|delete|rewrite|edit)\b/i;

let msgSeq = 1;
function newMsgId(): string {
  return 'm_' + Date.now().toString(36) + '_' + (msgSeq++).toString(36);
}

function attachmentsToPayload(refs: PromptAttachment[]): BuildAttachmentsPayload {
  const payload: BuildAttachmentsPayload = {};
  const imageUrls: string[] = [];
  const imageDatas: Array<{ name: string; dataUrl: string }> = [];
  const forceSkillIds: string[] = [];
  let figmaUrl: string | undefined;
  for (const r of refs) {
    if (r.kind === 'image') {
      if (r.value.startsWith('data:')) imageDatas.push({ name: r.label || 'photo.jpg', dataUrl: r.value });
      else imageUrls.push(r.value);
    } else if (r.kind === 'figma') {
      figmaUrl = r.value;
    } else if (r.kind === 'skill') {
      forceSkillIds.push(r.value);
    }
  }
  if (imageDatas.length) payload.images = imageDatas;
  if (imageUrls.length) payload.imageUrls = imageUrls;
  if (figmaUrl) payload.figmaUrl = figmaUrl;
  if (forceSkillIds.length) payload.forceSkillIds = forceSkillIds;
  return payload;
}

export function UnifiedProjectScreen({ id, title, initialPrompt, onClose, onOpenPreview, onDeleted }: Props) {
  const [engine, setEngine] = useState<EngineChoice>('deepseek');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [files, setFiles] = useState<BuiltFile[]>([]);
  const [filesOpen, setFilesOpen] = useState(false);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [glassOpen, setGlassOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<OrchestratorSnapshot>(getOrchestrator().current());

  const scrollRef = useRef<ScrollView>(null);
  const seededRef = useRef(false);

  // Load history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history: ChatHistoryMessage[] = await getChatHistory(id, 100);
        if (cancelled) return;
        setMessages(history.map((m) => ({
          id: m.id, role: m.role as 'user' | 'assistant', content: m.content,
        })));
      } catch { /* no history */ }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Seed initial prompt from Home
  useEffect(() => {
    if (initialPrompt && !seededRef.current) {
      seededRef.current = true;
      setDraft(initialPrompt);
    }
  }, [initialPrompt]);

  // Orchestrator subscription
  useEffect(() => {
    const unsub = getOrchestrator().subscribe(setSnapshot);
    return unsub;
  }, []);

  const refreshFiles = useCallback(async () => {
    try { setFiles(await api.listProjectFiles(id)); }
    catch { setFiles([]); }
  }, [id]);

  useEffect(() => { void refreshFiles(); }, [refreshFiles]);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    setBusy(true);

    const chipSummary = attachments.length > 0
      ? '\n\n' + attachments.map((a) => '\u00b7 ' + a.label).join('\n')
      : '';
    setMessages((prev) => [...prev, { id: newMsgId(), role: 'user', content: text + chipSummary }]);
    scrollEnd();

    const wantsBuild = BUILD_INTENT.test(text);
    const engineId = ENGINES.find((e) => e.key === engine)?.engineId ?? 'engine_deepseek';

    try {
      const orch = getOrchestrator();

      if (wantsBuild) {
        // Think → plan → execute. Plan first (LLM), then build with the plan.
        const graph = await orch.submitPlan(text);
        const planNode = graph.nodes.find((n) => n.kind === 'plan');
        const planText = (planNode && (planNode.output as any)?.content) || '';
        const engineLabel = (planNode && (planNode.output as any)?.engineLabel) as string | undefined;

        const payload = attachmentsToPayload(attachments);
        setAttachments([]);

        const combined = planText
          ? text + '\n\nFollow this plan:\n' + planText
          : text;

        const result = await api.buildProject(id, combined, payload, engineId);
        setMessages((prev) => [...prev, {
          id: newMsgId(),
          role: 'assistant',
          content: result.summary,
          engineLabel,
          builtFiles: (result.files || []).slice(0, 12),
        }]);
        await refreshFiles();
      } else {
        // Plain chat through the full pipeline
        const graph = await orch.submit(text);
        const gen = graph.nodes.find((n) => n.kind === 'generate');
        const content = (gen && (gen.output as any)?.content) || '(no output)';
        const engineLabel = (gen && (gen.output as any)?.engineLabel) as string | undefined;
        const fellBack = (gen && (gen.output as any)?.fellBack) as boolean | undefined;
        setMessages((prev) => [...prev, {
          id: newMsgId(), role: 'assistant', content, engineLabel, fellBack,
        }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [...prev, { id: newMsgId(), role: 'assistant', content: msg, error: true }]);
    } finally {
      setBusy(false);
      scrollEnd();
    }
  }, [draft, busy, engine, id, attachments, refreshFiles, scrollEnd]);

  const openFileContent = useCallback(async (path: string) => {
    try {
      const content = await api.getProjectFile(id, path);
      setOpenFile({ path, content });
    } catch (e) {
      Alert.alert('Open failed', e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  const doPublish = useCallback(async () => {
    setMenuOpen(false);
    try {
      const result = await api.publishProject(id);
      Alert.alert('Published', 'Repo: ' + result.repoUrl + '\nBranch: ' + result.branch + '\nFiles: ' + result.filesUploaded);
    } catch (e) {
      Alert.alert('Publish failed', e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  const currentPhase = snapshot.state;
  const isRunning = currentPhase !== 'idle';
  const phaseIdx = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} hitSlop={8}>
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle} numberOfLines={1}>{title || 'Project'}</Text>
          <Text style={s.headerSub} numberOfLines={1}>Cognitive Brain</Text>
        </View>
        <Pressable onPress={() => setFilesOpen(true)} style={s.headerBtn} hitSlop={8}>
          <Feather name="folder" size={18} color={theme.text} />
          {files.length > 0 ? <Text style={s.badge}>{files.length}</Text> : null}
        </Pressable>
        <Pressable onPress={() => setMenuOpen((v) => !v)} style={s.headerBtn} hitSlop={8}>
          <Feather name="more-horizontal" size={20} color={theme.text} />
        </Pressable>
      </View>

      {/* State strip */}
      <View style={s.stateStrip}>
        <NeonStatusTag label={snapshot.state.toUpperCase()} color={isRunning ? theme.cyan : theme.textMuted} compact />
        {PHASES.map((p) => {
          const active = currentPhase === p.key;
          const done = phaseIdx > PHASES.findIndex((q) => q.key === p.key);
          return <NeonStatusTag key={p.key} label={p.label} color={active ? theme.cyan : done ? theme.green : theme.textMuted} compact />;
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.chatBody}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={s.emptyWrap}>
              <Feather name="cpu" size={32} color={theme.cyan} />
              <Text style={s.emptyTitle}>This is the Brain.</Text>
              <Text style={s.emptySub}>
                Ask it anything. It thinks, plans, and executes.
                Say "build a landing page" and it will.
                Say "hi" and it just answers.
              </Text>
            </View>
          ) : messages.map((m) => (
            <View key={m.id} style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAI, m.error && s.bubbleError]}>
              <View style={s.bubbleHeader}>
                <Text style={s.bubbleRole}>
                  {m.role === 'user' ? 'YOU' : m.error ? 'ERROR' : (m.engineLabel || 'BRAIN').toUpperCase()}
                </Text>
                {m.fellBack ? <NeonStatusTag label="fell back" color={theme.amber} compact /> : null}
              </View>
              <Text style={s.bubbleText} selectable>{m.content}</Text>
              {m.builtFiles && m.builtFiles.length > 0 ? (
                <View style={s.builtFilesWrap}>
                  {m.builtFiles.map((f) => (
                    <Pressable key={f.path} onPress={() => void openFileContent(f.path)} style={s.builtFileRow}>
                      <Feather name="file" size={10} color={theme.cyan} />
                      <Text style={s.builtFilePath} numberOfLines={1}>{f.path}</Text>
                      <Text style={s.builtFileBytes}>{f.bytes}B</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {busy ? (
            <View style={s.busyRow}>
              <ActivityIndicator color={theme.cyan} size="small" />
              <Text style={s.busyText}>{snapshot.lastMessage}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Glass Box */}
        <View style={s.glassWrap}>
          <Pressable onPress={() => setGlassOpen((v) => !v)} style={s.glassHeader}>
            <Feather name={glassOpen ? 'chevron-down' : 'chevron-up'} size={14} color={theme.cyan} />
            <Text style={s.glassTitle}>GLASS BOX</Text>
            <Text style={s.glassHint}>live activity</Text>
          </Pressable>
          {glassOpen ? <View style={s.glassBody}><ActivityFeed limit={200} /></View> : null}
        </View>

        {/* Engine pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.engineRow}>
          {ENGINES.map((e) => {
            const active = engine === e.key;
            return (
              <Pressable key={e.key} onPress={() => setEngine(e.key)} style={[s.enginePill, active && s.enginePillActive]}>
                <Feather name={e.icon} size={11} color={active ? theme.cyan : theme.textMuted} />
                <Text style={[s.engineText, active && s.engineTextActive]}>{e.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Input row */}
        <View style={s.inputRow}>
          <Pressable onPress={() => setSheetOpen(true)} style={s.attachBtn}>
            <Feather name="paperclip" size={16} color={theme.textMuted} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask the Brain to build, refactor, or just chat..."
            placeholderTextColor={theme.textMuted}
            style={s.input}
            editable={!busy}
            multiline
          />
          <Pressable
            onPress={onSend}
            disabled={busy || draft.trim().length === 0}
            style={[s.sendBtn, (busy || draft.trim().length === 0) && s.sendBtnDisabled]}
          >
            <Feather name="arrow-up" size={16} color={busy ? theme.textMuted : theme.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Files bottom sheet */}
      <Modal visible={filesOpen} animationType="slide" transparent onRequestClose={() => setFilesOpen(false)}>
        <View style={s.sheetOverlay}>
          <View style={s.sheetRoot}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Files ({files.length})</Text>
              <Pressable onPress={() => setFilesOpen(false)} hitSlop={8}>
                <Feather name="x" size={18} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 8 }}>
              <Pressable onPress={refreshFiles} style={s.filesRefresh}>
                <Feather name="refresh-cw" size={12} color={theme.textMuted} />
                <Text style={s.filesRefreshText}>Refresh</Text>
              </Pressable>
              {files.map((f) => (
                <Pressable key={f.path} onPress={() => { setFilesOpen(false); void openFileContent(f.path); }} style={s.fileRow}>
                  <Feather name="file" size={12} color={theme.textMuted} />
                  <Text style={s.filePath} numberOfLines={1}>{f.path}</Text>
                  <Text style={s.fileBytes}>{f.bytes}B</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* File viewer modal */}
      <Modal visible={!!openFile} animationType="slide" onRequestClose={() => setOpenFile(null)}>
        <SafeAreaView style={s.modalRoot} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setOpenFile(null)} style={s.headerBtn}><Feather name="x" size={20} color={theme.text} /></Pressable>
            <Text style={s.modalTitle} numberOfLines={1}>{openFile?.path}</Text>
            <View style={s.headerBtn} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalBody}>
            <Text style={s.modalCode} selectable>{openFile?.content}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Menu modal */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={s.menuSheet}>
            {onOpenPreview ? (
              <Pressable onPress={() => { setMenuOpen(false); onOpenPreview(); }} style={s.menuItem}>
                <Feather name="eye" size={14} color={theme.text} />
                <Text style={s.menuItemText}>Preview</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={doPublish} style={s.menuItem}>
              <Feather name="upload-cloud" size={14} color={theme.text} />
              <Text style={s.menuItemText}>Publish to GitHub</Text>
            </Pressable>
            <Pressable onPress={() => { setMenuOpen(false); setMessages([]); }} style={s.menuItem}>
              <Feather name="trash-2" size={14} color={theme.red} />
              <Text style={[s.menuItemText, { color: theme.red }]}>Clear chat</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={(a) => setAttachments((prev) => [...prev, a])}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  headerSub: { color: theme.textMuted, fontSize: 10, fontFamily: theme.mono, marginTop: 1 },
  badge: { position: 'absolute', top: 4, right: 4, color: theme.cyan, fontSize: 8, fontWeight: '800', fontFamily: theme.mono },

  stateStrip: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },

  chatBody: { padding: 14, gap: 10, flexGrow: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  emptyTitle: { color: theme.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
  emptySub: { color: theme.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  bubble: { borderWidth: 1, borderRadius: 12, padding: 10, maxWidth: '92%' },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: theme.glassSoft, borderColor: theme.border },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: theme.glass, borderColor: theme.cyan + '33' },
  bubbleError: { borderColor: theme.red + '55', backgroundColor: theme.red + '10' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bubbleRole: { color: theme.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  bubbleText: { color: theme.text, fontSize: 12, lineHeight: 17 },

  builtFilesWrap: { marginTop: 8, gap: 4 },
  builtFileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  builtFilePath: { color: theme.cyan, fontSize: 10, fontFamily: theme.mono, flex: 1 },
  builtFileBytes: { color: theme.textMuted, fontSize: 9, fontFamily: theme.mono },

  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  busyText: { color: theme.textMuted, fontSize: 11, fontFamily: theme.mono, flex: 1 },

  glassWrap: { borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bgRaised },
  glassHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  glassTitle: { color: theme.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  glassHint: { color: theme.textMuted, fontSize: 10, fontFamily: theme.mono, flex: 1 },
  glassBody: { height: 150 },

  engineRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  enginePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.border },
  enginePillActive: { borderColor: theme.cyan + '88', backgroundColor: theme.cyan + '14' },
  engineText: { color: theme.textMuted, fontSize: 11, fontWeight: '700' },
  engineTextActive: { color: theme.cyan },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12, borderTopWidth: 1, borderTopColor: theme.border },
  attachBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.cyan, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: theme.border },

  sheetOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheetRoot: { maxHeight: '75%', backgroundColor: theme.glassStrong, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: theme.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  sheetTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  filesRefresh: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 6 },
  filesRefreshText: { color: theme.textMuted, fontSize: 11, fontFamily: theme.mono },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  filePath: { color: theme.text, fontSize: 11, fontFamily: theme.mono, flex: 1 },
  fileBytes: { color: theme.textMuted, fontSize: 10, fontFamily: theme.mono },

  modalRoot: { flex: 1, backgroundColor: theme.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { flex: 1, color: theme.text, fontSize: 13, fontFamily: theme.mono, textAlign: 'center' },
  modalBody: { padding: 14 },
  modalCode: { color: theme.text, fontSize: 11, fontFamily: theme.mono, lineHeight: 16 },

  menuOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 80, paddingRight: 12 },
  menuSheet: { backgroundColor: theme.glassStrong, borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: 'hidden', minWidth: 200 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  menuItemText: { color: theme.text, fontSize: 13 },
});
