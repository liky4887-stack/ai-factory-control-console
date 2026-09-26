// Attachment picker modal: image URL, Figma URL, or a saved skill.
// Opens from the Attach button on Home (PromptBar) and ProjectDetail.
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { listAllSkills, type BackendSkill } from '../services/deepseekApi';
import { lovable } from '../theme';

export interface PromptAttachment {
  id: string;
  kind: 'image' | 'figma' | 'skill';
  label: string;
  value: string;  // url for image/figma, skill id for skill
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (att: PromptAttachment) => void;
  /** Optional pre-existing refs so skills already attached don't appear twice. */
  existing?: PromptAttachment[];
}

type Tab = 'image' | 'figma' | 'skill';

function isLikelyUrl(s: string): boolean {
  return /^https?:\/\/\S+\.\S+/i.test(s.trim());
}

export function AttachmentSheet({ visible, onClose, onAdd, existing = [] }: Props) {
  const [tab, setTab] = useState<Tab>('image');
  const [url, setUrl] = useState('');

  const [skills, setSkills] = useState<BackendSkill[] | null>(null);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [skillErr, setSkillErr] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    if (skills !== null) return;
    setLoadingSkills(true);
    setSkillErr(null);
    try {
      const r = await listAllSkills();
      setSkills(r.skills || []);
    } catch (e) {
      setSkills([]);
      setSkillErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingSkills(false);
    }
  }, [skills]);

  useEffect(() => {
    if (visible && tab === 'skill') void loadSkills();
  }, [visible, tab, loadSkills]);

  useEffect(() => {
    if (!visible) {
      setUrl('');
      setTab('image');
    }
  }, [visible]);

  const addUrl = (kind: 'image' | 'figma') => {
    const trimmed = url.trim();
    if (!isLikelyUrl(trimmed)) return;
    const label = kind === 'figma'
      ? 'Figma'
      : (() => {
          try {
            const u = new URL(trimmed);
            const last = u.pathname.split('/').filter(Boolean).pop() || 'image';
            return last.slice(0, 32);
          } catch { return 'image'; }
        })();
    onAdd({
      id: kind + '_' + Date.now(),
      kind,
      label,
      value: trimmed,
    });
    setUrl('');
    onClose();
  };

  const addSkill = (skill: BackendSkill) => {
    onAdd({
      id: 'skill_' + skill.id,
      kind: 'skill',
      label: skill.label,
      value: skill.id,
    });
    onClose();
  };

  const existingSkillIds = new Set(
    existing.filter((a) => a.kind === 'skill').map((a) => a.value)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.sheetOuter}
        >
          <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.head}>
              <Text style={s.title}>Add reference</Text>
              <Pressable
                onPress={onClose}
                style={s.closeBtn}
                accessibilityLabel="Close"
              >
                <Feather name="x" size={18} color={lovable.text} />
              </Pressable>
            </View>

            <View style={s.tabs}>
              {(['image', 'figma', 'skill'] as Tab[]).map((t) => {
                const active = tab === t;
                const icon = t === 'image' ? 'image' : t === 'figma' ? 'layout' : 'star';
                const label = t === 'image' ? 'Image' : t === 'figma' ? 'Figma' : 'Skill';
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={[s.tabBtn, active && s.tabActive]}
                    accessibilityLabel={label}
                  >
                    <Feather
                      name={icon}
                      size={14}
                      color={active ? lovable.text : lovable.textMuted}
                    />
                    <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tab === 'image' || tab === 'figma' ? (
              <View style={s.urlWrap}>
                <Text style={s.hint}>
                  {tab === 'figma'
                    ? 'Paste a Figma share link. The builder will match the visual language.'
                    : 'Paste a direct image URL (must end in .png, .jpg, .webp, .svg…).'}
                </Text>
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder={
                    tab === 'figma'
                      ? 'https://figma.com/file/...'
                      : 'https://example.com/hero.png'
                  }
                  placeholderTextColor={lovable.textDim}
                  style={s.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                <Pressable
                  style={[s.addBtn, !isLikelyUrl(url) && { opacity: 0.4 }]}
                  disabled={!isLikelyUrl(url)}
                  onPress={() => addUrl(tab)}
                  accessibilityLabel="Add reference"
                >
                  <Text style={s.addBtnText}>Add reference</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.skillsWrap}>
                {loadingSkills ? (
                  <ActivityIndicator color={lovable.textMuted} style={{ marginVertical: 24 }} />
                ) : skillErr ? (
                  <Text style={s.err}>{skillErr}</Text>
                ) : (skills ?? []).length === 0 ? (
                  <Text style={s.empty}>
                    No skills loaded. Import some on the Skills page first.
                  </Text>
                ) : (
                  <ScrollView style={s.skillList}>
                    {(skills ?? []).map((sk) => {
                      const already = existingSkillIds.has(sk.id);
                      return (
                        <Pressable
                          key={sk.id}
                          onPress={() => addSkill(sk)}
                          style={({ pressed }) => [s.skillRow, pressed && { opacity: 0.7 }]}
                          disabled={already}
                        >
                          <Feather name="star" size={14} color={lovable.textMuted} />
                          <View style={s.skillBody}>
                            <Text style={s.skillTitle} numberOfLines={1}>{sk.label}</Text>
                            <Text style={s.skillDesc} numberOfLines={2}>{sk.description}</Text>
                          </View>
                          {already ? (
                            <Feather name="check" size={14} color={lovable.success} />
                          ) : (
                            <Feather name="plus" size={14} color={lovable.textMuted} />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.35)',
    justifyContent: 'flex-end',
  },
  sheetOuter: { width: '100%' },
  sheet: {
    backgroundColor: lovable.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: lovable.space.md,
    paddingTop: lovable.space.md,
    paddingBottom: lovable.space.xl,
    maxHeight: '85%',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: lovable.space.md,
  },
  title: {
    color: lovable.text,
    fontFamily: lovable.fontSerif,
    fontSize: lovable.font.xxl,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: lovable.card,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: lovable.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: lovable.cardBorder,
    padding: 3,
    marginBottom: lovable.space.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabActive: { backgroundColor: lovable.pillBg },
  tabText: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    fontWeight: lovable.weight.medium,
  },
  tabTextActive: { color: lovable.text, fontWeight: lovable.weight.semibold },

  urlWrap: { gap: lovable.space.sm },
  hint: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    lineHeight: 19,
  },
  input: {
    backgroundColor: lovable.input,
    borderWidth: 1,
    borderColor: lovable.inputBorder,
    borderRadius: 12,
    color: lovable.text,
    paddingHorizontal: lovable.space.md,
    paddingVertical: 12,
    fontSize: lovable.font.md,
  },
  addBtn: {
    backgroundColor: lovable.accent,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: lovable.weight.semibold,
    fontSize: lovable.font.md,
  },

  skillsWrap: { maxHeight: 380 },
  skillList: {},
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: lovable.space.sm,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: lovable.cardBorder,
  },
  skillBody: { flex: 1 },
  skillTitle: {
    color: lovable.text,
    fontSize: lovable.font.md,
    fontWeight: lovable.weight.semibold,
  },
  skillDesc: {
    color: lovable.textMuted,
    fontSize: lovable.font.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  empty: {
    color: lovable.textMuted,
    fontSize: lovable.font.sm,
    textAlign: 'center',
    paddingVertical: lovable.space.xl,
  },
  err: {
    color: lovable.error,
    fontSize: lovable.font.sm,
    textAlign: 'center',
    paddingVertical: lovable.space.xl,
  },
});
