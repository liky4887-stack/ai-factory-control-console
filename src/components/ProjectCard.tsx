import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard } from './GlassCard';
import { StatusChip } from './StatusChip';
import { theme } from '../theme';

export interface ProjectInfo {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  updated: string;
  domain?: string;
}

interface Props {
  project: ProjectInfo;
  onPress?: () => void;
}

export function ProjectCard({ project, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.press, pressed && s.pressed]} testID={`project-card-${project.id}`}>
      <GlassCard style={s.card} accent={project.status === 'active' ? theme.cyan : project.status === 'archived' ? theme.purple : theme.textMuted}>
        <View style={s.head}>
          <Text style={s.name} numberOfLines={1}>{project.name}</Text>
          <StatusChip label={project.status} status={project.status} />
        </View>
        {project.domain ? <Text style={s.domain}>{project.domain}</Text> : null}
        <Text style={s.updated}>{project.updated}</Text>
      </GlassCard>
    </Pressable>
  );
}

const s = StyleSheet.create({
  press: { marginBottom: 8 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  card: { padding: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: theme.text, fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  domain: { color: theme.textMuted, fontSize: 11, marginBottom: 2 },
  updated: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' },
});
