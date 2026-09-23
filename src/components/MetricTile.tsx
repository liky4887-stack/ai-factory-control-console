import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { theme } from '../theme';

interface Props { label: string; value: string | number; accent: string; detail?: string; }

export function MetricTile({ label, value, accent, detail }: Props) {
  return (
    <GlassCard style={styles.card} accent={accent}>
      <View style={[styles.icon, { backgroundColor: `${accent}22` }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, padding: 14 },
  icon: { width: 9, height: 9, borderRadius: 3, marginBottom: 12 },
  label: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  value: { fontSize: 28, lineHeight: 32, fontWeight: '800', marginTop: 5 },
  detail: { color: theme.textSecondary, fontSize: 11, marginTop: 4 },
});
