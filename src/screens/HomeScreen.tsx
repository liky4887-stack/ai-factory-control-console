// Figma reference: home screen (screenshot 1).
// Cream bg + pastel wash, serif hero, floating workspace pill,
// PromptBar with Attach/Online/send, suggestion pills below.
// AttachmentSheet opens from PromptBar's Attach button.
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { PromptBar, type PromptMode } from '../components/PromptBar';
import { AttachmentSheet, type PromptAttachment } from '../components/AttachmentSheet';
import { BuildingIndicator } from '../components/BuildingIndicator';
import { lovable } from '../theme';

interface Props {
  workspaceName?: string;
  onOpenSystem: () => void;
  onCreateProject: (prompt: string, mode: PromptMode, attachments: PromptAttachment[]) => void;
  onOpenProjects: () => void;
}

const SUGGESTIONS: Array<{ icon: any; label: string }> = [
  { icon: 'shopping-bag', label: 'E-commerce website' },
  { icon: 'edit-3', label: 'Personal blog' },
  { icon: 'layout', label: 'Landing page' },
  { icon: 'user', label: 'Portfolio site' },
];

export function HomeScreen({
  workspaceName = "Sovereign's Lovable",
  onOpenSystem,
  onCreateProject,
}: Props) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<PromptMode>('Build');
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const submit = useCallback(async () => {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await Promise.resolve(onCreateProject(text, mode, attachments));
      setPrompt('');
      setAttachments([]);
    } finally {
      setBusy(false);
    }
  }, [prompt, mode, busy, attachments, onCreateProject]);

  const applySuggestion = useCallback((label: string) => {
    setPrompt('Build a ' + label.toLowerCase() + ' for ');
  }, []);

  const addAttachment = useCallback((att: PromptAttachment) => {
    setAttachments((prev) => {
      if (prev.some((a) => a.id === att.id)) return prev;
      return [...prev, att];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <View style={s.root}>
      <GradientBackground />
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Pressable style={s.workspacePill} onPress={() => { /* TODO */ }}>
            <View style={s.avatarDot} />
            <Text style={s.workspaceText}>{workspaceName}</Text>
            <Feather name="chevron-down" size={12} color={lovable.textMuted} />
          </Pressable>
          <Pressable
            style={s.profileBtn}
            onPress={onOpenSystem}
            accessibilityLabel="Open settings"
          >
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
            <Text style={s.hero}>Let's build something</Text>
            <Text style={s.subhead}>Describe a page or an app. I'll generate the code.</Text>

            <View style={s.promptWrap}>
              <PromptBar
                value={prompt}
                onChangeText={setPrompt}
                onSubmit={submit}
                mode={mode}
                onModeChange={setMode}
                placeholder="Describe a website or app..."
                disabled={busy}
                attachments={attachments}
                onRemoveAttachment={removeAttachment}
                onOpenAttachSheet={() => setSheetOpen(true)}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[s.suggestScroll, { marginTop: lovable.space.lg }]}
              contentContainerStyle={s.suggestRow}
            >
              {SUGGESTIONS.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [s.suggestPill, pressed && { opacity: 0.7 }]}
                  onPress={() => applySuggestion(item.label)}
                  disabled={busy}
                >
                  <Feather name={item.icon} size={13} color={lovable.textMuted} />
                  <Text style={s.suggestText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {busy ? (
              <View style={s.busyWrap}>
                <BuildingIndicator label="Generating code" />
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <AttachmentSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={addAttachment}
        existing={attachments}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.xs,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingHorizontal: lovable.space.md,
    paddingVertical: lovable.space.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: lovable.cardBorder,
  },
  avatarDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#E8A0C0' },
  workspaceText: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  profileDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3AA8B8' },
  center: { flex: 1 },
  centerContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: lovable.space.lg,
    paddingBottom: 140,
  },
  hero: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.hero,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  subhead: {
    color: lovable.textMuted,
    fontSize: lovable.font.lg,
    textAlign: 'center',
    marginTop: lovable.space.md,
    marginBottom: lovable.space.xl,
    maxWidth: 320,
    lineHeight: 22,
  },
  promptWrap: { width: '100%', maxWidth: 560 },
  suggestScroll: {
    flexGrow: 0,
    maxHeight: 72,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingVertical: lovable.space.xs,
    paddingHorizontal: lovable.space.xs,
  },
  suggestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: lovable.cardBorder,
  },
  suggestText: {
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.medium,
  },
  busyWrap: {
    width: '100%',
    maxWidth: 560,
    marginTop: lovable.space.md,
  },
  busyRow: {
    flexDirection: 'row',
    gap: lovable.space.sm,
    alignItems: 'center',
    paddingTop: lovable.space.lg,
  },
  busyText: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
  },
});
