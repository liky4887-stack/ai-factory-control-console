// The Coding Brain — main IDE hub.
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';
import { NeonStatusTag } from '../ui/NeonStatusTag';
import { ActivityFeed } from '../ui/ActivityFeed';
import { useCodingBrain } from './useCodingBrain';
import type { ActivityPhase } from '../core/types';

const PHASES: Array<{ key: ActivityPhase; label: string }> = [
  { key: 'understand', label: 'UNDERSTAND' },
  { key: 'plan', label: 'PLAN' },
  { key: 'generate', label: 'GENERATE' },
];

interface Props {
  onClose: () => void;
}

export function CodingBrainScreen({ onClose }: Props) {
  const { messages, busy, snapshot, submit, reset } = useCodingBrain();
  const [draft, setDraft] = useState('');
  const [glassBoxOpen, setGlassBoxOpen] = useState(true);

  const onSend = () => {
    if (!draft.trim() || busy) return;
    const text = draft;
    setDraft('');
    void submit(text);
  };

  const currentPhase = snapshot.state;
  const isRunning = currentPhase !== 'idle';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} hitSlop={8}>
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>Coding Brain</Text>
          <Text style={s.headerSub}>Glass Box · Cognitive Orchestrator</Text>
        </View>
        <Pressable onPress={reset} style={s.headerBtn} hitSlop={8}>
          <Feather name="refresh-cw" size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <View style={s.stateStrip}>
        <NeonStatusTag
          label={snapshot.state.toUpperCase()}
          color={isRunning ? theme.cyan : theme.textMuted}
          compact
        />
        {PHASES.map((p) => {
          const active = currentPhase === p.key;
          const phaseIdx = PHASES.findIndex((q) => q.key === currentPhase);
          const thisIdx = PHASES.findIndex((q) => q.key === p.key);
          const done = phaseIdx > thisIdx;
          return (
            <NeonStatusTag
              key={p.key}
              label={p.label}
              color={active ? theme.cyan : done ? theme.green : theme.textMuted}
              compact
            />
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.chatBody}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={s.emptyWrap}>
              <Feather name="cpu" size={32} color={theme.textMuted} />
              <Text style={s.emptyTitle}>Ask the Brain</Text>
              <Text style={s.emptySub}>
                Every request walks a pipeline:{' '}
                <Text style={s.emptyAccent}>understand → plan → generate</Text>.
                Watch the state strip light up and the Glass Box stream events.
              </Text>
            </View>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <View
                  key={m.id}
                  style={[
                    s.bubble,
                    isUser ? s.bubbleUser : s.bubbleAI,
                    m.error && s.bubbleError,
                  ]}
                >
                  <View style={s.bubbleHeader}>
                    <Text style={s.bubbleRole}>
                      {isUser ? 'YOU' : m.error ? 'ERROR' : (m.engineLabel || 'BRAIN').toUpperCase()}
                    </Text>
                    {m.fellBack ? (
                      <NeonStatusTag label="fell back" color={theme.amber} compact />
                    ) : null}
                  </View>
                  <Text style={s.bubbleText} selectable>{m.content}</Text>
                </View>
              );
            })
          )}
          {busy ? (
            <View style={s.busyRow}>
              <ActivityIndicator color={theme.cyan} size="small" />
              <Text style={s.busyText}>{snapshot.lastMessage}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={s.glassBoxWrap}>
          <Pressable
            onPress={() => setGlassBoxOpen((v) => !v)}
            style={s.glassBoxHeader}
          >
            <Feather
              name={glassBoxOpen ? 'chevron-down' : 'chevron-up'}
              size={14}
              color={theme.cyan}
            />
            <Text style={s.glassBoxTitle}>GLASS BOX</Text>
            <Text style={s.glassBoxHint}>live activity</Text>
          </Pressable>
          {glassBoxOpen ? (
            <View style={s.glassBoxBody}>
              <ActivityFeed limit={200} />
            </View>
          ) : null}
        </View>

        <View style={s.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask the Brain to do something..."
            placeholderTextColor={theme.textMuted}
            style={s.input}
            editable={!busy}
            multiline
          />
          <Pressable
            onPress={onSend}
            disabled={busy || draft.trim().length === 0}
            style={[
              s.sendBtn,
              (busy || draft.trim().length === 0) && s.sendBtnDisabled,
            ]}
          >
            <Feather name="arrow-up" size={16} color={busy ? theme.textMuted : theme.bg} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.text, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  headerSub: { color: theme.textMuted, fontSize: 10, fontFamily: theme.mono, marginTop: 1 },

  stateStrip: {
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },

  chatBody: { padding: 14, gap: 10, flexGrow: 1 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  emptyTitle: { color: theme.text, fontSize: 18, fontWeight: '700', marginTop: 6 },
  emptySub: { color: theme.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyAccent: { color: theme.cyan, fontWeight: '700', fontFamily: theme.mono },

  bubble: { borderWidth: 1, borderRadius: 12, padding: 10, maxWidth: '92%' },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: theme.glassSoft,
    borderColor: theme.border,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: theme.glass,
    borderColor: theme.cyan + '33',
  },
  bubbleError: {
    borderColor: theme.red + '55',
    backgroundColor: theme.red + '10',
  },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bubbleRole: { color: theme.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  bubbleText: { color: theme.text, fontSize: 12, lineHeight: 17 },

  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  busyText: { color: theme.textMuted, fontSize: 11, fontFamily: theme.mono, flex: 1 },

  glassBoxWrap: {
    borderTopWidth: 1, borderTopColor: theme.border,
    backgroundColor: theme.bgRaised,
  },
  glassBoxHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  glassBoxTitle: { color: theme.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  glassBoxHint: { color: theme.textMuted, fontSize: 10, fontFamily: theme.mono, flex: 1 },
  glassBoxBody: { height: 180 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: theme.border,
    backgroundColor: theme.bg,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: theme.glass,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, color: theme.text,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.cyan,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: theme.border },
});
