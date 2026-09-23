import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { GlassCard } from './GlassCard';
import { theme } from '../theme';

const RULES = [
  'Never execute without explicit confirmation',
  'All mutations must be logged to the Truth Ledger',
  'Omega mode requires passphrase + multi-confirm',
  'Agent autonomy is bounded by current mode',
  'No irreversible action without fallback strategy',
  'Every decision must be traceable to a source',
];

export function UniversalAnchor() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.anchor, pressed && s.pressed]}
        testID="universal-anchor"
      >
        <View style={s.halo} />
        <Text style={s.icon}>⚓</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <GlassCard style={s.card} accent={theme.gold}>
              <View style={s.head}>
                <Text style={s.title}>Universal Logic Constant</Text>
                <Pressable onPress={() => setOpen(false)}><Text style={s.close}>✕</Text></Pressable>
              </View>
              <Text style={s.subtitle}>Non-Negotiable Rules</Text>
              <ScrollView style={s.ruleList}>
                {RULES.map((rule, i) => (
                  <View key={i} style={s.ruleRow}>
                    <Text style={s.ruleNum}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={s.ruleText}>{rule}</Text>
                  </View>
                ))}
              </ScrollView>
            </GlassCard>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  anchor: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.gold}18`, borderWidth: 1, borderColor: `${theme.gold}44`, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  halo: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: `${theme.gold}30` },
  icon: { fontSize: 20, color: theme.gold },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 460 },
  card: { maxHeight: 520 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: theme.gold, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  close: { color: theme.textMuted, fontSize: 16, fontWeight: '600' },
  subtitle: { color: theme.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  ruleList: { maxHeight: 380 },
  ruleRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  ruleNum: { color: theme.gold, fontSize: 13, fontWeight: '800', fontFamily: 'monospace' },
  ruleText: { color: theme.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },
});
