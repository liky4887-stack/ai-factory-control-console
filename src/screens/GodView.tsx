import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { SectionHeader } from '../components/SectionHeader';
import { StatusIndicator } from '../components/StatusIndicator';
import { PillBadge } from '../components/PillBadge';
import type { Project } from '../types';

const STATUS_MAP: Record<string, string> = {
  active: 'connected',
  idle: 'idle',
  error: 'offline',
  archived: 'idle',
};

export function GodView() {
  const { projects, activeProjectId, setActiveProject, refreshAll } = useFactory();
  const [refreshing, setRefreshing] = useState(false);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      <Text style={styles.title}>God View</Text>
      <Text style={styles.subtitle}>Select and manage active factory projects</Text>

      {activeProject ? (
        <View style={styles.activeCard}>
          <View style={styles.activeHeader}>
            <Text style={styles.activeName}>{activeProject.name}</Text>
            <StatusIndicator status={activeProject.archived ? 'idle' : 'connected'} label={activeProject.archived ? 'Archived' : 'Active'} />
          </View>
          <Text style={styles.activeDesc}>{activeProject.description}</Text>
          <View style={styles.badgeRow}>
            <PillBadge label={`${activeProject.metrics.goalCount} goals`} color="#6366F1" />
            <PillBadge label={`${activeProject.metrics.openTaskCount} open`} color="#F59E0B" />
            <PillBadge label={`${activeProject.metrics.activeAgentCount} agents`} color="#10B981" />
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No project selected.</Text>
        </View>
      )}

      <SectionHeader title={`All Projects (${projects.length})`} />
      {projects.map((p: Project) => {
        const isActive = p.id === activeProjectId;
        return (
          <Pressable
            key={p.id}
            onPress={() => setActiveProject(p.id)}
            style={[styles.projectCard, isActive && styles.projectCardActive]}
          >
            <View style={styles.projectHeader}>
              <Text style={styles.projectName}>{p.name}</Text>
              <StatusIndicator status={STATUS_MAP[p.archived ? 'archived' : 'active'] ?? 'idle'} />
            </View>
            <Text style={styles.projectDesc}>{p.description}</Text>
            <View style={styles.projectMeta}>
              <Text style={styles.metaText}>{p.metrics.goalCount} goals</Text>
              <Text style={styles.metaText}>{p.metrics.openTaskCount} tasks</Text>
              <Text style={styles.metaText}>{p.metrics.activeAgentCount} agents</Text>
            </View>
          </Pressable>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0B0D12' },
  subtitle: { fontSize: 13, color: '#5C6472', marginTop: 2, marginBottom: 20 },
  activeCard: { padding: 20, borderRadius: 16, backgroundColor: '#EEF0FF', borderWidth: 1, borderColor: '#C7D2FE', marginBottom: 20 },
  activeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activeName: { fontSize: 18, fontWeight: '700', color: '#0B0D12' },
  activeDesc: { fontSize: 14, color: '#5C6472', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  empty: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9AA1AE' },
  projectCard: { padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginBottom: 10 },
  projectCardActive: { borderColor: '#6366F1', backgroundColor: '#F5F3FF' },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  projectName: { fontSize: 15, fontWeight: '600', color: '#0B0D12' },
  projectDesc: { fontSize: 13, color: '#5C6472', marginBottom: 8 },
  projectMeta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 12, color: '#9AA1AE' },
});
