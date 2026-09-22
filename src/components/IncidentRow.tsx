import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PillBadge } from './PillBadge';

interface Props { kind: string; title: string; meta?: string; timestamp: number; }

const KIND_COLORS: Record<string, string> = {
  decision: '#6366F1',
  bug: '#EF4444',
  pivot: '#F59E0B',
  omega_action: '#DC2626',
  agent_action: '#10B981',
  compliance_review: '#8B5CF6',
  deploy: '#3B82F6',
  schema_change: '#8B5CF6',
};

export function IncidentRow({ kind, title, meta, timestamp }: Props) {
  const color = KIND_COLORS[kind] ?? '#9AA1AE';
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <PillBadge label={kind.replace('_', ' ')} color={color} />
        <Text style={styles.time}>{new Date(timestamp).toLocaleString()}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  time: { fontSize: 11, color: '#9AA1AE' },
  title: { fontSize: 14, fontWeight: '600', color: '#0B0D12' },
  meta: { fontSize: 12, color: '#5C6472', marginTop: 2 },
});
