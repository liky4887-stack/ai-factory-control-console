import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { api } from '../services/api';
import { SectionHeader } from '../components/SectionHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { PillBadge } from '../components/PillBadge';
import type { ComplianceReview } from '../types';

export function OmegaSwitch() {
  const { tasks, activeProjectId, loadTasks } = useFactory();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [command, setCommand] = useState('');
  const [review, setReview] = useState<ComplianceReview | null>(null);
  const [omegaReason, setOmegaReason] = useState('');
  const [confirmFire, setConfirmFire] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks(activeProjectId ?? undefined);
    setRefreshing(false);
  }, [loadTasks, activeProjectId]);

  useEffect(() => {
    loadTasks(activeProjectId ?? undefined);
  }, [loadTasks, activeProjectId]);

  const runReview = async () => {
    if (!selectedTaskId || !command.trim()) {
      Alert.alert('Missing input', 'Select a task and enter a command.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await api.reviewCommand(selectedTaskId, command.trim());
      setReview(r);
    } catch (e: unknown) {
      Alert.alert('Review failed', e instanceof Error ? e.message : 'Unknown error');
    }
    setBusy(false);
  };

  const fireOmega = async () => {
    setConfirmFire(false);
    setBusy(true);
    try {
      const r = await api.fireOmega({
        taskId: selectedTaskId,
        agentId: 'ceo',
        command: command.trim(),
        omegaAcknowledged: true,
        omegaReason: omegaReason.trim() || 'No reason provided',
      });
      setResult(`Execution: ${r.executionLogId}\nLedger: ${r.ledgerEntryId}`);
      setReview(null);
      setCommand('');
      setOmegaReason('');
    } catch (e: unknown) {
      Alert.alert('Omega failed', e instanceof Error ? e.message : 'Unknown error');
    }
    setBusy(false);
  };

  const verdictColor: Record<string, string> = {
    clear: '#10B981',
    needs_clarification: '#F59E0B',
    conflicts_with_ledger: '#EF4444',
    high_risk: '#DC2626',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}>
      <Text style={styles.title}>Omega Switch</Text>
      <Text style={styles.subtitle}>Critical command execution with compliance review</Text>

      <SectionHeader title="Select Task" />
      {tasks.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No tasks available.</Text></View>
      ) : (
        <View style={styles.taskList}>
          {tasks.slice(0, 20).map((task) => (
            <Pressable key={task.id} onPress={() => setSelectedTaskId(task.id)} style={[styles.taskItem, selectedTaskId === task.id && styles.taskItemActive]}>
              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
              <PillBadge label={task.status} color={task.status === 'done' ? '#10B981' : '#9AA1AE'} />
            </Pressable>
          ))}
        </View>
      )}

      <SectionHeader title="Command" />
      <TextInput value={command} onChangeText={setCommand} placeholder="Enter shell command..." style={styles.commandInput} placeholderTextColor="#9AA1AE" multiline autoCapitalize="none" autoCorrect={false} />

      <Pressable onPress={runReview} disabled={busy || !selectedTaskId || !command.trim()} style={[styles.reviewBtn, (busy || !selectedTaskId || !command.trim()) && styles.btnDisabled]}>
        <Text style={styles.btnText}>{busy ? 'Working...' : 'Run Compliance Review'}</Text>
      </Pressable>

      {review ? (
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <PillBadge label={review.verdict.replace('_', ' ')} color={verdictColor[review.verdict] ?? '#9AA1AE'} />
            <Text style={styles.reviewTime}>{new Date(review.createdAt).toLocaleString()}</Text>
          </View>
          {review.concerns.length > 0 ? (
            <><Text style={styles.reviewLabel}>Concerns</Text>{review.concerns.map((c, i) => (<Text key={i} style={styles.reviewItem}>- {c}</Text>))}</>
          ) : null}
          {review.suggestedAlternatives.length > 0 ? (
            <><Text style={styles.reviewLabel}>Suggested Alternatives</Text>{review.suggestedAlternatives.map((a, i) => (<Text key={i} style={styles.reviewItem}>- {a}</Text>))}</>
          ) : null}
          {review.followUpQuestions.length > 0 ? (
            <><Text style={styles.reviewLabel}>Follow-up Questions</Text>{review.followUpQuestions.map((q, i) => (<Text key={i} style={styles.reviewItem}>- {q}</Text>))}</>
          ) : null}
          {review.verdict === 'clear' ? (
            <>
              <SectionHeader title="Omega Acknowledgment" />
              <TextInput value={omegaReason} onChangeText={setOmegaReason} placeholder="Why are you firing this omega action?" style={styles.reasonInput} placeholderTextColor="#9AA1AE" multiline />
              <Pressable onPress={() => setConfirmFire(true)} style={styles.fireBtn}><Text style={styles.fireBtnText}>FIRE OMEGA</Text></Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Execution Complete</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
      <ConfirmModal visible={confirmFire} title="Fire Omega Action?" message="This will execute the command on the Termux bridge. A ledger entry will be created. This action cannot be undone." confirmLabel="Fire" destructive onConfirm={fireOmega} onCancel={() => setConfirmFire(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0B0D12' },
  subtitle: { fontSize: 13, color: '#5C6472', marginTop: 2 },
  empty: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9AA1AE' },
  taskList: { gap: 8 },
  taskItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4' },
  taskItemActive: { borderColor: '#6366F1', backgroundColor: '#F5F3FF' },
  taskTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0B0D12', marginRight: 8 },
  commandInput: { minHeight: 80, borderRadius: 12, backgroundColor: '#1A1D21', borderWidth: 0, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#D1D5DB', fontFamily: 'monospace', marginBottom: 12 },
  reviewBtn: { height: 48, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  reviewCard: { padding: 20, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', marginTop: 16 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewTime: { fontSize: 12, color: '#9AA1AE' },
  reviewLabel: { fontSize: 12, fontWeight: '600', color: '#9AA1AE', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  reviewItem: { fontSize: 13, color: '#5C6472', lineHeight: 20, marginBottom: 2 },
  reasonInput: { minHeight: 60, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4', paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0B0D12', marginBottom: 12 },
  fireBtn: { height: 52, borderRadius: 14, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  fireBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  resultCard: { padding: 16, borderRadius: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', marginTop: 16 },
  resultLabel: { fontSize: 12, fontWeight: '600', color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultText: { fontSize: 13, color: '#0B0D12', fontFamily: 'monospace', marginTop: 6 },
});
