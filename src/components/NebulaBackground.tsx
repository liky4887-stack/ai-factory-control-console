import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function NebulaBackground() {
  return (
    <View style={s.container} pointerEvents="none">
      <View style={[s.orb, s.orb1]} />
      <View style={[s.orb, s.orb2]} />
      <View style={[s.orb, s.orb3]} />
      {Array.from({ length: 30 }).map((_, i) => (
        <View
          key={i}
          style={[s.particle, { left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, opacity: 0.15 + ((i * 7) % 10) / 20 }]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 300, height: 300, backgroundColor: `${theme.blue}12`, top: -60, right: -80 },
  orb2: { width: 240, height: 240, backgroundColor: `${theme.purple}10`, bottom: -40, left: -60 },
  orb3: { width: 200, height: 200, backgroundColor: `${theme.cyan}0A`, top: '40%', left: '30%' },
  particle: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: theme.cyan },
});
