// One continuous feed. No tabs.
// Mode dropdown picks what send does: Chat talks, Plan plans, Build writes files.
// Files sit under a collapsed accordion at the bottom of the feed.
// Plan replies carry a "Send to Code" button that hands the plan off to Build.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getChatHistory, deepseekChat, type ChatHistoryMessage } from '../services/deepseekApi';
import { api, type BuiltFile, type BuildAttachmentsPayload } from '../services/api';
import { AttachmentSheet, type PromptAttachment } from '../components/AttachmentSheet';
import { ModeSelector, type AppMode } from '../components/ModeSelector';
import { BuildingIndicator } from '../components/BuildingIndicator';
import { lovable } from '../theme';

interface Props {
  id: string;
  title?: string;
  initialPrompt?: string;
  onClose: () => void;
  onOpenPreview: () => void;
  onDeleted?: () => void;
}

type MsgMode = 'chat' | 'plan' | 'code';

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  mode: MsgMode;
  content: string;
}

interface BuildStep {
  id: string;
  prompt: string;
  at: number;
  ok: boolean;
  summary: string;
  files: BuiltFile[];
  refs: PromptAttachment[];
  error?: string;
}

const PLAN_PREFIX =
  'You are in PLAN mode. Do NOT write code or emit files. ' +
  'Produce a clear, structured implementation plan for the request below. ' +
  'Cover: pages, sections, components, layout, colours, interactions, ' +
  'and any design decisions worth noting. Be specific but concise. ' +
  'End with a short "Ready to build" line.\n\nREQUEST: ';

function modeToMsgMode(m: AppMode): MsgMode {
  if (m === 'Chat') return 'chat';
  if (m === 'Plan') return 'plan';
  return 'code';
}

