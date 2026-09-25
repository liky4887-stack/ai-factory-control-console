import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  deepseekChat,
  deepseekHealth,
  getChatHistory,
  resetBackendUrl,
  type DeepSeekHealth,
} from '../services/deepseekApi';

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

let msgCounter = 0;
const nextId = () => `m_${Date.now()}_${msgCounter++}`;

export function DeepSeekChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<DeepSeekHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);

  const refreshHealth = useCallback(async () => {
    try {
      resetBackendUrl();
      const h = await deepseekHealth();
      setHealth(h);
      setError(null);
    } catch (e) {
      setHealth(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);

  // Load persisted chat history on mount so conversations survive app restarts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await getChatHistory('default', 100);
        if (cancelled) return;
        const restored: Msg[] = history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          ts: new Date(m.createdAt).getTime(),
        }));
        setMessages(restored);
        scrollToEnd();
      } catch {
        // Silent — the user will still see the empty state.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Msg = { id: nextId(), role: 'user', content: text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    scrollToEnd();

    try {
      const result = await deepseekChat(text);
      const assistantMsg: Msg = {
        id: nextId(),
        role: 'assistant',
        content: result.content,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      scrollToEnd();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'system', content: `error: ${msg}`, ts: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  }, [input, sending, scrollToEnd]);

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    return (
      <View style={[
        styles.bubble,
        isUser ? styles.bubbleUser : isSystem ? styles.bubbleSystem : styles.bubbleAssistant,
      ]}>
        <Text style={[styles.bubbleText, isSystem && styles.bubbleTextSystem]}>
          {item.content}
        </Text>
      </View>
    );
  };

  const statusLine = (() => {
    if (error) return `● ${error}`;
    if (!health) return '● connecting...';
    if (!health.credentialsConfigured) return '● backend up — credentials not loaded';
    if (!health.bearerValid) return `● backend up — token invalid (${health.lastError ?? 'unknown'})`;
    return '● backend up — ready';
  })();

  const statusColor = error
    ? '#ff5555'
    : !health || !health.credentialsConfigured || !health.bearerValid
      ? '#ffaa33'
      : '#44ff88';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>DeepSeek</Text>
        <Pressable onPress={refreshHealth} style={styles.reloadBtn}>
          <Text style={styles.reloadText}>reload</Text>
        </Pressable>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
          {statusLine}
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ask anything. Messages go straight to your Termux backend on 8790.
          </Text>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message DeepSeek"
            placeholderTextColor="#666"
            multiline
            editable={!sending}
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={send}
            disabled={sending || input.trim().length === 0}
            style={[
              styles.sendBtn,
              (sending || input.trim().length === 0) && styles.sendBtnDisabled,
            ]}
          >
            {sending
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.sendText}>↑</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  reloadBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#1a1a1a' },
  reloadText: { color: '#8ab4f8', fontSize: 12 },
  statusRow: { paddingHorizontal: 16, paddingVertical: 6 },
  status: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  list: { padding: 16, paddingBottom: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 13 },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#2a4a8a' },
  bubbleAssistant: { alignSelf: 'flex-start', backgroundColor: '#1a1a1a' },
  bubbleSystem: { alignSelf: 'center', backgroundColor: '#2a1010' },
  bubbleText: { color: '#eee', fontSize: 14, lineHeight: 20 },
  bubbleTextSystem: { color: '#ff8888', fontSize: 12, fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#141414',
    color: '#eee',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8ab4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#000', fontSize: 20, fontWeight: '700', marginTop: -2 },
});
