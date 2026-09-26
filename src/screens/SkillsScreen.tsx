// Figma reference: skills catalogue in light theme.
// White cards on cream, Feather icons, soft pastel accent.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  listAllSkills, importSkillFromUrl, getBaseUrl,
  type BackendSkill,
} from '../services/deepseekApi';
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

function iconFor(id: string): any {
  if (id.includes('responsive')) return 'smartphone';
  if (id.includes('dark')) return 'moon';
  if (id.includes('seo')) return 'search';
  if (id.includes('contact') || id.includes('form')) return 'mail';
  if (id.includes('favicon') || id.includes('pwa')) return 'square';
  if (id.includes('analytic')) return 'bar-chart-2';
  if (id.includes('animation')) return 'zap';
  if (id.includes('accessib')) return 'eye';
  if (id.includes('docx') || id.includes('word')) return 'file-text';
  return 'star';
}

export function SkillsScreen({ projectId, projectTitle, onDone, onClose }: Props) {
  const [skills, setSkills] = useState<BackendSkill[] | null>(null);
  const [status, setStatus] = useState<{
    configured: boolean; lastError: string | null; loadedAt: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busySkill, setBusySkill] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedResult[]>([]);
  const [applyErr, setApplyErr] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const r = await listAllSkills();
      setSkills(r.skills || []);
      setStatus({ configured: r.configured, lastError: r.lastError, loadedAt: r.loadedAt });
    } catch (e) {
      setSkills([]);
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const apply = useCallback(async (skill: BackendSkill) => {
    if (!projectId) { setApplyErr('Open a project first.'); return; }
    if (busySkill) return;
    setBusySkill(skill.id);
    setApplyErr(null);
    try {
      const base = await getBaseUrl();
      const prompt = skill.label + ': apply this skill to the project.';
      const r = await fetch(
        base + '/projects/' + encodeURIComponent(projectId) + '/build',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt }),
        }
      );
      const j = await r.json().catch(() => ({ ok: false, error: 'bad json' }));
      if (!j.ok) throw new Error(j.error || 'build failed');
      setApplied((prev) => [
        { skillId: skill.id, ok: true, summary: j.result.summary, at: Date.now() },
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

  const doImport = useCallback(async () => {
    const url = importUrl.trim();
    if (!url || importing) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const skill = await importSkillFromUrl(url);
      setImportMsg('Imported: ' + skill.label + ' (' + skill.bytes + 'B)');
      setImportUrl('');
      await load();
    } catch (e) {
      setImportMsg('Import failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImporting(false);
    }
  }, [importUrl, importing, load]);

  const list = skills ?? [];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Close">
          <Feather name="x" size={18} color={lovable.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Skills</Text>
        </View>
        <Pressable onPress={load} style={s.headerBtn} disabled={loading} accessibilityLabel="Refresh">
          <Feather name="refresh-cw" size={15} color={loading ? lovable.textFaint : lovable.text} />
        </Pressable>
      </View>

      <View style={s.subbar}>
        <Text style={s.subbarLabel}>TARGET PROJECT</Text>
        <Text style={s.subbarValue} numberOfLines={1}>
          {projectTitle || 'No project open'}
        </Text>
      </View>

      <View style={s.importRow}>
        <View style={s.importInner}>
          <Feather name="link-2" size={14} color={lovable.textDim} />
          <TextInput
            value={importUrl}
            onChangeText={setImportUrl}
            placeholder="Paste skill URL (raw or blob)..."
            placeholderTextColor={lovable.textDim}
            style={s.importInput}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!importing}
          />
        </View>
        <Pressable
          onPress={() => void doImport()}
          disabled={importing || !importUrl.trim()}
          style={[s.importBtn, (importing || !importUrl.trim()) && { opacity: 0.4 }]}
        >
          {importing
            ? <ActivityIndicator color="#FFFFFF" size="small" />
            : <Text style={s.importBtnText}>Import</Text>}
        </Pressable>
      </View>
      {importMsg ? <Text style={s.importMsg}>{importMsg}</Text> : null}

      <View style={s.statusRow}>
        <Text style={s.statusText} numberOfLines={1}>
          {loading
            ? 'loading...'
            : loadErr
            ? 'backend error: ' + loadErr
            : status
            ? list.length + ' skill' + (list.length === 1 ? '' : 's') +
              (status.loadedAt ? ' \u00B7 ' + new Date(status.loadedAt).toLocaleTimeString() : '')
            : '\u2014'}
        </Text>
      </View>

      {applyErr ? <Text style={s.err}>{'\u2022'} {applyErr}</Text> : null}

      <ScrollView contentContainerStyle={s.list}>
        {loading && list.length === 0 ? (
          <ActivityIndicator color={lovable.textMuted} style={{ marginTop: lovable.space.lg }} />
        ) : list.length === 0 ? (
          <View style={s.empty}>
            <Feather name="star" size={40} color={lovable.textDim} />
            <Text style={s.emptyTitle}>No skills loaded</Text>
            <Text style={s.emptyBody}>
              {loadErr
                ? 'Backend unreachable. Check that ~/start-factory.sh is running.'
                : 'Catalogue is empty. Paste a URL above and tap Import.'}
            </Text>
          </View>
        ) : (
          list.map((skill) => {
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
                  <Feather name={iconFor(skill.id)} size={18} color={lovable.text} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>{skill.label}</Text>
                  <Text style={s.cardDesc} numberOfLines={2}>{skill.description}</Text>
                  <Text style={s.cardSource} numberOfLines={1}>
                    {skill.id} {'\u00B7'} {skill.bytes}B
                  </Text>
                </View>
                <View style={s.cardRight}>
                  {isBusy
                    ? <ActivityIndicator color={lovable.textMuted} size="small" />
                    : <Feather name="chevron-right" size={20} color={lovable.textMuted} />}
                </View>
              </Pressable>
            );
          })
        )}

        {applied.length > 0 ? (
          <>
            <Text style={s.appliedLabel}>APPLIED THIS SESSION</Text>
            {applied.map((a, i) => {
              const skill = list.find((x) => x.id === a.skillId);
              return (
                <View key={a.at + '_' + i} style={[s.appliedRow, a.ok ? s.appliedOk : s.appliedBad]}>
                  <View style={s.appliedHeader}>
                    <Feather
                      name={a.ok ? 'check-circle' : 'x-circle'}
                      size={13}
                      color={a.ok ? lovable.success : lovable.error}
                    />
                    <Text style={[s.appliedText, a.ok ? { color: lovable.text } : { color: lovable.error }]}>
                      {skill?.label || a.skillId}
                    </Text>
                  </View>
                  <Text style={s.appliedMeta} numberOfLines={2}>
                    {a.ok ? a.summary : a.error}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: lovable.space.sm + 4,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.bold,
  },
  subbar: {
    paddingHorizontal: lovable.space.lg,
    paddingTop: lovable.space.sm + 6,
    paddingBottom: 6,
  },
  subbarLabel: {
    color: lovable.textMuted,
    fontSize: 10,
    fontWeight: lovable.weight.bold,
    letterSpacing: 0.8,
  },
  subbarValue: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
    marginTop: 2,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.sm + 4,
  },
  importInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: lovable.input,
    borderWidth: 1,
    borderColor: lovable.inputBorder,
    borderRadius: 10,
    paddingHorizontal: lovable.space.sm + 2,
  },
  importInput: {
    flex: 1,
    color: lovable.text,
    paddingVertical: 10,
    fontSize: lovable.font.xs,
    fontFamily: 'monospace',
  },
  importBtn: {
    paddingHorizontal: lovable.space.sm + 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: lovable.accent,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtnText: {
    color: '#FFFFFF',
    fontWeight: lovable.weight.bold,
    fontSize: lovable.font.xs,
  },
  importMsg: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    paddingHorizontal: lovable.space.md,
    marginTop: 6,
  },
  statusRow: {
    paddingHorizontal: lovable.space.lg,
    paddingTop: lovable.space.sm,
    paddingBottom: 4,
  },
  statusText: {
    color: lovable.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  err: {
    color: lovable.error,
    fontSize: lovable.font.xs,
    paddingHorizontal: lovable.space.lg,
    marginTop: 6,
  },
  list: {
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: lovable.space.xxl,
    paddingHorizontal: lovable.space.lg,
    gap: lovable.space.sm,
  },
  emptyTitle: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxl,
    letterSpacing: -0.3,
    marginTop: lovable.space.sm,
  },
  emptyBody: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: lovable.space.sm + 4,
    paddingVertical: lovable.space.sm + 4,
    borderRadius: lovable.radius.lg,
    marginBottom: lovable.space.sm,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    gap: lovable.space.sm + 4,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: lovable.pillBg,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  cardDesc: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 3,
    lineHeight: 16,
  },
  cardSource: {
    color: lovable.textDim,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  cardRight: { width: 24, alignItems: 'center' },
  appliedLabel: {
    color: lovable.textMuted,
    fontSize: 10,
    fontWeight: lovable.weight.bold,
    letterSpacing: 0.8,
    marginTop: lovable.space.lg,
    marginBottom: lovable.space.sm,
    paddingHorizontal: 4,
  },
  appliedRow: {
    paddingHorizontal: lovable.space.sm + 2,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  appliedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appliedOk: {
    backgroundColor: lovable.successSoft,
    borderColor: 'rgba(22,163,74,0.18)',
  },
  appliedBad: {
    backgroundColor: lovable.errorSoft,
    borderColor: 'rgba(220,38,38,0.18)',
  },
  appliedText: {
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.semibold,
  },
  appliedMeta: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 3,
    lineHeight: 15,
  },
});
