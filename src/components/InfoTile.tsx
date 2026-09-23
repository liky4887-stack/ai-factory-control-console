import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { theme } from '../theme';

interface Props { label: string; value: string; color?: string; icon?: string; }

export function InfoTile({ label, value, color = theme.cyan, icon }: Props) {
  return (
    <GlassCard style={s.card} accent={color}>
      {icon ? <Text style={[s.icon, { color }]}>{icon}</Text> : null}
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, { color }]}>{value}</Text>
    </GlassCard>
  );
}

const s = StyleSheet.create({
  card: { flex: 1, minWidth: 100, padding: 12 },
  icon: { fontSize: 16, marginBottom: 6 },
  label: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  value: { fontSize: 20, fontWeight: '800', marginTop: 4 },
});
