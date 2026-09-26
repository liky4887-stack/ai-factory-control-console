// Real mode separation: Chat talks, Plan plans, Code builds.
// Tabs and dropdown stay synced.
// Header menu: delete project (soft-archive via PATCH).
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

type Tab = 'chat' | 'plan' | 'code';

const PLAN_PREFIX =
  'You are in PLAN mode. Do NOT write code or emit files. ' +
  'Produce a clear, structured implementation plan for the request below. ' +
  'Cover: pages, sections, components, layout, colours, interactions, ' +
  'and any design decisions worth noting. Be specific but concise. ' +
  'End with a short "Ready to build" line.\n\nREQUEST: ';

function tabForMode(m: AppMode): Tab {
  if (m === 'Chat') return 'chat';
  if (m === 'Plan') return 'plan';
  return 'code';
}

function modeForTab(t: Tab): AppMode {
  if (t === 'chat') return 'Chat';
  if (t === 'plan') return 'Plan';
  return 'Build';
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

function fmtTime(t: number): string {
  try { return new Date(t).toLocaleTimeString(); } catch { return ''; }
}

function fmtBytes(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

export function ProjectDetailScreen({ id, title, initialPrompt, onClose, onOpenPreview, onDeleted }: Props) {
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [files, setFiles] = useState<BuiltFile[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [builds, setBuilds] = useState<BuildStep[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const seededRef = useRef(false);

  const mode: AppMode = modeForTab(tab);

  // ── Load chat history on mount ────────────────────────────────
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

  // ── Files list ─────────────────────────────────────────────────
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

  // ── SEND — behavior depends on active mode/tab ─────────────────
  const send = useCallback(async (text: string, refs: PromptAttachment[] = []) => {
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
      mode: tab as MsgMode,
      content: text + chipSummary,
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollEnd();

    try {
      if (tab === 'code') {
        // ── BUILD: writes files ─────────────────────────────────
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
        // ── CHAT or PLAN: no files ──────────────────────────────
        const fullPrompt = tab === 'plan' ? PLAN_PREFIX + text : text;
        const result = await deepseekChat(fullPrompt, { sessionId: id });
        setMessages((prev) => [...prev, {
          id: 'a_' + Date.now(),
          role: 'assistant',
          mode: tab as MsgMode,
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
        mode: tab as MsgMode,
        content: msg,
      }]);
    } finally {
      setBusy(false);
    }
  }, [id, busy, tab, refreshFiles, scrollEnd]);

  // ── Seed initial build from Home (only in Build/Code mode) ────
  useEffect(() => {
    if (!initialPrompt || seededRef.current || loadingHistory) return;
    seededRef.current = true;
    setTab('code');
    void send(initialPrompt);
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

  // ── Sync: dropdown change also changes tab ────────────────────
  const handleModeChange = useCallback((m: AppMode) => {
    setTab(tabForMode(m));
  }, []);

  // ── Delete project ─────────────────────────────────────────────
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

  // Messages visible in the current tab.
  const visibleMessages = messages.filter((m) => m.mode === tab);

  const placeholderForTab =
    tab === 'chat' ? 'Ask anything, explore ideas...'
    : tab === 'plan' ? 'Describe what you want to plan...'
    : 'Describe what you want to build or change...';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ─── Header ───────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Close">
          <Feather name="x" size={18} color={lovable.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <Text style={s.headerSub} numberOfLines={1}>Untitled project</Text>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={s.headerBtn}
          accessibilityLabel="More options"
        >
          <Feather name="more-horizontal" size={18} color={lovable.text} />
        </Pressable>
      </View>

      {/* ─── Tabs ─────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {(['chat', 'code', 'plan'] as Tab[]).map((t) => {
          const active = tab === t;
          const icon = t === 'chat' ? 'message-circle' : t === 'code' ? 'code' : 'clock';
          const label = t === 'chat' ? 'Chat' : t === 'code' ? 'Code' : 'Plan';
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[s.tab, active && s.tabActive]}
              accessibilityLabel={label}
            >
              <Feather name={icon} size={13} color={active ? lovable.text : lovable.textMuted} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ─── Tab content ──────────────────────────────────────── */}
      {tab !== 'code' ? (
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={s.flex}
            contentContainerStyle={s.chatContent}
            onContentSizeChange={scrollEnd}
          >
            {loadingHistory && tab === 'chat' ? (
              <ActivityIndicator color={lovable.textMuted} style={{ marginTop: lovable.space.lg }} />
            ) : null}

            {visibleMessages.length === 0 && !loadingHistory ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyTitle}>
                  {tab === 'chat' ? 'Ask anything' : 'Plan your build'}
                </Text>
                <Text style={s.emptySub}>
                  {tab === 'chat'
                    ? 'Talk about your project. Nothing gets written to disk here.'
                    : 'Describe what you want to build and I\u2019ll produce a detailed plan. No files are written.'}
                </Text>
              </View>
            ) : null}

            {visibleMessages.map((m) => {
              const isUser = m.role === 'user';
              const isSystem = m.role === 'system';
              return (
                <View
                  key={m.id}
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
              );
            })}

            {tab === 'plan' && builds.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>BUILD TIMELINE</Text>
                {builds.map((b, idx) => {
                  const totalBytes = b.files.reduce((acc, f) => acc + f.bytes, 0);
                  return (
                    <View key={b.id} style={s.step}>
                      <View style={[s.stepDot, b.ok ? s.stepDotOk : s.stepDotBad]}>
                        <Feather
                          name={b.ok ? 'check' : 'x'}
                          size={11}
                          color={b.ok ? lovable.success : lovable.error}
                        />
                      </View>
                      <View style={s.stepBody}>
                        <Text style={s.stepMeta}>
                          {fmtTime(b.at)} {'\u00B7'} step {builds.length - idx}
                        </Text>
                        <Text style={s.stepPrompt} numberOfLines={3}>{b.prompt}</Text>
                        {b.ok ? (
                          <>
                            <Text style={s.stepSummary}>{b.summary}</Text>
                            {b.files.length > 0 ? (
                              <View style={s.stepFiles}>
                                {b.files.map((f) => (
                                  <Pressable
                                    key={f.path}
                                    onPress={() => { setTab('code'); void viewFile(f.path); }}
                                    style={({ pressed }) => [s.stepFileRow, pressed && { opacity: 0.7 }]}
                                  >
                                    <Feather name="file-text" size={12} color={lovable.textMuted} />
                                    <Text style={s.stepFileName} numberOfLines={1}>{f.path}</Text>
                                    <Text style={s.stepFileMeta}>{fmtBytes(f.bytes)}</Text>
                                  </Pressable>
                                ))}
                                <Text style={s.stepTotal}>
                                  total {b.files.length} file{b.files.length === 1 ? '' : 's'} {'\u00B7'} {fmtBytes(totalBytes)}
                                </Text>
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <Text style={s.stepErr}>{b.error}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </>
            ) : null}

            {busy ? <BuildingIndicator label={tab === 'plan' ? 'Planning\u2026' : 'Thinking\u2026'} /> : null}
            {error ? <Text style={s.errBanner}>{'\u2022'} {error}</Text> : null}
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
              placeholder={placeholderForTab}
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
              <ModeSelector mode={mode} onChange={handleModeChange} />
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
      ) : null}

      {tab === 'code' ? (
        <View style={s.flex}>
          {openFile ? (
            <>
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
            </>
          ) : (
            <>
              <View style={s.filePanelHead}>
                <Text style={s.filePanelTitle}>Files ({files.length})</Text>
                <Pressable onPress={() => void refreshFiles()} style={s.filePanelRefresh} accessibilityLabel="Refresh">
                  <Feather name="refresh-cw" size={14} color={lovable.textMuted} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={s.fileList}>
                {files.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Feather name="file" size={36} color={lovable.textDim} />
                    <Text style={s.emptyTitle}>No files yet</Text>
                    <Text style={s.emptySub}>
                      Type a prompt below and I\u2019ll generate the code.
                    </Text>
                  </View>
                ) : files.map((f) => (
                  <Pressable
                    key={f.path}
                    onPress={() => void viewFile(f.path)}
                    style={({ pressed }) => [s.fileRow, pressed && { opacity: 0.7 }]}
                  >
                    <Feather name="file-text" size={14} color={lovable.textMuted} />
                    <Text style={s.fileName} numberOfLines={1}>{f.path}</Text>
                    <Text style={s.fileMeta}>{f.bytes}B</Text>
                  </Pressable>
                ))}
                {loadingFile ? (
                  <ActivityIndicator color={lovable.textMuted} size="small" style={{ marginVertical: lovable.space.md }} />
                ) : null}
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
                  placeholder={placeholderForTab}
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
                  <ModeSelector mode={mode} onChange={handleModeChange} />
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

                {busy ? <BuildingIndicator label="Generating code\u2026" /> : null}
                {error ? <Text style={s.errBanner}>{'\u2022'} {error}</Text> : null}
              </View>
            </>
          )}
        </View>
      ) : null}

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addAttachment}
        existing={attachments}
      />

      {/* ─── Header ⋯ menu ───────────────────────────────────── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={s.menuSheet}>
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

  tabBar: {
    flexDirection: 'row',
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: 999,
    padding: 3,
    marginHorizontal: lovable.space.md,
    marginTop: lovable.space.sm,
    marginBottom: lovable.space.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: lovable.pillBg },
  tabText: { color: lovable.textMuted, fontSize: lovable.font.sm, fontWeight: lovable.weight.medium },
  tabTextActive: { color: lovable.text, fontWeight: lovable.weight.semibold },

  chatContent: { padding: lovable.space.md, paddingBottom: lovable.space.lg },
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: lovable.space.md,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: lovable.pillBg, borderColor: lovable.pillBorder },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: lovable.card, borderColor: lovable.cardBorder },
  bubbleSystem: { alignSelf: 'center', backgroundColor: lovable.errorSoft, borderColor: 'rgba(220,38,38,0.18)' },
  bubbleText: { color: lovable.text, fontSize: lovable.font.md, lineHeight: 20 },

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

  filePanelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: lovable.space.md,
    paddingVertical: lovable.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  filePanelTitle: { color: lovable.text, fontSize: lovable.font.xs, fontWeight: lovable.weight.bold, letterSpacing: 0.4 },
  filePanelRefresh: { paddingHorizontal: lovable.space.sm, paddingVertical: 2 },
  fileList: { paddingHorizontal: lovable.space.md, paddingTop: lovable.space.sm, paddingBottom: 40 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: lovable.radius.md,
    marginVertical: 4,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
  },
  fileName: { color: lovable.text, fontSize: lovable.font.sm, fontFamily: 'monospace', flex: 1 },
  fileMeta: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace' },
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

  sectionLabel: {
    color: lovable.textMuted,
    fontSize: 10,
    fontWeight: lovable.weight.bold,
    letterSpacing: 0.8,
    marginTop: lovable.space.lg,
    marginBottom: lovable.space.sm,
  },
  step: { flexDirection: 'row', gap: lovable.space.sm + 2, marginBottom: lovable.space.md },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepDotOk: { backgroundColor: lovable.successSoft },
  stepDotBad: { backgroundColor: lovable.errorSoft },
  stepBody: {
    flex: 1,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: lovable.radius.md,
    padding: lovable.space.sm + 4,
  },
  stepMeta: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 },
  stepPrompt: { color: lovable.text, fontSize: lovable.font.md, fontWeight: lovable.weight.medium, lineHeight: 20 },
  stepSummary: { color: lovable.textMuted, fontSize: lovable.font.sm, marginTop: 8, lineHeight: 18 },
  stepFiles: { marginTop: 8, gap: 3 },
  stepFileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  stepFileName: { color: lovable.text, fontSize: lovable.font.xs, fontFamily: 'monospace', flex: 1 },
  stepFileMeta: { color: lovable.textDim, fontSize: 10, fontFamily: 'monospace' },
  stepTotal: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 6 },
  stepErr: { color: lovable.error, fontSize: lovable.font.sm, marginTop: 8 },

  // ⋯ menu
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
