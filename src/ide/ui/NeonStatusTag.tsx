// Small neon status pill. Used in the orchestrator state strip.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import type { ActivityStatus } from '../core/types';

interface Props {
  label: string;
  status?: ActivityStatus;
  color?: string;
  compact?: boolean;
}

function colorFor(status?: ActivityStatus): string {
  switch (status) {
    case 'success': return theme.green;
    case 'error': return theme.red;
    case 'warn': return theme.amber;
    case 'start': return theme.cyan;
    case 'progress': return theme.cyan;
    case 'info':
    default: return theme.textMuted;
  }
}

export function NeonStatusTag({ label, status, color, compact }: Props) {
  const c = color || colorFor(status);
  return (
    <View style={[s.pill, compact && s.pillCompact, { borderColor: c + '66', backgroundColor: c + '14' }]}>
      <View style={[s.dot, { backgroundColor: c }]} />
      <Text style={[s.text, { color: c }, compact && s.textCompact]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  pillCompact: { paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  textCompact: { fontSize: 9 },
});
