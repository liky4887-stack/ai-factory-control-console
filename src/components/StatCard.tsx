import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props { label: string; value: string | number; accent?: string; }

export function StatCard({ label, value, accent = '#6366F1' }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={styles.value}>{String(value)}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 130, padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4' },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 10 },
  value: { fontSize: 24, fontWeight: '700', color: '#0B0D12' },
  label: { fontSize: 12, color: '#5C6472', marginTop: 2 },
});
