import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { PromptBar, type PromptMode } from '../components/PromptBar';
import { lovable } from '../theme';

interface Props {
  workspaceName?: string;
  onOpenSystem: () => void;
  onCreateProject: (prompt: string, mode: PromptMode) => void;
  onOpenProjects: () => void;
}

export function HomeScreen({
  workspaceName = "Sovereign's Lovable",
  onOpenSystem,
  onCreateProject,
}: Props) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<PromptMode>('Build');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await Promise.resolve(onCreateProject(text, mode));
      setPrompt('');
    } finally {
      setBusy(false);
    }
  }, [prompt, mode, busy, onCreateProject]);

  return (
    <View style={s.root}>
      <GradientBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Pressable style={s.workspacePill} onPress={() => {}}>
            <View style={s.avatarDot} />
            <Text style={s.workspaceText}>{workspaceName}</Text>
            <Text style={s.chevron}>{'\u2303\u2304'}</Text>
          </Pressable>
          <Pressable style={s.profileBtn} onPress={onOpenSystem} accessibilityLabel="System settings">
            <View style={s.profileDot} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={s.center}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.centerContent}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable style={s.newPill} onPress={() => {}}>
              <View style={s.newBadge}><Text style={s.newBadgeText}>New</Text></View>
              <Text style={s.newPillText}>Chat for free</Text>
              <Text style={s.newArrow}>{'\u2192'}</Text>
            </Pressable>

            <Text style={s.h1}>Let's build something</Text>

            <View style={s.promptWrap}>
              <PromptBar
                value={prompt}
                onChangeText={setPrompt}
                onSubmit={submit}
                mode={mode}
                onModeChange={setMode}
                placeholder="Describe a website or app..."
                disabled={busy}
              />
            </View>

            {busy ? (
              <View style={s.busyRow}>
                <ActivityIndicator color={lovable.accent} size="small" />
                <Text style={s.busyText}>generating code...</Text>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: lovable.space.md, paddingTop: lovable.space.xs,
  },
  workspacePill: {
    flexDirection: 'row', alignItems: 'center', gap: lovable.space.sm,
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: lovable.space.sm,
    borderRadius: lovable.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#c060a0' },
  workspaceText: { color: lovable.text, fontSize: lovable.font.md, fontWeight: '600' },
  chevron: { color: lovable.textMuted, fontSize: 10, marginLeft: 2 },
  profileBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3aa8b8' },
  center: { flex: 1 },
  centerContent: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: lovable.space.lg, paddingBottom: 120,
  },
  newPill: {
    flexDirection: 'row', alignItems: 'center', gap: lovable.space.sm,
    paddingHorizontal: 6, paddingVertical: 6, paddingRight: lovable.space.sm + 6,
    borderRadius: lovable.radius.pill,
    backgroundColor: 'rgba(30,30,30,0.75)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: lovable.space.xl + 8,
  },
  newBadge: {
    backgroundColor: lovable.accent,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: lovable.radius.pill,
  },
  newBadgeText: { color: '#fff', fontSize: lovable.font.sm, fontWeight: '700' },
  newPillText: { color: lovable.text, fontSize: lovable.font.sm, fontWeight: '500' },
  newArrow: { color: lovable.text, fontSize: lovable.font.md },
  h1: {
    color: lovable.text, fontSize: lovable.font.xxl, fontWeight: '700',
    textAlign: 'center', marginBottom: lovable.space.xl, letterSpacing: -0.3,
  },
  promptWrap: { width: '100%', maxWidth: 560 },
  busyRow: { flexDirection: 'row', gap: lovable.space.sm, alignItems: 'center', marginTop: lovable.space.md },
  busyText: { color: lovable.textMuted, fontSize: lovable.font.sm },
});
