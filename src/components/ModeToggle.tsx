import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

export type AppMode = 'creator' | 'commander';

interface Props {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <View style={s.wrap} testID="mode-toggle">
      {(['creator', 'commander'] as AppMode[]).map((m) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          style={({ pressed }) => [s.pill, mode === m && s.pillActive, pressed && s.pressed]}
        >
          <Text style={[s.label, mode === m && s.labelActive]}>
            {m === 'creator' ? 'Creator' : 'Commander'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: theme.glassSoft, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 3 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  pillActive: { backgroundColor: `${theme.blue}30`, borderColor: theme.borderStrong, borderWidth: 1, margin: -1 },
  pressed: { opacity: 0.7 },
  label: { color: theme.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  labelActive: { color: theme.cyan },
});
