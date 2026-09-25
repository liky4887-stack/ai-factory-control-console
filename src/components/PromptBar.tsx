import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
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
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Create a presentati…',
  mode = 'Build',
  onModeChange,
  disabled = false,
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
          onPress={async () => {
            try {
              const clip = await Clipboard.getStringAsync();
              if (clip && clip.trim().length > 0) {
                onChangeText((value ? value + '\n' : '') + clip.trim());
              }
            } catch {}
          }}
        >
          <Text style={s.iconText}>＋</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable style={s.modeBtn} onPress={cycleMode}>
          <Text style={s.modeText}>{activeMode}</Text>
          <Text style={s.modeChevron}>⌄</Text>
        </Pressable>
        <Pressable style={s.iconBtn} onPress={() => { /* TODO: mic */ }}>
          <Text style={s.iconText}>◉</Text>
        </Pressable>
        <Pressable
          style={[s.sendBtn, !canSend && s.sendDisabled]}
          onPress={onSubmit}
          disabled={!canSend}
        >
          <Text style={s.sendText}>↑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: lovable.input,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: lovable.inputBorder,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    minHeight: 140,
  },
  input: {
    color: lovable.text,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 56,
    padding: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  iconBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconText: { color: lovable.textMuted, fontSize: 16, fontWeight: '600' },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modeText: { color: lovable.text, fontSize: 13, fontWeight: '600' },
  modeChevron: { color: lovable.textMuted, fontSize: 12, marginTop: -4 },
  sendBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: lovable.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: 'rgba(255,255,255,0.15)' },
  sendText: { color: '#000', fontSize: 18, fontWeight: '700', marginTop: -2 },
});
