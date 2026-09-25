import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { SKILLS, type Skill } from '../skills';
import { lovable } from '../theme';

interface Props {
  projectId: string | null;
  projectTitle: string | null;
  onDone: () => void;
  onClose: () => void;
}

interface AppliedResult {
  skillId: string;
  ok: boolean;
  summary?: string;
  error?: string;
  at: number;
}

export function SkillsScreen({ projectId, projectTitle, onDone, onClose }: Props) {
  const [busySkill, setBusySkill] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(async (skill: Skill) => {
    if (!projectId) {
      setError('Open a project first, then apply a skill.');
      return;
    }
    if (busySkill) return;
    setBusySkill(skill.id);
    setError(null);
    try {
      const result = await api.buildProject(projectId, skill.prompt);
      setApplied((prev) => [
        { skillId: skill.id, ok: true, summary: result.summary, at: Date.now() },
        ...prev,
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setApplied((prev) => [
        { skillId: skill.id, ok: false, error: msg, at: Date.now() },
        ...prev,
      ]);
    } finally {
      setBusySkill(null);
    }
  }, [projectId, busySkill]);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn}>
          <Text style={s.headerIcon}>✕</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Skills</Text>
        </View>
        <Pressable onPress={onDone} style={s.headerBtn} disabled={!projectId}>
          <Text style={[s.headerIcon, !projectId && { opacity: 0.4 }]}>↻</Text>
        </Pressable>
      </View>

      <View style={s.subbar}>
        <Text style={s.subbarLabel}>TARGET PROJECT</Text>
        <Text style={s.subbarValue} numberOfLines={1}>
          {projectTitle || 'No project open'}
        </Text>
      </View>

      {error ? <Text style={s.err}>● {error}</Text> : null}

      <ScrollView contentContainerStyle={s.list}>
        {SKILLS.map((skill) => {
          const isBusy = busySkill === skill.id;
          const disabled = !projectId || !!busySkill;
          return (
            <Pressable
              key={skill.id}
              onPress={() => void apply(skill)}
              disabled={disabled}
              style={({ pressed }) => [
                s.card,
                disabled && { opacity: 0.5 },
                pressed && !disabled && { opacity: 0.75 },
              ]}
            >
              <View style={s.iconBox}>
                <Text style={s.iconGlyph}>{skill.icon}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.cardTitle}>{skill.label}</Text>
                <Text style={s.cardDesc} numberOfLines={2}>{skill.description}</Text>
              </View>
              <View style={s.cardRight}>
                {isBusy ? (
                  <ActivityIndicator color={lovable.accent} size="small" />
                ) : (
                  <Text style={s.applyIcon}>›</Text>
                )}
              </View>
            </Pressable>
          );
        })}

        {applied.length > 0 ? (
          <>
            <Text style={s.appliedLabel}>APPLIED THIS SESSION</Text>
            {applied.map((a, i) => {
              const skill = SKILLS.find((x) => x.id === a.skillId);
              return (
                <View key={a.at + '_' + i} style={[s.appliedRow, a.ok ? s.appliedOk : s.appliedBad]}>
                  <Text style={[s.appliedText, a.ok ? { color: lovable.text } : { color: '#ff8888' }]}>
                    {a.ok ? '✓' : '✗'} {skill?.label || a.skillId}
                  </Text>
                  <Text style={s.appliedMeta} numberOfLines={2}>
                    {a.ok ? a.summary : a.error}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: lovable.cardBorder,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerIcon: { color: lovable.text, fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: lovable.text, fontSize: 15, fontWeight: '700' },

  subbar: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6,
  },
  subbarLabel: {
    color: lovable.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 0.8,
  },
  subbarValue: {
    color: lovable.text, fontSize: 14, fontWeight: '600',
    marginTop: 2,
  },

  err: {
    color: '#ff5555', fontSize: 12,
    paddingHorizontal: 20, marginTop: 8,
  },

  list: { paddingHorizontal: 16, paddingTop: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14, marginBottom: 8,
    backgroundColor: lovable.card,
    borderWidth: 1, borderColor: lovable.cardBorder,
    gap: 12,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(91,124,245,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconGlyph: { color: lovable.accent, fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  cardTitle: { color: lovable.text, fontSize: 14, fontWeight: '600' },
  cardDesc: { color: lovable.textMuted, fontSize: 12, marginTop: 3, lineHeight: 16 },
  cardRight: { width: 24, alignItems: 'center' },
  applyIcon: { color: lovable.textMuted, fontSize: 22, marginTop: -2 },

  appliedLabel: {
    color: lovable.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 0.8, marginTop: 24, marginBottom: 8,
    paddingHorizontal: 4,
  },
  appliedRow: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, marginBottom: 6,
    borderWidth: 1,
  },
  appliedOk: { backgroundColor: 'rgba(68,255,136,0.06)', borderColor: 'rgba(68,255,136,0.20)' },
  appliedBad: { backgroundColor: 'rgba(255,85,85,0.06)', borderColor: 'rgba(255,85,85,0.20)' },
  appliedText: { fontSize: 13, fontWeight: '600' },
  appliedMeta: { color: lovable.textMuted, fontSize: 11, marginTop: 3, lineHeight: 15 },
});
