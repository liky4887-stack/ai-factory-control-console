import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lovable } from '../theme';

interface Props {
  intensity?: 'full' | 'soft';
}

/**
 * Full-screen background gradient used only on the Home screen.
 * Colors pulled from lovable.gradient (top → bottom).
 */
export function GradientBackground({ intensity = 'full' }: Props) {
  const colors = intensity === 'soft'
    ? ['#000000', '#0a0a12', '#1a0a1a', '#000000']
    : lovable.gradient;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={colors as unknown as string[]}
        locations={
          intensity === 'soft'
            ? [0, 0.3, 0.7, 1]
            : [0, 0.12, 0.24, 0.38, 0.52, 0.68, 0.84, 1]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
