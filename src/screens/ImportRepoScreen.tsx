// Import from GitHub — paste a repo URL, create a project, clone it.
import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { api } from '../services/api';
import { lovable } from '../theme';

interface Props {
  onClose: () => void;
  onImported: (projectId: string, title: string) => void;
}

const SAMPLE = 'https://github.com/owner/repo';

function slugFromUrl(url: string): string {
  const cleaned = url.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  const parts = cleaned.split('/');
  const repo = parts[parts.length - 1] || 'imported';
  return repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 6);
}

function nameFromUrl(url: string): string {
  const cleaned = url.trim().replace(/\.git$/, '').replace(/\/+$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || 'Imported project';
}

export function ImportRepoScreen({ onClose, onImported }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importRepo = useCallback(async () => {
    const repoUrl = url.trim();
    if (!repoUrl) { setError('paste a GitHub repo URL'); return; }
    if (!/^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(repoUrl)) {
      setError('must be https://github.com/owner/repo');
      return;
    }

    setBusy(true); setError(null); setStatus('Creating project...');
    try {
      const name = nameFromUrl(repoUrl);
      const slug = slugFromUrl(repoUrl);
      const project = await api.createProject({
        name,
        slug,
        description: 'Imported from ' + repoUrl,
      });

      setStatus('Cloning repository (this may take 30-90s)...');
      const result = await api.importRepo(project.id, repoUrl);
      setStatus('Cloned ' + result.fileCount + ' files on ' + result.branch);
      onImported(project.id, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }, [url, onImported]);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} hitSlop={8}>
          <Feather name="x" size={20} color={lovable.text} />
        </Pressable>
        <Text style={s.headerTitle}>Import from GitHub</Text>
        <View style={s.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.h1}>Paste a public repo URL</Text>
          <Text style={s.sub}>
            The repo will be cloned into a new project. You can then chat with
            it, edit it with any engine, and push changes to a new branch.
          </Text>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>repoUrl</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder={SAMPLE}
              placeholderTextColor={lovable.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={s.fieldInput}
            />
          </View>

          <View style={s.btnRow}>
            <Pressable
              onPress={importRepo}
              disabled={busy || url.trim().length === 0}
              style={[s.btn, s.btnPrimary, (busy || url.trim().length === 0) && s.btnDisabled]}
            >
              <Text style={s.btnTextPrimary}>{busy ? 'Importing\u2026' : 'Import'}</Text>
            </Pressable>
            <Pressable onPress={onClose} disabled={busy} style={[s.btn, s.btnOutline, busy && s.btnDisabled]}>
              <Text style={s.btnTextOutline}>Cancel</Text>
            </Pressable>
          </View>

          {busy ? (
            <View style={s.statusRow}>
              <ActivityIndicator color={lovable.textMuted} size="small" />
              <Text style={s.statusText}>{status || 'working\u2026'}</Text>
            </View>
          ) : null}

          {error ? <Text style={s.err}>\u25cf {error}</Text> : null}

          <View style={s.warnBox}>
            <Text style={s.warnText}>
              \u26a0 Works for any public repo. Private repos require GitHub credentials to be
              configured in Settings. Sibling files like .git/ are hidden from the AI editor
              automatically.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: lovable.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: lovable.cardBorder,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: lovable.text, fontSize: 15, fontWeight: lovable.weight.semibold },

  body: { padding: 20, gap: 4 },
  h1: { color: lovable.text, fontSize: 22, fontWeight: lovable.weight.bold, marginBottom: 6 },
  sub: { color: lovable.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 20 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: lovable.text, fontSize: 10, fontFamily: 'monospace', fontWeight: lovable.weight.bold, marginBottom: 6 },
  fieldInput: {
    backgroundColor: lovable.input, borderWidth: 1, borderColor: lovable.inputBorder,
    borderRadius: 10, color: lovable.text, fontFamily: 'monospace', fontSize: 13,
    paddingHorizontal: 12, paddingVertical: 12,
  },

  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: lovable.accent },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: lovable.cardBorder },
  btnDisabled: { opacity: 0.5 },
  btnTextPrimary: { color: '#FFFFFF', fontWeight: lovable.weight.bold, fontSize: 14 },
  btnTextOutline: { color: lovable.text, fontWeight: lovable.weight.semibold, fontSize: 14 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  statusText: { color: lovable.textMuted, fontSize: 12, fontFamily: 'monospace', flex: 1 },

  err: { color: lovable.error, fontSize: 12, fontFamily: 'monospace', marginBottom: 12 },

  warnBox: {
    marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: lovable.warningSoft, borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
  },
  warnText: { color: lovable.warning, fontSize: 11, lineHeight: 17 },
});
