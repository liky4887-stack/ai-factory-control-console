// Deep-black glass button. Variants: primary, ghost, danger.
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, type PressableProps } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../theme';

interface Props extends PressableProps {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'ghost' | 'danger';
  busy?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function GlassButton({
  label, icon, variant = 'primary', busy, size = 'md',
  disabled, style, ...rest
}: Props) {
  const isDisabled = disabled || busy;
  const height = size === 'sm' ? 32 : size === 'lg' ? 52 : 40;
  const pad = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;
  const bg =
    variant === 'primary' ? theme.cyan + '18' :
    variant === 'danger' ? theme.red + '18' :
    'transparent';
  const border =
    variant === 'primary' ? theme.cyan + '55' :
    variant === 'danger' ? theme.red + '55' :
    theme.border;
  const fg =
    variant === 'primary' ? theme.cyan :
    variant === 'danger' ? theme.red :
    theme.text;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        s.btn,
        { height, paddingHorizontal: pad, backgroundColor: bg, borderColor: border },
        pressed && { opacity: 0.75 },
        isDisabled && { opacity: 0.4 },
        style as any,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} size="small" />
      ) : icon ? (
        <Feather name={icon} size={size === 'sm' ? 12 : 14} color={fg} />
      ) : null}
      <Text style={[s.label, { color: fg, fontSize: size === 'sm' ? 11 : 13 }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10,
    justifyContent: 'center',
  },
  label: { fontWeight: '700', letterSpacing: 0.3 },
});
