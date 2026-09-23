import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Tab { key: string; label: string; }
interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function SubNav({ tabs, active, onChange }: Props) {
  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [s.tab, active === tab.key && s.tabActive, pressed && s.pressed]}
          >
            <Text style={[s.label, active === tab.key && s.labelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingVertical: 4 },
  scroll: { gap: 6, paddingHorizontal: 2 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  tabActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  pressed: { opacity: 0.7 },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '600' },
  labelActive: { color: theme.cyan },
});
