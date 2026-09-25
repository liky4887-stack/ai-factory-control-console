import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { lovable } from '../theme';

export type NavKey = 'home' | 'projects' | 'skills';

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
}

const ITEMS: Array<{ key: NavKey; icon: string; label: string }> = [
  { key: 'home',     icon: '⌂', label: 'Home' },
  { key: 'projects', icon: '⊞', label: 'Projects' },
  { key: 'skills',   icon: '✦', label: 'Skills' },
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
              style={({ pressed }) => [
                s.item,
                isActive && s.itemActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[s.icon, isActive && s.iconActive]}>
                {item.icon}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    paddingBottom: 24,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: lovable.navBg,
    borderWidth: 1,
    borderColor: lovable.navBorder,
    borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 6,
    gap: 4,
    minWidth: 200,
    justifyContent: 'space-between',
  },
  item: {
    width: 60, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 999,
  },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  icon: { color: lovable.textMuted, fontSize: 22, lineHeight: 26 },
  iconActive: { color: lovable.text },
});