function attachmentsToPayload(refs: PromptAttachment[]): BuildAttachmentsPayload {
  const payload: BuildAttachmentsPayload = {};
  const imageUrls: string[] = [];
  const imageDatas: Array<{ name: string; dataUrl: string }> = [];
  const forceSkillIds: string[] = [];
  let figmaUrl: string | undefined;
  for (const r of refs) {
    if (r.kind === 'image') {
      if (r.value.startsWith('data:')) {
        imageDatas.push({ name: r.label || 'photo.jpg', dataUrl: r.value });
      } else {
        imageUrls.push(r.value);
      }
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

function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

export function ProjectDetailScreen({ id, title, initialPrompt, onClose, onOpenPreview, onDeleted }: Props) {
  const [mode, setMode] = useState<AppMode>('Build');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [files, setFiles] = useState<BuiltFile[]>([]);
  const [filesOpen, setFilesOpen] = useState(false);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [builds, setBuilds] = useState<BuildStep[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishUrl, setPublishUrl] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history: ChatHistoryMessage[] = await getChatHistory(id, 100);
        if (cancelled) return;
        setMessages(history.map((m) => ({
          id: m.id,
          role: m.role,
          mode: 'chat' as MsgMode,
          content: m.content,
        })));
      } catch {}
      finally { if (!cancelled) setLoadingHistory(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const refreshFiles = useCallback(async () => {
    try {
      const list = await api.listProjectFiles(id);
      setFiles(list);
    } catch {
      setFiles([]);
    }
  }, [id]);

  useEffect(() => { void refreshFiles(); }, [refreshFiles]);

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // ── SEND — endpoint chosen by mode ────────────────────────────
  const send = useCallback(async (
    text: string,
    refs: PromptAttachment[] = [],
    forcedMode?: AppMode,
  ) => {
    const activeMode: AppMode = forcedMode ?? mode;
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setError(null);

    const chipSummary = refs.length > 0
      ? '\n\n' + refs.map((r) => '\u00B7 ' + r.label).join('\n')
      : '';
    const userMsg: Msg = {
      id: 'u_' + Date.now(),
      role: 'user',
      mode: modeToMsgMode(activeMode),
      content: text + chipSummary,
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollEnd();

    try {
      if (activeMode === 'Build') {
        const payload = attachmentsToPayload(refs);
        const stepId = 'build_' + Date.now();
        const startedAt = Date.now();
        const result = await api.buildProject(id, text, payload);
        const fileLines = result.files.map((f) => '  \u00B7 ' + f.path + '  (' + f.bytes + 'B)').join('\n');
        setMessages((prev) => [...prev, {
          id: 'a_' + Date.now(),
          role: 'assistant',
          mode: 'code',
          content: result.summary + (fileLines ? '\n\n' + fileLines : ''),
        }]);
        setBuilds((prev) => [
          {
            id: stepId, prompt: text, at: startedAt, ok: true,
            summary: result.summary, files: result.files, refs,
          },
          ...prev,
        ]);
        setAttachments([]);
        await refreshFiles();
      } else {
        const fullPrompt = activeMode === 'Plan' ? PLAN_PREFIX + text : text;
        const result = await deepseekChat(fullPrompt, { sessionId: id });
        setMessages((prev) => [...prev, {
          id: 'a_' + Date.now(),
          role: 'assistant',
          mode: modeToMsgMode(activeMode),
          content: result.content || '(empty response)',
        }]);
        setAttachments([]);
      }
      scrollEnd();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => [...prev, {
        id: 'e_' + Date.now(),
        role: 'system',
        mode: modeToMsgMode(activeMode),
        content: msg,
      }]);
    } finally {
      setBusy(false);
    }
  }, [id, busy, mode, refreshFiles, scrollEnd]);

  // ── Seed initial build from Home ──────────────────────────────
  useEffect(() => {
    if (!initialPrompt || seededRef.current || loadingHistory) return;
    seededRef.current = true;
    void send(initialPrompt, [], 'Build');
  }, [initialPrompt, loadingHistory, send]);

  const viewFile = async (path: string) => {
    setLoadingFile(true);
    try {
      const content = await api.getProjectFile(id, path);
      setOpenFile({ path, content });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFile(false);
    }
  };

  const addAttachment = useCallback((att: PromptAttachment) => {
    setAttachments((prev) => {
      if (prev.some((a) => a.id === att.id)) return prev;
      return [...prev, att];
    });
  }, []);

  const removeAttachment = useCallback((attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  }, []);

  // ── Plan -> Build handoff ─────────────────────────────────────
  const handOffPlanToBuild = useCallback((planText: string) => {
    setMode('Build');
    setInput('Implement this plan exactly:\n\n' + planText + '\n\nBegin now.');
    scrollEnd();
  }, [scrollEnd]);

  const doPublish = useCallback(async () => {
    setMenuOpen(false);
    setPublishing(true);
    setPublishMsg(null);
    setPublishUrl(null);
    setError(null);
    try {
      const r = await api.publishProject(id);
      setPublishMsg(
        (r.created ? 'Created repo · ' : 'Updated repo · ') +
        r.filesUploaded + ' file' + (r.filesUploaded === 1 ? '' : 's') + ' pushed'
      );
      setPublishUrl(r.repoUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError('Publish failed: ' + msg);
    } finally {
      setPublishing(false);
    }
  }, [id]);

  const confirmDelete = useCallback(() => {
    setMenuOpen(false);
    Alert.alert(
      'Delete project?',
      'This will archive "' + (title || 'Untitled project') + '". It will disappear from your projects list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProject(id);
              if (onDeleted) onDeleted();
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Delete failed');
            }
          },
        },
      ],
    );
  }, [id, title, onClose, onDeleted]);

  const headerTitle = title || 'Untitled project';
  const canSend = !!input.trim() && !busy;

  const placeholderForMode =
    mode === 'Chat' ? 'Ask anything, explore ideas...'
    : mode === 'Plan' ? 'Describe what you want to plan...'
    : 'Describe what you want to build or change...';

  const modeLabel = (m: MsgMode) => m === 'chat' ? 'Chat' : m === 'plan' ? 'Plan' : 'Build';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Close">
          <Feather name="x" size={18} color={lovable.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <Text style={s.headerSub} numberOfLines={1}>Untitled project</Text>
        </View>
        <Pressable onPress={() => setMenuOpen(true)} style={s.headerBtn} accessibilityLabel="More options">
          <Feather name="more-horizontal" size={18} color={lovable.text} />
        </Pressable>
      </View>

      {openFile ? (
        <View style={s.flex}>
          <View style={s.codeMiniHead}>
            <Pressable onPress={() => setOpenFile(null)} style={s.codeBackBtn} accessibilityLabel="Back">
              <Feather name="chevron-left" size={18} color={lovable.text} />
            </Pressable>
            <Text style={s.codeMiniPath} numberOfLines={1}>{openFile.path}</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={s.codeBody} contentContainerStyle={{ padding: lovable.space.md }}>
            <ScrollView horizontal>
              <Text style={s.codeMono} selectable>{openFile.content}</Text>
            </ScrollView>
          </ScrollView>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={s.flex}
            contentContainerStyle={s.feedContent}
            onContentSizeChange={scrollEnd}
          >
            {loadingHistory ? (
              <ActivityIndicator color={lovable.textMuted} style={{ marginTop: lovable.space.lg }} />
            ) : null}

            {messages.length === 0 && !loadingHistory ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyTitle}>What should we build?</Text>
                <Text style={s.emptySub}>
                  Chat to explore ideas, Plan to produce a spec, or Build to generate the files.
                </Text>
              </View>
            ) : null}

            {messages.map((m) => {
              const isUser = m.role === 'user';
              const isSystem = m.role === 'system';
              const showHandoff = m.mode === 'plan' && m.role === 'assistant';
              return (
                <View key={m.id} style={s.msgGroup}>
                  <View style={s.modeBadgeRow}>
                    <View style={s.modeBadge}>
                      <Feather
                        name={m.mode === 'chat' ? 'message-circle' : m.mode === 'plan' ? 'clock' : 'code'}
                        size={10}
                        color={lovable.textMuted}
                      />
                      <Text style={s.modeBadgeText}>{modeLabel(m.mode)}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      s.bubble,
                      isUser ? s.bubbleUser : isSystem ? s.bubbleSystem : s.bubbleAssistant,
                    ]}
                  >
                    <Text
                      style={[s.bubbleText, isSystem && { color: lovable.error }]}
                      selectable
                    >
                      {m.content}
                    </Text>
                  </View>
                  {showHandoff ? (
                    <Pressable
                      style={({ pressed }) => [s.handoffBtn, pressed && { opacity: 0.75 }]}
                      onPress={() => handOffPlanToBuild(m.content)}
                    >
                      <Feather name="arrow-right" size={12} color={lovable.text} />
                      <Text style={s.handoffText}>Send to Code</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {busy ? (
              <BuildingIndicator label={mode === 'Plan' ? 'Planning\u2026' : mode === 'Chat' ? 'Thinking\u2026' : 'Generating code\u2026'} />
            ) : null}
            {error ? <Text style={s.errBanner}>{'\u2022'} {error}</Text> : null}

            {publishMsg ? (
              <View style={s.publishBanner}>
                <Feather name="check-circle" size={16} color={lovable.success} />
                <View style={{ flex: 1 }}>
                  <Text style={s.publishTitle}>{publishMsg}</Text>
                  {publishUrl ? (
                    <Text style={s.publishUrl} numberOfLines={1} selectable>{publishUrl}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => { setPublishMsg(null); setPublishUrl(null); }}
                  hitSlop={8}
                  accessibilityLabel="Dismiss"
                >
                  <Feather name="x" size={14} color={lovable.textMuted} />
                </Pressable>
              </View>
            ) : null}

            {/* ── Files accordion ────────────────────────────── */}
            <View style={s.accordion}>
              <Pressable
                style={s.accordionHead}
                onPress={() => setFilesOpen((v) => !v)}
                accessibilityLabel="Toggle files"
              >
                <Feather name="folder" size={14} color={lovable.textMuted} />
                <Text style={s.accordionTitle}>Files ({files.length})</Text>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); void refreshFiles(); }}
                  hitSlop={8}
                  accessibilityLabel="Refresh files"
                >
                  <Feather name="refresh-cw" size={14} color={lovable.textMuted} />
                </Pressable>
                <Feather
                  name={filesOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={lovable.textMuted}
                />
              </Pressable>

              {filesOpen ? (
                <View style={s.accordionBody}>
                  {files.length === 0 ? (
                    <Text style={s.emptyFilesText}>
                      No files yet. Switch to Build mode and send a prompt.
                    </Text>
                  ) : files.map((f) => (
                    <Pressable
                      key={f.path}
                      onPress={() => void viewFile(f.path)}
                      style={({ pressed }) => [s.fileRow, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="file-text" size={13} color={lovable.textMuted} />
                      <Text style={s.fileName} numberOfLines={1}>{f.path}</Text>
                      <Text style={s.fileMeta}>{fmtBytes(f.bytes)}</Text>
                    </Pressable>
                  ))}
                  {loadingFile ? (
                    <ActivityIndicator color={lovable.textMuted} size="small" style={{ marginVertical: lovable.space.sm }} />
                  ) : null}
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={s.inputWrap}>
            {attachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
                {attachments.map((a) => (
                  <View key={a.id} style={s.chip}>
                    <Feather
                      name={a.kind === 'image' ? 'image' : a.kind === 'figma' ? 'layout' : 'star'}
                      size={12}
                      color={lovable.chipText}
                    />
                    <Text style={s.chipText} numberOfLines={1}>{a.label}</Text>
                    <Pressable onPress={() => removeAttachment(a.id)} hitSlop={8} accessibilityLabel={'Remove ' + a.label}>
                      <Feather name="x" size={12} color={lovable.chipText} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={placeholderForMode}
              placeholderTextColor={lovable.textDim}
              style={s.input}
              multiline
              editable={!busy}
            />

            <View style={s.bottomRow}>
              <Pressable
                style={({ pressed }) => [s.attachBtn, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Attach a reference"
                onPress={() => setSheetOpen(true)}
              >
                <Feather name="paperclip" size={14} color={lovable.text} />
                <Text style={s.attachText}>Attach</Text>
              </Pressable>
              <ModeSelector mode={mode} onChange={setMode} />
              <View style={{ flex: 1 }} />
              <Pressable
                style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
                onPress={() => void send(input.trim(), attachments)}
                disabled={!canSend}
                accessibilityLabel="Send"
              >
                <Feather name="arrow-up" size={16} color={canSend ? '#FFFFFF' : lovable.textFaint} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addAttachment}
        existing={attachments}
      />

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menuSheet}>
            <Pressable
              style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }, publishing && { opacity: 0.4 }]}
              onPress={() => void doPublish()}
              disabled={publishing}
            >
              <Feather name="upload-cloud" size={16} color={lovable.text} />
              <Text style={s.menuItemText}>{publishing ? 'Publishing...' : 'Publish to GitHub'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
              onPress={confirmDelete}
            >
              <Feather name="trash-2" size={16} color={lovable.error} />
              <Text style={[s.menuItemText, { color: lovable.error }]}>Delete project</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
              onPress={() => { setMenuOpen(false); onOpenPreview(); }}
            >
              <Feather name="external-link" size={16} color={lovable.text} />
              <Text style={s.menuItemText}>Open preview</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
              onPress={() => setMenuOpen(false)}
            >
              <Feather name="x" size={16} color={lovable.textMuted} />
              <Text style={[s.menuItemText, { color: lovable.textMuted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  flex: { flex: 1 },

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
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: lovable.space.sm },
  headerTitle: { color: lovable.text, fontSize: lovable.font.md, fontWeight: lovable.weight.semibold },
  headerSub: { color: lovable.textMuted, fontSize: lovable.font.xs, marginTop: 1 },

  feedContent: { padding: lovable.space.md, paddingBottom: lovable.space.lg },

  msgGroup: { marginBottom: lovable.space.md },
  modeBadgeRow: { flexDirection: 'row', marginBottom: 4 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: lovable.pillBg,
    borderWidth: 1,
    borderColor: lovable.pillBorder,
  },
  modeBadgeText: {
    color: lovable.textMuted,
    fontSize: 10,
    fontWeight: lovable.weight.semibold,
    letterSpacing: 0.3,
  },

  bubble: {
    maxWidth: '92%',
    paddingHorizontal: lovable.space.md,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: lovable.pillBg, borderColor: lovable.pillBorder },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: lovable.card, borderColor: lovable.cardBorder },
  bubbleSystem: { alignSelf: 'center', backgroundColor: lovable.errorSoft, borderColor: 'rgba(220,38,38,0.18)' },
  bubbleText: { color: lovable.text, fontSize: lovable.font.md, lineHeight: 20 },

  handoffBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
  },
  handoffText: {
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
  },

  emptyBox: { alignItems: 'center', paddingVertical: lovable.space.xxl, gap: lovable.space.sm },
  emptyTitle: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxl,
    letterSpacing: -0.3,
    marginTop: lovable.space.sm,
  },
  emptySub: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  errBanner: { color: lovable.error, fontSize: lovable.font.xs, textAlign: 'center', marginTop: lovable.space.sm },

  accordion: {
    marginTop: lovable.space.lg,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: lovable.radius.md,
    overflow: 'hidden',
  },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: lovable.space.md,
    paddingVertical: lovable.space.sm + 2,
  },
  accordionTitle: {
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
  },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: lovable.cardBorder,
    paddingVertical: 6,
  },
  emptyFilesText: {
    color: lovable.textDim,
    fontSize: lovable.font.xs,
    textAlign: 'center',
    paddingVertical: lovable.space.md,
    fontStyle: 'italic',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingHorizontal: lovable.space.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  fileName: { color: lovable.text, fontSize: lovable.font.sm, fontFamily: 'monospace', flex: 1 },
  fileMeta: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace' },

  inputWrap: {
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.sm,
    paddingBottom: lovable.space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: lovable.cardBorder,
    backgroundColor: lovable.bg,
  },
  chipRow: { flexDirection: 'row', gap: lovable.space.xs, paddingBottom: lovable.space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: lovable.chipBg,
    borderWidth: 1,
    borderColor: lovable.chipBorder,
    maxWidth: 220,
  },
  chipText: { color: lovable.chipText, fontSize: lovable.font.sm, fontWeight: lovable.weight.medium, flexShrink: 1 },
  input: {
    color: lovable.text,
    fontSize: lovable.font.md,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: lovable.space.sm, marginTop: lovable.space.sm },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 4 },
  attachText: { color: lovable.text, fontSize: lovable.font.md, fontWeight: lovable.weight.medium },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: lovable.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: lovable.accentSoft },

  codeMiniHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: lovable.space.sm + 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  codeBackBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  codeMiniPath: {
    flex: 1,
    textAlign: 'center',
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
    fontFamily: 'monospace',
  },
  codeBody: { flex: 1, backgroundColor: lovable.card },
  codeMono: { color: lovable.text, fontSize: lovable.font.xs, fontFamily: 'monospace', lineHeight: 17 },

  publishBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    backgroundColor: lovable.successSoft,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.22)',
    borderRadius: lovable.radius.md,
    padding: lovable.space.sm + 4,
    marginTop: lovable.space.md,
  },
  publishTitle: {
    color: lovable.success,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
  },
  publishUrl: {
    color: lovable.text,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  menuSheet: {
    backgroundColor: lovable.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    padding: 4,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  menuItemText: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.medium,
  },
});
