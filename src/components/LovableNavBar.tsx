// Figma reference: bottom floating pill nav in light theme.
// White pill, subtle shadow, Feather icons.
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { lovable } from '../theme';

export type NavKey = 'home' | 'projects' | 'skills';

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
}

const ITEMS: Array<{ key: NavKey; icon: any; label: string }> = [
  { key: 'home',     icon: 'home',      label: 'Home' },
  { key: 'projects', icon: 'grid',      label: 'Projects' },
  { key: 'skills',   icon: 'star',      label: 'Skills' },
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
              <Feather
                name={item.icon}
                size={20}
                color={isActive ? lovable.navActiveText : lovable.textMuted}
              />
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
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: lovable.space.lg,
  },
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
  item: {
    width: 60,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: lovable.radius.pill,
  },
  itemActive: {
    backgroundColor: lovable.navActiveBg,
  },
});
