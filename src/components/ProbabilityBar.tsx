import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props { label: string; value: number; color?: string; max?: number; }

export function ProbabilityBar({ label, value, color = theme.cyan, max = 100 }: Props) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.val, { color }]}>{value}%</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: color, shadowColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  val: { fontSize: 12, fontWeight: '800', fontFamily: 'monospace' },
  track: { height: 8, borderRadius: 4, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
});
