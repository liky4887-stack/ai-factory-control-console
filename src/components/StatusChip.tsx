import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColors, theme } from '../theme';

interface Props { label: string; status?: string; }

export function StatusChip({ label, status = label.toLowerCase() }: Props) {
  const color = statusColors[status] ?? theme.cyan;
  return (
    <View style={[styles.chip, { borderColor: `${color}55`, backgroundColor: `${color}16` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
});
