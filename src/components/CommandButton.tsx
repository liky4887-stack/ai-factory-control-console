import React from 'react';
import { Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface Props { label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; style?: ViewStyle; }

export function CommandButton({ label, onPress, variant = 'secondary', disabled, style }: Props) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}>
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel, variant === 'danger' && styles.dangerLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 40, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  primary: { backgroundColor: '#2878F4', borderColor: '#62B7FF', shadowColor: '#2878F4', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  secondary: { backgroundColor: theme.glassSoft, borderColor: theme.border },
  danger: { backgroundColor: '#51202B', borderColor: '#FF6B7A88' },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  primaryLabel: { color: '#FFFFFF' },
  dangerLabel: { color: '#FFD8DC' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.42 },
});
