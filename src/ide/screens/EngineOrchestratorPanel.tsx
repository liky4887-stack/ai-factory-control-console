// EngineOrchestratorPanel — the engine auth + health surface, mounted
// inside the coding page (CodingBrainScreen). Lifted out of SystemPower
// so infrastructure (host metrics, toggles) and orchestration (engines)
// live in the pages where they belong.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthDebugPanel } from '../../screens/AuthDebugPanel';
import { lovable } from '../../theme';

export function EngineOrchestratorPanel() {
  return (
    <View style={s.card}>
      <Text style={s.title}>Engines</Text>
      <Text style={s.subtitle}>
        Seven engines. Cookie + bearer token only. No API keys.
      </Text>
      <AuthDebugPanel />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    borderRadius: lovable.radius.lg,
    padding: lovable.space.md,
    marginBottom: lovable.space.md,
  },
  title: {
    color: lovable.text,
    fontSize: lovable.font.lg,
    fontWeight: lovable.weight.bold,
    marginBottom: 4,
  },
  subtitle: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    marginBottom: 12,
  },
});
