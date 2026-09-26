import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { lovable } from '../theme';

export type PromptMode = 'Build' | 'Chat' | 'Plan';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  mode?: PromptMode;
  onModeChange?: (m: PromptMode) => void;
  disabled?: boolean;
}

const MODES: PromptMode[] = ['Build', 'Chat', 'Plan'];

export function PromptBar({
  value, onChangeText, onSubmit,
  placeholder = 'Create a presentati...',
  mode = 'Build', onModeChange, disabled = false,
}: Props) {
  const [internalMode, setInternalMode] = useState<PromptMode>(mode);
  const activeMode = onModeChange ? mode : internalMode;

  const cycleMode = () => {
    const idx = MODES.indexOf(activeMode);
    const next = MODES[(idx + 1) % MODES.length];
    if (onModeChange) onModeChange(next);
    else setInternalMode(next);
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <View style={s.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={lovable.textDim}
        style={s.input}
        multiline
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={s.bottomRow}>
        <Pressable
          style={s.iconBtn}
          accessibilityLabel="Paste from clipboard"
          onPress={async () => {
            try {
              const clip = await Clipboard.getStringAsync();
              if (clip && clip.trim().length > 0) {
                onChangeText((value ? value + '\n' : '') + clip.trim());
              }
            } catch {}
          }}
        >
          <Text style={s.iconText}>+</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={s.modeBtn} onPress={cycleMode}>
          <Text style={s.modeText}>{activeMode}</Text>
          <Text style={s.modeChevron}>{'\u2304'}</Text>
        </Pressable>
        <Pressable style={s.iconBtn} accessibilityLabel="Voice input" onPress={() => {}}>
          <Text style={s.iconText}>{'\u25C9'}</Text>
        </Pressable>
        <Pressable
          style={[s.sendBtn, !canSend && s.sendDisabled]}
          onPress={onSubmit}
          disabled={!canSend}
          accessibilityLabel="Send prompt"
        >
          <Text style={s.sendText}>{'\u2191'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: lovable.input,
    borderRadius: lovable.radius.xl,
    borderWidth: 1,
    borderColor: lovable.inputBorder,
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.md,
    paddingBottom: lovable.space.sm + 4,
    minHeight: 140,
  },
  input: { color: lovable.text, fontSize: lovable.font.lg, lineHeight: 22, minHeight: 56, padding: 0 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: lovable.space.sm, gap: lovable.space.sm },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconText: { color: lovable.textMuted, fontSize: lovable.font.lg, fontWeight: '600' },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: lovable.space.sm + 2, paddingVertical: 6,
    borderRadius: lovable.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modeText: { color: lovable.text, fontSize: lovable.font.sm, fontWeight: '600' },
  modeChevron: { color: lovable.textMuted, fontSize: 12, marginTop: -4 },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: lovable.text,
    alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
  sendText: { color: '#000', fontSize: 18, fontWeight: '800', marginTop: -2 },
});
