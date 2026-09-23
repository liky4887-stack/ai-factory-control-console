/**
 * components/MemoryHeatGrid.tsx
 * Renders three memory zones using REAL data passed in from the parent.
 * No fake randomness — cell intensity is derived deterministically from
 * the current metrics so the same reading always looks the same.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export interface MemoryHeatGridProps {
  /** 0-1 fraction of heap used (process.heapUsedBytes / process.heapTotalBytes) */
  heapUsedFraction: number;
  /** 0-1 fraction of process RSS against total system memory */
  rssFraction: number;
  /** 0-100 used memory percent (system.usedMemoryPercent) */
  systemUsedPercent: number;
}

interface Zone {
  label: string;
  fraction: number;   // 0..1
  color: string;
  cells: number;
}

function intensityAt(fraction: number, cellIndex: number, total: number): number {
  // Deterministic hash — same fraction + index → same intensity
  const seed = (fraction * 1000 + cellIndex * 37) % 1;
  const x = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
  return x - Math.floor(x);
}

function ZoneGrid({ zone }: { zone: Zone }) {
  const activeCells = Math.round(zone.fraction * zone.cells);
  return (
    <View style={s.section}>
      <View style={[s.sectionTag, { borderColor: `${zone.color}44`, backgroundColor: `${zone.color}14` }]}>
        <View style={[s.sectionDot, { backgroundColor: zone.color }]} />
        <Text style={[s.sectionLabel, { color: zone.color }]}>{zone.label}</Text>
        <Text style={[s.sectionPct, { color: zone.color }]}>
          {Math.round(zone.fraction * 100)}%
        </Text>
      </View>
      <View style={s.grid}>
        {Array.from({ length: zone.cells }).map((_, i) => {
          const active = i < activeCells;
          const intensity = active ? 0.55 + intensityAt(zone.fraction, i, zone.cells) * 0.45 : 0.08;
          const alpha = Math.floor(intensity * 255).toString(16).padStart(2, '0');
          return (
            <View
              key={i}
              style={[s.cell, { backgroundColor: `${zone.color}${alpha}` }]}
            />
          );
        })}
      </View>
    </View>
  );
}

export function MemoryHeatGrid({ heapUsedFraction, rssFraction, systemUsedPercent }: MemoryHeatGridProps) {
  const zones: Zone[] = [
    { label: 'Active Heap', fraction: Math.max(0, Math.min(1, heapUsedFraction)), color: theme.cyan, cells: 48 },
    { label: 'Process RSS', fraction: Math.max(0, Math.min(1, rssFraction)), color: theme.blue, cells: 32 },
    { label: 'System RAM', fraction: Math.max(0, Math.min(1, systemUsedPercent / 100)), color: theme.purple, cells: 24 },
  ];
  return (
    <View style={s.wrap} testID="memory-heat-grid">
      {zones.map((z) => <ZoneGrid key={z.label} zone={z} />)}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 14 },
  section: {},
  sectionTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionPct: { fontSize: 10, fontWeight: '800', fontFamily: 'monospace', marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  cell: { width: 10, height: 10, borderRadius: 2 },
});
