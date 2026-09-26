import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lovable } from '../theme';

interface Props { intensity?: 'full' | 'soft'; }

export function GradientBackground({ intensity = 'full' }: Props) {
  const colors = intensity === 'soft'
    ? ['#000000', '#080812', '#121018', '#000000']
    : (lovable.gradient as unknown as string[]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        locations={intensity === 'soft' ? [0, 0.3, 0.7, 1] : [0, 0.10, 0.22, 0.36, 0.50, 0.66, 0.84, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
