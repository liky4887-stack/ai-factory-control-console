// Figma reference: soft pastel wash behind the hero (screenshots 1–4).
// Uses three overlapping LinearGradients at different angles to
// approximate the mesh blob in the reference — no blur library required.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lovable } from '../theme';

interface Props { intensity?: 'full' | 'soft'; }

export function GradientBackground({ intensity = 'full' }: Props) {
  const strong = intensity === 'full';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: lovable.bg }]} />

      {/* Green → yellow wash from the top-left */}
      <LinearGradient
        colors={
          strong
            ? ['rgba(228,239,216,0.95)', 'rgba(243,235,200,0.72)', 'rgba(245,243,238,0)']
            : ['rgba(228,239,216,0.55)', 'rgba(243,235,200,0.35)', 'rgba(245,243,238,0)']
        }
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Peach → rose wash from the top-right */}
      <LinearGradient
        colors={
          strong
            ? ['rgba(244,212,176,0.85)', 'rgba(239,199,204,0.62)', 'rgba(245,243,238,0)']
            : ['rgba(244,212,176,0.45)', 'rgba(239,199,204,0.32)', 'rgba(245,243,238,0)']
        }
        locations={[0, 0.5, 1]}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.15, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Cream curtain — fades everything to solid bg at the bottom */}
      <LinearGradient
        colors={['rgba(245,243,238,0)', 'rgba(245,243,238,0.6)', 'rgba(245,243,238,0.98)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
