import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface Props { children: React.ReactNode; style?: ViewStyle; accent?: string; }

export function GlassCard({ children, style, accent }: Props) {
  return (
    <View style={[styles.card, accent ? { borderColor: `${accent}55` } : null, style]}>
      <View style={[styles.highlight, accent ? { backgroundColor: accent } : null]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusLg, padding: 16, overflow: 'hidden' },
  highlight: { position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
});
