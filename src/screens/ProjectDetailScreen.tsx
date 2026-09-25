import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChatHistory, type ChatHistoryMessage } from '../services/deepseekApi';
import { api, type BuiltFile } from '../services/api';
import * as Clipboard from 'expo-clipboard';
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

export function ProjectDetailScreen({ id, title, initialPrompt, onClose, onOpenPreview }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [building, setBuilding] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [files, setFiles] = useState<BuiltFile[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const build = useCallback(async (text: string) => {
    if (!text || building) return;
    setInput('');
    setBuilding(true);
    setError(null);
    setMessages((prev) => [...prev, { id: 'u_' + Date.now(), role: 'user', content: text }]);
    scrollEnd();
    try {
      const result = await api.buildProject(id, text);
      const fileLines = result.files.map((f) => '  · ' + f.path + '  (' + f.bytes + 'B)').join('\n');
      setMessages((prev) => [...prev, {
        id: 'a_' + Date.now(),
        role: 'assistant',
        content: result.summary + (fileLines ? '\n\n' + fileLines : ''),
      }]);
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

  const headerTitle = title || 'Untitled project';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn}>
          <Text style={s.headerIcon}>✕</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{headerTitle}</Text>
          <Text style={s.headerChevron}>⌄</Text>
        </View>
        <Pressable onPress={onOpenPreview} style={s.headerBtn}>
          <Text style={s.headerIcon}>›</Text>
        </Pressable>
      </View>

      {openFile ? (
        <View style={s.codeViewer}>
          <View style={s.codeHeader}>
            <Pressable onPress={() => setOpenFile(null)} style={s.backBtn}>
              <Text style={s.backIcon}>‹</Text>
            </Pressable>
            <Text style={s.codeHeaderPath} numberOfLines={1}>{openFile.path}</Text>
            <View style={{ width: 32 }} />
          </View>
          <ScrollView style={s.codeBody} contentContainerStyle={{ padding: 14 }}>
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
                <ActivityIndicator color={lovable.accent} style={{ marginTop: 24 }} />
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
                  <View key={m.id} style={[s.bubble, isUser ? s.bubbleUser : isSystem ? s.bubbleSystem : s.bubbleAssistant]}>
                    <Text style={[s.bubbleText, isSystem && { color: '#ff8888' }]} selectable>{m.content}</Text>
                  </View>
                );
              })}

              {building ? (
                <View style={s.buildingRow}>
                  <ActivityIndicator color={lovable.accent} size="small" />
                  <Text style={s.buildingText}>generating code…</Text>
                </View>
              ) : null}

              {error ? <Text style={s.errBanner}>● {error}</Text> : null}
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={s.filePanel}>
            <View style={s.filePanelHead}>
              <Text style={s.filePanelTitle}>Files ({files.length})</Text>
              <Pressable onPress={() => void refreshFiles()} style={s.filePanelRefresh}>
                <Text style={s.filePanelRefreshText}>⟳</Text>
              </Pressable>
            </View>
            <ScrollView style={s.fileList} contentContainerStyle={{ paddingBottom: 8 }}>
              {files.length === 0 ? (
                <Text style={s.fileEmpty}>No files yet</Text>
              ) : files.map((f) => (
                <Pressable
                  key={f.path}
                  onPress={() => void viewFile(f.path)}
                  style={({ pressed }) => [s.fileRow, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.fileName} numberOfLines={1}>{f.path}</Text>
                  <Text style={s.fileMeta}>{f.bytes}B</Text>
                </Pressable>
              ))}
              {loadingFile ? (
                <ActivityIndicator color={lovable.accent} size="small" style={{ marginVertical: 8 }} />
              ) : null}
            </ScrollView>
          </View>

          <View style={s.inputWrap}>
            <Pressable
              style={s.plusBtn}
              onPress={async () => {
                try {
                  const clip = await Clipboard.getStringAsync();
                  if (clip && clip.trim().length > 0) {
                    setInput((cur) => (cur ? cur + '\n' : '') + clip.trim());
                  }
                } catch {}
              }}
            >
              <Text style={s.plusText}>＋</Text>
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Describe what you want to change or add…"
              placeholderTextColor={lovable.textDim}
              style={s.input}
              multiline
              editable={!building}
            />
            <Pressable
              style={[s.sendBtn, (!input.trim() || building) && s.sendBtnDisabled]}
              onPress={() => void build(input.trim())}
              disabled={!input.trim() || building}
            >
              <Text style={s.sendText}>↑</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: lovable.cardBorder,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { color: lovable.text, fontSize: 16, fontWeight: '600' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '65%' },
  headerTitle: { color: lovable.text, fontSize: 15, fontWeight: '600' },
  headerChevron: { color: lovable.textMuted, fontSize: 12, marginTop: -4 },

  chatWrap: { flex: 1 },
  chat: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },
  bubble: {
    maxWidth: '90%',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, marginBottom: 10,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#1e2a5a' },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: '#161616' },
  bubbleSystem: { alignSelf: 'center', backgroundColor: '#2a1010' },
  bubbleText: { color: lovable.text, fontSize: 14, lineHeight: 20 },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { color: lovable.text, fontSize: 18, fontWeight: '600' },
  emptySub: { color: lovable.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center', maxWidth: 260 },
  buildingRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8 },
  buildingText: { color: lovable.textMuted, fontSize: 12 },
  errBanner: { color: '#ff5555', fontSize: 12, textAlign: 'center', marginTop: 8 },

  filePanel: {
    borderTopWidth: 1, borderTopColor: lovable.cardBorder,
    backgroundColor: '#0a0a0a',
    maxHeight: 240,
  },
  filePanelHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: lovable.cardBorder,
  },
  filePanelTitle: { color: lovable.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  filePanelRefresh: { paddingHorizontal: 8, paddingVertical: 2 },
  filePanelRefreshText: { color: lovable.textMuted, fontSize: 14 },
  fileList: { paddingHorizontal: 10 },
  fileRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 8, marginVertical: 3,
    backgroundColor: lovable.card,
    borderWidth: 1, borderColor: lovable.cardBorder,
  },
  fileName: { color: lovable.text, fontSize: 12, fontFamily: 'monospace', flex: 1 },
  fileMeta: { color: lovable.textMuted, fontSize: 10, fontFamily: 'monospace' },
  fileEmpty: { color: lovable.textDim, fontSize: 12, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },

  codeViewer: { flex: 1, backgroundColor: lovable.bg },
  codeHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: lovable.cardBorder,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: lovable.text, fontSize: 18, fontWeight: '600', marginTop: -2 },
  codeHeaderPath: {
    flex: 1, textAlign: 'center',
    color: lovable.text, fontSize: 13, fontWeight: '600',
    fontFamily: 'monospace',
  },
  codeBody: { flex: 1, backgroundColor: '#0a0a0a' },
  codeMono: {
    color: '#c8d4c0', fontSize: 11, fontFamily: 'monospace', lineHeight: 16,
  },

  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: lovable.cardBorder,
    gap: 8,
  },
  plusBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  plusText: { color: lovable.text, fontSize: 18 },
  input: {
    flex: 1, color: lovable.text, fontSize: 14,
    maxHeight: 120,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: lovable.input,
    borderWidth: 1, borderColor: lovable.inputBorder,
    borderRadius: 12,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: lovable.text,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
  sendText: { color: '#000', fontSize: 18, fontWeight: '800', marginTop: -2 },
});
