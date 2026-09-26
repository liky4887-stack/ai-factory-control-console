// Figma reference: preview canvas (screenshots 2 & 3).
// Light header, white WebView, soft placeholder card on cream.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { api } from '../services/api';
import { getBaseUrl } from '../services/deepseekApi';
import { lovable } from '../theme';
import type { Project } from '../types';

interface Props {
  id: string;
  title?: string;
  onClose: () => void;
}

function pickUrl(p: any): string | null {
  if (!p) return null;
  const candidates = [p.previewUrl, p.deployUrl, p.url, p.host, p.siteUrl];
  for (const c of candidates) if (typeof c === 'string' && c.startsWith('http')) return c;
  return null;
}

export function PreviewScreen({ id, title, onClose }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getProject(id);
      setProject(p);
      try {
        const files = await api.listProjectFiles(id);
        if (files.length > 0) {
          const base = await getBaseUrl();
          setPreviewUrl(base + '/projects/' + encodeURIComponent(id) + '/preview/');
        } else {
          setPreviewUrl(null);
        }
      } catch {
        setPreviewUrl(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'failed';
      if (/40[34]/.test(msg) || /NOT_FOUND/i.test(msg)) {
        setProject(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const url = previewUrl || pickUrl(project);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={onClose} style={s.headerBtn} accessibilityLabel="Close">
          <Feather name="chevron-left" size={20} color={lovable.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{title || 'Preview'}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={lovable.textMuted} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.err}>{'\u2022'} {error}</Text>
        </View>
      ) : url ? (
        <WebView
          source={{ uri: url }}
          style={s.web}
          startInLoadingState
          renderLoading={() => (
            <View style={s.center}><ActivityIndicator color={lovable.textMuted} /></View>
          )}
        />
      ) : (
        <View style={s.center}>
          <View style={s.placeholderCard}>
            <Feather name="layout" size={40} color={lovable.textDim} />
            <Text style={s.placeholderTitle}>No preview yet</Text>
            <Text style={s.placeholderBody}>
              This project has no build output to preview.
              {'\n\n'}
              {project?.description || 'Once a build runs, its URL will appear here.'}
            </Text>
          </View>
        </View>
      )}
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
    fontWeight: lovable.weight.semibold,
  },
  web: { flex: 1, backgroundColor: '#FFFFFF' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: lovable.space.lg,
  },
  err: { color: lovable.error, fontSize: lovable.font.sm },
  placeholderCard: {
    padding: lovable.space.xl,
    borderRadius: lovable.radius.lg,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center',
    maxWidth: 320,
    gap: lovable.space.sm,
  },
  placeholderTitle: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxl,
    letterSpacing: -0.3,
    marginTop: lovable.space.sm,
  },
  placeholderBody: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
