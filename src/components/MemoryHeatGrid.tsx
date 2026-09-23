import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

const SECTIONS = [
  { label: 'Active Context', cells: 48, color: theme.cyan },
  { label: 'Cold Storage', cells: 32, color: theme.blue },
  { label: 'Archive', cells: 24, color: theme.purple },
];

function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function MemoryHeatGrid() {
  let seed = 1;
  return (
    <View style={s.wrap} testID="memory-heat-grid">
      {SECTIONS.map((sec) => (
        <View key={sec.label} style={s.section}>
          <View style={[s.sectionTag, { borderColor: `${sec.color}44`, backgroundColor: `${sec.color}14` }]}>
            <View style={[s.sectionDot, { backgroundColor: sec.color }]} />
            <Text style={[s.sectionLabel, { color: sec.color }]}>{sec.label}</Text>
          </View>
          <View style={s.grid}>
            {Array.from({ length: sec.cells }).map((_, i) => {
              const intensity = rand(seed++);
              return (
                <View
                  key={i}
                  style={[s.cell, { backgroundColor: `${sec.color}${Math.floor(intensity * 200 + 20).toString(16).padStart(2, '0')}` }]}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 14 },
  section: {},
  sectionTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  cell: { width: 10, height: 10, borderRadius: 2 },
});
