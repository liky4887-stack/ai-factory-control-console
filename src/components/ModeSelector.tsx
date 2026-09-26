// Lovable-style mode dropdown: Build / Chat / Plan.
// Replaces the "Online" pill in the input bottom row.
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { lovable } from '../theme';

export type AppMode = 'Build' | 'Chat' | 'Plan';

interface ModeDef {
  key: AppMode;
  label: string;
  description: string;
  badge?: string;
}

const MODES: ModeDef[] = [
  { key: 'Build', label: 'Build', description: 'Make changes directly' },
  { key: 'Chat',  label: 'Chat',  description: 'Ask anything, explore ideas', badge: 'Free' },
  { key: 'Plan',  label: 'Plan',  description: 'Detailed spec for complex builds' },
];

interface Props {
  mode: AppMode;
  onChange: (m: AppMode) => void;
}

export function ModeSelector({ mode, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = MODES.find((m) => m.key === mode) || MODES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [s.pill, pressed && { opacity: 0.7 }]}
        accessibilityLabel="Change mode"
      >
        <Text style={s.pillText}>{current.label}</Text>
        <Feather name="chevron-down" size={12} color={lovable.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <View style={s.menu}>
            {MODES.map((m) => {
              const active = mode === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => { onChange(m.key); setOpen(false); }}
                  style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}
                  accessibilityLabel={m.label}
                >
                  <View style={s.itemBody}>
                    <View style={s.itemHead}>
                      <Text style={s.itemLabel}>{m.label}</Text>
                      {m.badge ? (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{m.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={s.itemDesc}>{m.description}</Text>
                  </View>
                  {active ? (
                    <Feather name="check" size={16} color={lovable.text} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: lovable.pillBg,
    borderWidth: 1,
    borderColor: lovable.pillBorder,
  },
  pillText: {
    color: lovable.text,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.25)',
    justifyContent: 'flex-end',
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  menu: {
    backgroundColor: lovable.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  itemBody: { flex: 1 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLabel: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  itemDesc: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 2,
  },
  badge: {
    backgroundColor: lovable.text,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: lovable.weight.bold,
  },
});
