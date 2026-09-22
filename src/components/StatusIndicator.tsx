import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS: Record<string, string> = {
  idle: '#9AA1AE',
  busy: '#F59E0B',
  paused: '#6366F1',
  offline: '#EF4444',
  connected: '#10B981',
  disconnected: '#EF4444',
};

interface Props { status: string; label?: string; }

export function StatusIndicator({ status, label }: Props) {
  const color = COLORS[status] ?? '#9AA1AE';
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{label ?? status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, color: '#5C6472', textTransform: 'capitalize' },
});
