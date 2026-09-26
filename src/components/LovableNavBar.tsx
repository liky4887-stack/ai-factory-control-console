import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { lovable } from '../theme';

export type NavKey = 'home' | 'projects' | 'skills';

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
}

const ITEMS: Array<{ key: NavKey; icon: string; label: string }> = [
  { key: 'home',     icon: '\u2302', label: 'Home' },
  { key: 'projects', icon: '\u229E', label: 'Projects' },
  { key: 'skills',   icon: '\u2726', label: 'Skills' },
];

export function LovableNavBar({ active, onChange }: Props) {
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.pill}>
        {ITEMS.map((item) => {
          const isActive = active === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                s.item,
                isActive && s.itemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[s.icon, isActive && s.iconActive]}>{item.icon}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: lovable.space.lg },
  pill: {
    flexDirection: 'row',
    backgroundColor: lovable.navBg,
    borderWidth: 1,
    borderColor: lovable.navBorder,
    borderRadius: lovable.radius.pill,
    paddingHorizontal: lovable.space.sm,
    paddingVertical: lovable.space.sm,
    gap: lovable.space.xs,
    minWidth: 200,
    justifyContent: 'space-between',
    ...lovable.shadow.floating,
  },
  item: { width: 60, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: lovable.radius.pill },
  itemActive: { backgroundColor: lovable.navActiveBg },
  icon: { color: lovable.textMuted, fontSize: 22, lineHeight: 26 },
  iconActive: { color: lovable.navActiveText },
});
