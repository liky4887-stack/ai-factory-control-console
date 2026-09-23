import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useFactory } from '../store/FactoryContext';
import { api } from '../services/api';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { theme } from '../theme';

type Mode = 'SAFE' | 'CONTROLLED' | 'EXPERIMENTAL' | 'OMEGA';
const MODES: Mode[] = ['SAFE', 'CONTROLLED', 'EXPERIMENTAL', 'OMEGA'];
const MODE_COLORS: Record<Mode, string> = { SAFE: theme.green, CONTROLLED: theme.amber, EXPERIMENTAL: theme.purple, OMEGA: theme.red };
const MODE_DESC: Record<Mode, string> = {
  SAFE: 'Read-only mode. No mutations allowed.',
  CONTROLLED: 'Supervised operations with guardrails.',
  EXPERIMENTAL: 'Extended capabilities. Higher risk tolerance.',
  OMEGA: 'Full override. All guardrails bypassed.',
};

export function OmegaSwitch() {
  const { tasks, loadTasks, activeProjectId } = useFactory();
  const [mode, setMode] = useState<Mode>('SAFE');
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const [confirmStep, setConfirmStep] = useState(0);
  const [multiConfirm, setMultiConfirm] = useState(true);
  const [simulateOnly, setSimulateOnly] = useState(false);
  const [fallback, setFallback] = useState('Rollback');
  const [passphrase, setPassphrase] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handlePrepare = useCallback(() => {
    if (!pendingMode) return;
    setConfirmStep(1);
  }, [pendingMode]);

  const handleArm = useCallback(async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await api.fireOmega({
        taskId: selectedTaskId || 'standby',
        agentId: 'ceo',
        command: command.trim() || 'noop',
        omegaAcknowledged: true,
        omegaReason: passphrase.trim() || 'No reason provided',
      });
      setResult(`Execution: ${r.executionLogId}\nLedger: ${r.ledgerEntryId}`);
      setMode(pendingMode ?? 'SAFE');
      setPendingMode(null);
      setConfirmStep(0);
      setPassphrase('');
    } catch {
      setResult('Omega execution failed.');
    }
    setBusy(false);
  }, [pendingMode, selectedTaskId, command, passphrase]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.h1}>Omega Switch</Text>
      <Text style={s.sub}>Global control mode and safety envelope</Text>

      <GlassCard style={s.modeCard} accent={MODE_COLORS[mode]}>
        <Text style={s.cardTitle}>Current Mode</Text>
        <View style={[s.modeHalo, { borderColor: `${MODE_COLORS[mode]}66`, shadowColor: MODE_COLORS[mode], shadowOpacity: 0.3, shadowRadius: 20 }]}>
          <Text style={[s.modeName, { color: MODE_COLORS[mode] }]}>{mode}</Text>
        </View>
        <Text style={s.modeDesc}>{MODE_DESC[mode]}</Text>
      </GlassCard>

      <Text style={s.sectionLabel}>Select Mode</Text>
      <View style={s.modeRow}>
        {MODES.map((m) => (
          <Pressable key={m} onPress={() => { setPendingMode(m); setConfirmStep(0); }} style={({ pressed }) => [s.modePill, pendingMode === m && s.modePillActive, pressed && s.pillPressed]}>
            <Text style={[s.modePillText, pendingMode === m && { color: MODE_COLORS[m] }]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <GlassCard style={s.card}>
        <Text style={s.cardTitle}>Safety Controls</Text>
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Require Multi-Confirm</Text>
          <Pressable onPress={() => setMultiConfirm(!multiConfirm)} style={[s.toggle, multiConfirm ? s.toggleOn : s.toggleOff]}>
            <View style={[s.toggleDot, multiConfirm ? s.dotOn : s.dotOff]} />
          </Pressable>
        </View>
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Simulate Only</Text>
          <Pressable onPress={() => setSimulateOnly(!simulateOnly)} style={[s.toggle, simulateOnly ? s.toggleOn : s.toggleOff]}>
            <View style={[s.toggleDot, simulateOnly ? s.dotOn : s.dotOff]} />
          </Pressable>
        </View>
        <Text style={s.inputLabel}>Fallback Strategy</Text>
        <View style={s.dropdownRow}>
          {['Rollback', 'Freeze', 'Read-Only', 'Alert-Only'].map((f) => (
            <Pressable key={f} onPress={() => setFallback(f)} style={({ pressed }) => [s.dropPill, fallback === f && s.dropPillActive, pressed && s.pillPressed]}>
              <Text style={[s.dropPillText, fallback === f && s.dropPillTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <View style={s.actionRow}>
          <CommandButton label="Prepare Mode Change" variant="primary" onPress={handlePrepare} disabled={!pendingMode} />
          <CommandButton label="Cancel" variant="secondary" onPress={() => { setPendingMode(null); setConfirmStep(0); }} />
        </View>
      </GlassCard>

      {confirmStep > 0 && pendingMode ? (
        <GlassCard style={s.card} accent={MODE_COLORS[pendingMode]}>
          <Text style={s.cardTitle}>Confirmation Flow</Text>
          {confirmStep === 1 && (
            <View>
              <Text style={s.stepText}>Step 1: Change from {mode} to {pendingMode}</Text>
              <CommandButton label="Next: Guardrails" variant="primary" onPress={() => setConfirmStep(2)} />
            </View>
          )}
          {confirmStep === 2 && (
            <View>
              <Text style={s.stepText}>Step 2: Guardrails checked. Fallback: {fallback}. Multi-confirm: {multiConfirm ? 'ON' : 'OFF'}. Simulate: {simulateOnly ? 'ON' : 'OFF'}.</Text>
              <CommandButton label="Next: Final Confirm" variant="primary" onPress={() => setConfirmStep(3)} />
            </View>
          )}
          {confirmStep === 3 && (
            <View>
              <Text style={s.stepText}>Step 3: Final confirmation for {pendingMode} mode.</Text>
              {pendingMode === 'OMEGA' && (
                <TextInput value={passphrase} onChangeText={setPassphrase} placeholder="Enter passphrase..." placeholderTextColor={theme.textMuted} secureTextEntry style={s.passInput} />
              )}
              <CommandButton label={busy ? 'Working...' : 'Arm Omega Switch'} variant="danger" onPress={handleArm} disabled={busy} />
            </View>
          )}
        </GlassCard>
      ) : null}

      <GlassCard style={s.card}>
        <Text style={s.cardTitle}>Command Input</Text>
        <TextInput value={command} onChangeText={setCommand} placeholder="Enter command..." placeholderTextColor={theme.textMuted} style={s.cmdInput} autoCapitalize="none" autoCorrect={false} />
        <Text style={s.inputLabel}>Select Task</Text>
        {tasks.length === 0 ? (
          <Text style={s.empty}>No tasks available.</Text>
        ) : (
          tasks.slice(0, 5).map((t) => (
            <Pressable key={t.id} onPress={() => setSelectedTaskId(t.id)} style={({ pressed }) => [s.taskItem, selectedTaskId === t.id && s.taskItemActive, pressed && s.pillPressed]}>
              <Text style={s.taskTitle} numberOfLines={1}>{t.title}</Text>
            </Pressable>
          ))
        )}
      </GlassCard>

      {result && (
        <GlassCard style={s.card} accent={theme.green}>
          <Text style={s.cardTitle}>Result</Text>
          <Text style={s.resultText}>{result}</Text>
        </GlassCard>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800' },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 18 },
  card: { marginBottom: 12 },
  modeCard: { marginBottom: 14, alignItems: 'center' },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  modeHalo: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  modeName: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  modeDesc: { color: theme.textSecondary, fontSize: 12, marginTop: 10, textAlign: 'center' },
  sectionLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  modePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  modePillActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  pillPressed: { opacity: 0.7 },
  modePillText: { color: theme.textSecondary, fontSize: 11, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { color: theme.textSecondary, fontSize: 13 },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: `${theme.green}40` },
  toggleOff: { backgroundColor: theme.glassSoft },
  toggleDot: { width: 22, height: 22, borderRadius: 11 },
  dotOn: { backgroundColor: theme.green, alignSelf: 'flex-end' },
  dotOff: { backgroundColor: theme.textMuted },
  inputLabel: { color: theme.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 6 },
  dropdownRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dropPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  dropPillActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  dropPillText: { color: theme.textSecondary, fontSize: 11 },
  dropPillTextActive: { color: theme.cyan },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stepText: { color: theme.textSecondary, fontSize: 13, marginBottom: 10, lineHeight: 19 },
  passInput: { height: 42, borderRadius: 10, backgroundColor: '#0A0D12', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, color: theme.text, fontSize: 13, marginBottom: 10 },
  cmdInput: { minHeight: 60, borderRadius: 10, backgroundColor: '#0A0D12', borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 10, color: theme.text, fontSize: 13, fontFamily: 'monospace' },
  taskItem: { padding: 10, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, marginBottom: 6 },
  taskItemActive: { borderColor: theme.borderStrong, backgroundColor: `${theme.blue}20` },
  taskTitle: { color: theme.textSecondary, fontSize: 12 },
  empty: { color: theme.textMuted, fontSize: 13, paddingVertical: 8 },
  resultText: { color: theme.green, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
});
