import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props { title: string; action?: { label: string; onPress: () => void }; }

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress} style={styles.actionBtn}>
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '600', color: '#0B0D12' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#EEF0FF' },
  actionText: { fontSize: 13, fontWeight: '600', color: '#6366F1' },
});
