// Figma reference: project detail (screenshots 2 & 3).
// Light theme, chat as activity feed, white file panel, light code viewer,
// bottom input with Attach / Online / send. AttachmentSheet wired.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getChatHistory, type ChatHistoryMessage } from '../services/deepseekApi';
import { api, type BuiltFile, type BuildAttachmentsPayload } from '../services/api';
import { AttachmentSheet, type PromptAttachment } from '../components/AttachmentSheet';
import { lovable } from '../theme';

interface Props {
  id: string;
  title?: string;
  initialPrompt?: string;
  onClose: () => void;
  onOpenPreview: () => void;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function attachmentsToPayload(refs: PromptAttachment[]): BuildAttachmentsPayload {
  const payload: BuildAttachmentsPayload = {};
  const imageUrls: string[] = [];
  const forceSkillIds: string[] = [];
  let figmaUrl: string | undefined;
  for (const r of refs) {
    if (r.kind === 'image') imageUrls.push(r.value);
    else if (r.kind === 'figma') figmaUrl = r.value;
    else if (r.kind === 'skill') forceSkillIds.push(r.value);
  }
  if (imageUrls.length) payload.imageUrls = imageUrls;
  if (figmaUrl) payload.figmaUrl = figmaUrl;
  if (forceSkillIds.length) payload.forceSkillIds = forceSkillIds;
  return payload;
}

export function ProjectDetailScreen({ id, title, initialPrompt, onClose, onOpenPreview }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [building, setBuilding] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [files, setFiles] = useState<BuiltFile[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history: ChatHistoryMessage[] = await getChatHistory(id, 100);
        if (cancelled) return;
        setMessages(history.map((m) => ({ id: m.id, role: m.role, content: m.content })));
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

  const build = useCallback(async (text: string, refs: PromptAttachment[] = []) => {
    if (!text || building) return;
    const payload = attachmentsToPayload(refs);
    setInput('');
    setBuilding(true);
    setError(null);

    const chipSummary = refs.length > 0
      ? '\n\n' + refs.map((r) => '· ' + r.label).join('\n')
      : '';
    setMessages((prev) => [
      ...prev,
      { id: 'u_' + Date.now(), role: 'user', content: text + chipSummary },
    ]);
    scrollEnd();

    try {
      const result = await api.buildProject(id, text, payload);
      const fileLines = result.files.map((f) => '  \u00B7 ' + f.path + '  (' + f.bytes + 'B)').join('\n');
      setMessages((prev) => [...prev, {
        id: 'a_' + Date.now(),
        role: 'assistant',
        content: result.summary + (fileLines ? '\n\n' + fileLines : ''),
      }]);
      setAttachments([]);
      await refreshFiles();
      scrollEnd();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => [...prev, { id: 'e_' + Date.now(), role: 'system', content: msg }]);
    } finally {
      setBuilding(false);
    }
  }, [id, building, refreshFiles, scrollEnd]);

  useEffect(() => {
    if (!initialPrompt || seededRef.current || loadingHistory) return;
    seededRef.current = true;
    void build(initialPrompt);
  }, [initialPrompt, loadingHistory, build]);

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

  const headerTitle = title || 'Untitled project';
  const canSend = !!input.trim() && !building;

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
        <Pressable onPress={onOpenPreview} style={s.headerBtn} accessibilityLabel="Open preview">
          <Feather name="chevron-right" size={20} color={lovable.text} />
        </Pressable>
      </View>

      {openFile ? (
        <View style={s.codeViewer}>
          <View style={s.codeHeader}>
            <Pressable onPress={() => setOpenFile(null)} style={s.backBtn} accessibilityLabel="Back">
              <Feather name="chevron-left" size={20} color={lovable.text} />
            </Pressable>
            <Text style={s.codeHeaderPath} numberOfLines={1}>{openFile.path}</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={s.codeBody} contentContainerStyle={{ padding: lovable.space.md }}>
            <ScrollView horizontal>
              <Text style={s.codeMono} selectable>{openFile.content}</Text>
            </ScrollView>
          </ScrollView>
        </View>
      ) : (
        <>
          <KeyboardAvoidingView
            style={s.chatWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              style={s.chat}
              contentContainerStyle={s.chatContent}
              onContentSizeChange={scrollEnd}
            >
              {loadingHistory ? (
                <ActivityIndicator color={lovable.textMuted} style={{ marginTop: lovable.space.lg }} />
              ) : null}

              {messages.length === 0 && !loadingHistory ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyTitle}>What should I build?</Text>
                  <Text style={s.emptySub}>
                    Describe a page, a feature, or a change. I'll generate the code.
                  </Text>
                </View>
              ) : null}

              {messages.map((m) => {
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
                      style={[
                        s.bubbleText,
                        isSystem && { color: lovable.error },
                      ]}
                      selectable
                    >
                      {m.content}
                    </Text>
                  </View>
                );
              })}

              {building ? (
                <View style={s.buildingRow}>
                  <ActivityIndicator color={lovable.textMuted} size="small" />
                  <Text style={s.buildingText}>generating code{'\u2026'}</Text>
                </View>
              ) : null}

              {error ? <Text style={s.errBanner}>{'\u2022'} {error}</Text> : null}
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={s.filePanel}>
            <View style={s.filePanelHead}>
              <Text style={s.filePanelTitle}>Files ({files.length})</Text>
              <Pressable
                onPress={() => void refreshFiles()}
                style={s.filePanelRefresh}
                accessibilityLabel="Refresh files"
              >
                <Feather name="refresh-cw" size={14} color={lovable.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={s.fileList} contentContainerStyle={{ paddingBottom: lovable.space.sm }}>
              {files.length === 0 ? (
                <Text style={s.fileEmpty}>No files yet</Text>
              ) : files.map((f) => (
                <Pressable
                  key={f.path}
                  onPress={() => void viewFile(f.path)}
                  style={({ pressed }) => [s.fileRow, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="file-text" size={13} color={lovable.textMuted} />
                  <Text style={s.fileName} numberOfLines={1}>{f.path}</Text>
                  <Text style={s.fileMeta}>{f.bytes}B</Text>
                </Pressable>
              ))}
              {loadingFile ? (
                <ActivityIndicator
                  color={lovable.textMuted}
                  size="small"
                  style={{ marginVertical: lovable.space.sm }}
                />
              ) : null}
            </ScrollView>
          </View>

          <View style={s.inputWrap}>
            {attachments.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipRow}
              >
                {attachments.map((a) => (
                  <View key={a.id} style={s.chip}>
                    <Feather
                      name={a.kind === 'image' ? 'image' : a.kind === 'figma' ? 'layout' : 'star'}
                      size={12}
                      color={lovable.chipText}
                    />
                    <Text style={s.chipText} numberOfLines={1}>{a.label}</Text>
                    <Pressable
                      onPress={() => removeAttachment(a.id)}
                      hitSlop={8}
                      accessibilityLabel={'Remove ' + a.label}
                    >
                      <Feather name="x" size={12} color={lovable.chipText} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Describe what you want to change or add..."
              placeholderTextColor={lovable.textDim}
              style={s.input}
              multiline
              editable={!building}
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

              <View style={s.onlinePill}>
                <Feather name="globe" size={12} color={lovable.pillText} />
                <Text style={s.onlineText}>Online</Text>
              </View>

              <View style={{ flex: 1 }} />

              <Pressable
                style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
                onPress={() => void build(input.trim(), attachments)}
                disabled={!canSend}
                accessibilityLabel="Send"
              >
                <Feather
                  name="arrow-up"
                  size={16}
                  color={canSend ? '#FFFFFF' : lovable.textFaint}
                />
              </Pressable>
            </View>
          </View>
        </>
      )}

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addAttachment}
        existing={attachments}
      />
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
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: lovable.space.sm },
  headerTitle: { color: lovable.text, fontSize: lovable.font.md, fontWeight: lovable.weight.semibold },
  headerSub: { color: lovable.textMuted, fontSize: lovable.font.xs, marginTop: 1 },

  chatWrap: { flex: 1 },
  chat: { flex: 1 },
  chatContent: { padding: lovable.space.md, paddingBottom: lovable.space.lg },
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: lovable.space.md,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: lovable.pillBg,
    borderColor: lovable.pillBorder,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: lovable.card,
    borderColor: lovable.cardBorder,
  },
  bubbleSystem: {
    alignSelf: 'center',
    backgroundColor: lovable.errorSoft,
    borderColor: 'rgba(220,38,38,0.18)',
  },
  bubbleText: { color: lovable.text, fontSize: lovable.font.md, lineHeight: 20 },

  emptyBox: { alignItems: 'center', paddingVertical: lovable.space.xxl },
  emptyTitle: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxl,
    letterSpacing: -0.3,
  },
  emptySub: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    marginTop: lovable.space.sm,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  buildingRow: {
    flexDirection: 'row',
    gap: lovable.space.sm,
    alignItems: 'center',
    paddingVertical: lovable.space.sm,
  },
  buildingText: { color: lovable.textMuted, fontSize: lovable.font.xs },
  errBanner: {
    color: lovable.error,
    fontSize: lovable.font.xs,
    textAlign: 'center',
    marginTop: lovable.space.sm,
  },

  filePanel: {
    borderTopWidth: 1,
    borderTopColor: lovable.cardBorder,
    backgroundColor: lovable.bgElevated,
    maxHeight: 240,
  },
  filePanelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: lovable.space.md,
    paddingVertical: lovable.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  filePanelTitle: {
    color: lovable.text,
    fontSize: lovable.font.xs,
    fontWeight: lovable.weight.bold,
    letterSpacing: 0.4,
  },
  filePanelRefresh: { paddingHorizontal: lovable.space.sm, paddingVertical: 2 },
  fileList: { paddingHorizontal: 10 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: lovable.radius.sm,
    marginVertical: 3,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
  },
  fileName: {
    color: lovable.text,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
    flex: 1,
  },
  fileMeta: {
    color: lovable.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  fileEmpty: {
    color: lovable.textDim,
    fontSize: lovable.font.xs,
    textAlign: 'center',
    paddingVertical: lovable.space.md,
    fontStyle: 'italic',
  },

  codeViewer: { flex: 1, backgroundColor: lovable.bg },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: lovable.space.sm + 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  codeHeaderPath: {
    flex: 1,
    textAlign: 'center',
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
    fontFamily: 'monospace',
  },
  codeBody: { flex: 1, backgroundColor: lovable.card },
  codeMono: {
    color: lovable.text,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
    lineHeight: 17,
  },

  inputWrap: {
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.sm,
    paddingBottom: lovable.space.sm + 4,
    borderTopWidth: 1,
    borderTopColor: lovable.cardBorder,
    backgroundColor: lovable.bg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: lovable.space.xs,
    paddingBottom: lovable.space.sm,
  },
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
  chipText: {
    color: lovable.chipText,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.medium,
    flexShrink: 1,
  },
  input: {
    color: lovable.text,
    fontSize: lovable.font.md,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    marginTop: lovable.space.sm,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  attachText: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.medium,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: lovable.pillBg,
    borderWidth: 1,
    borderColor: lovable.pillBorder,
  },
  onlineText: {
    color: lovable.pillText,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.medium,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: lovable.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: lovable.accentSoft },
});
