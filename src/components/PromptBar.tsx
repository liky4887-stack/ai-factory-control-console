// Figma reference: home + dashboard input box (screenshots 1 & 4).
// Chips above, text input, then Attach / Online / up-arrow row.
import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { lovable } from '../theme';

export type PromptMode = 'Build' | 'Chat' | 'Plan';

export interface PromptAttachment {
  id: string;
  kind: 'image' | 'figma' | 'skill';
  label: string;
}

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  mode?: PromptMode;
  onModeChange?: (m: PromptMode) => void;
  disabled?: boolean;
  attachments?: PromptAttachment[];
  onRemoveAttachment?: (id: string) => void;
  onOpenAttachSheet?: () => void;
}

const KIND_ICON: Record<PromptAttachment['kind'], any> = {
  image: 'image',
  figma: 'layout',
  skill: 'star',
};

export function PromptBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Describe a website or app...',
  disabled = false,
  attachments = [],
  onRemoveAttachment,
  onOpenAttachSheet,
}: Props) {
  const canSend = !disabled && value.trim().length > 0;
  const hasChips = attachments.length > 0;

  return (
    <View style={s.wrap}>
      {hasChips ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {attachments.map((a) => (
            <View key={a.id} style={s.chip}>
              <Feather
                name={KIND_ICON[a.kind]}
                size={12}
                color={lovable.chipText}
              />
              <Text style={s.chipText} numberOfLines={1}>{a.label}</Text>
              {onRemoveAttachment ? (
                <Pressable
                  onPress={() => onRemoveAttachment(a.id)}
                  hitSlop={8}
                  accessibilityLabel={'Remove ' + a.label}
                >
                  <Feather name="x" size={12} color={lovable.chipText} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

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
          style={({ pressed }) => [s.attachBtn, pressed && { opacity: 0.6 }]}
          onPress={onOpenAttachSheet}
          disabled={disabled || !onOpenAttachSheet}
          accessibilityLabel="Attach a reference"
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
          style={[s.sendBtn, !canSend && s.sendDisabled]}
          onPress={onSubmit}
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
    paddingBottom: lovable.space.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
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
    fontSize: lovable.font.lg,
    lineHeight: 22,
    minHeight: 48,
    padding: 0,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: lovable.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: lovable.accentSoft,
  },
});
