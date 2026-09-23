import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

export type MobileTab = 'command' | 'creator' | 'godmode' | 'system' | 'mystic';
interface Props { active: MobileTab; onChange: (tab: MobileTab) => void; }
const tabs: Array<{ key: MobileTab; label: string; icon: string }> = [
  { key: 'command', label: 'Command', icon: '⌂' },
  { key: 'creator', label: 'Creator', icon: '✦' },
  { key: 'godmode', label: 'God Mode', icon: '◈' },
  { key: 'system', label: 'System', icon: '⚡' },
  { key: 'mystic', label: 'Mystic', icon: '◉' },
];

export function MobileTabBar({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={({ pressed }) => [styles.item, active === tab.key && styles.active, pressed && styles.pressed]}>
          <Text style={[styles.icon, active === tab.key && styles.activeText]}>{tab.icon}</Text>
          <Text style={[styles.label, active === tab.key && styles.activeText]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: 'rgba(6, 8, 13, 0.98)', borderTopWidth: 1, borderTopColor: theme.border, paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4 },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 5, borderRadius: 10 },
  active: { backgroundColor: `${theme.blue}20` },
  pressed: { opacity: 0.65 },
  icon: { color: theme.textMuted, fontSize: 18, lineHeight: 20 },
  label: { color: theme.textMuted, fontSize: 10, fontWeight: '700' },
  activeText: { color: theme.cyan },
});
