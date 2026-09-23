/**
 * screens/MysticRealm.tsx
 * Pure presentation. All data comes from backend /mystic-realm endpoints.
 * No hardcoded constructs, schemas, guardrails, or trait values.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { NebulaBackground } from '../components/NebulaBackground';
import { api } from '../services/api';
import { theme } from '../theme';
import type {
  ManifestationResult, ForgeReport, SoulState, SoulTraits,
  VaultSummary, ConstructComplexity,
} from '../types';

const COMPLEXITY_STATUS: Record<ConstructComplexity, 'error' | 'warning' | 'pending' | 'success'> = {
  Extreme: 'error',
  High: 'warning',
  Medium: 'pending',
  Low: 'success',
};

const COMPLEXITY_COLOR: Record<ConstructComplexity, string> = {
  Extreme: theme.purple,
  High: theme.red,
  Medium: theme.cyan,
  Low: theme.green,
};

export function MysticRealm() {
  const [intention, setIntention] = useState('');
  const [manifesting, setManifesting] = useState(false);
  const [manifestation, setManifestation] = useState<ManifestationResult | null>(null);

  const [forge, setForge] = useState<ForgeReport | null>(null);
  const [soul, setSoul] = useState<SoulState | null>(null);
  const [soulBusy, setSoulBusy] = useState(false);
  const [vault, setVault] = useState<VaultSummary | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, s, v] = await Promise.all([
        api.getMysticForge(),
        api.getMysticSoul(),
        api.getMysticVault(),
      ]);
      setForge(f);
      setSoul(s);
      setVault(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reach backend');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onManifest = async () => {
    if (!intention.trim()) return;
    setManifesting(true);
    setError(null);
    try {
      const result = await api.manifestMystic(intention.trim());
      setManifestation(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'manifestation failed');
    } finally {
      setManifesting(false);
    }
  };

  const bumpTrait = async (key: keyof SoulTraits, delta: number) => {
    if (!soul) return;
    const current = soul[key];
    const next = Math.max(0, Math.min(100, current + delta));
    if (next === current) return;

    setSoulBusy(true);
    setError(null);
    const optimistic: SoulState = { ...soul, [key]: next };
    setSoul(optimistic);

    try {
      const patch: Partial<SoulTraits> = { [key]: next };
      const fresh = await api.setMysticSoul(patch);
      setSoul(fresh);
    } catch (e) {
      setSoul(soul);
      setError(e instanceof Error ? e.message : 'soul update failed');
    } finally {
      setSoulBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>Mystic Realm</Text>
        <Text style={s.sub}>Void, forge, soul, and vault — the singularity layer</Text>

        {error && <Text style={s.errBanner}>{error}</Text>}

        <GlassCard style={s.voidCard} accent={theme.purple}>
          <Text style={s.cardTitle}>Void Manifestation Engine</Text>
          <Text style={s.cardDesc}>
            Speak a single intention. The backend turns it into a plan and logs it to the Truth Ledger.
          </Text>
          <View style={s.voidField} testID="void-manifestation-engine">
            <View style={s.voidOrb} />
            <View style={s.voidOrb2} />
            <View style={s.voidOrb3} />
            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder="Type your intention…"
              placeholderTextColor={theme.textMuted}
              style={s.voidInput}
              autoCapitalize="none"
              onSubmitEditing={onManifest}
            />
          </View>
          <Pressable
            onPress={onManifest}
            disabled={manifesting || !intention.trim()}
            style={({ pressed }) => [s.manifestBtn, pressed && s.pressed, (manifesting || !intention.trim()) && s.btnDisabled]}
          >
            <Text style={s.manifestBtnText}>{manifesting ? 'MANIFESTING…' : 'MANIFEST'}</Text>
          </Pressable>

          {manifestation && (
            <View style={s.manifestResult}>
              <Text style={s.manifestIntention}>"{manifestation.intention}"</Text>
              {manifestation.steps.map((step) => (
                <View key={step.order} style={s.manifestStep}>
                  <Text style={s.stepNum}>{step.order}</Text>
                  <View style={s.stepBody}>
                    <Text style={s.stepAction}>{step.action}</Text>
                    <Text style={s.stepRationale}>{step.rationale}</Text>
                  </View>
                </View>
              ))}
              <Text style={s.manifestRef}>logged: {manifestation.ledgerEntryId}</Text>
            </View>
          )}
        </GlassCard>

        <GlassCard style={s.card} accent={theme.cyan}>
          <Text style={s.cardTitle}>Digital Singularity Forge</Text>
          <Text style={s.cardDesc}>
            {forge
              ? `${forge.totalProjects} project${forge.totalProjects === 1 ? '' : 's'} · ${forge.totalTasks} task${forge.totalTasks === 1 ? '' : 's'} total`
              : 'Loading constructs…'}
          </Text>
          <View style={s.forgeList} testID="digital-singularity-forge">
            {(forge?.constructs ?? []).map((c) => {
              const color = COMPLEXITY_COLOR[c.complexity] ?? theme.cyan;
              return (
                <View key={c.id} style={[s.construct, { borderColor: `${color}44`, backgroundColor: `${color}10` }]}>
                  <View style={s.constructHead}>
                    <Text style={[s.constructName, { color }]} numberOfLines={1}>{c.name}</Text>
                    <StatusChip label={c.complexity} status={COMPLEXITY_STATUS[c.complexity] ?? 'pending'} />
                  </View>
                  <Text style={s.constructScope}>
                    {c.scope} · {c.taskCount} task{c.taskCount === 1 ? '' : 's'} ({c.openTaskCount} open, {c.doneTaskCount} done) · {c.goalCount} goal{c.goalCount === 1 ? '' : 's'}
                  </Text>
                </View>
              );
            })}
            {forge && forge.constructs.length === 0 && (
              <Text style={s.empty}>No projects yet.</Text>
            )}
          </View>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.gold}>
          <Text style={s.cardTitle}>Sovereign Soul Sync</Text>
          <Text style={s.cardDesc}>
            {soul ? `Persisted · updated ${new Date(soul.updatedAt).toLocaleTimeString()}` : 'Loading traits…'}
          </Text>
          {soul && (
            <View style={s.soulPanel} testID="sovereign-soul-sync">
              <View style={s.soulAvatar}>
                <Text style={s.soulAvatarIcon}>☯</Text>
              </View>
              <View style={s.soulTraits}>
                <TraitRow label="Risk Profile" value={soul.risk} color={theme.red} busy={soulBusy} onDelta={(d) => bumpTrait('risk', d)} />
                <TraitRow label="Speed vs Accuracy" value={soul.speed} color={theme.cyan} busy={soulBusy} onDelta={(d) => bumpTrait('speed', d)} />
                <TraitRow label="Design Taste" value={soul.taste} color={theme.gold} busy={soulBusy} onDelta={(d) => bumpTrait('taste', d)} />
              </View>
            </View>
          )}
        </GlassCard>

        <GlassCard style={s.card} accent={vaultUnlocked ? theme.green : theme.purple}>
          <View style={s.vaultHead}>
            <Text style={s.cardTitle}>Zero Knowledge Vault</Text>
            <Pressable
              onPress={() => setVaultUnlocked(!vaultUnlocked)}
              style={({ pressed }) => [s.vaultLock, pressed && s.pressed]}
              testID="vault-lock-toggle"
            >
              <Text style={s.vaultLockIcon}>{vaultUnlocked ? '🔓' : '🔒'}</Text>
              <Text style={s.vaultLockText}>{vaultUnlocked ? 'Unlocked' : 'Locked'}</Text>
            </Pressable>
          </View>

          {vault && (
            <View style={[s.vaultBody, !vaultUnlocked && s.vaultBlurred]} testID="zero-knowledge-vault">
              <Text style={s.vaultLabel}>Ledger Integrity</Text>
              <Text style={s.vaultItemText}>
                {vault.integrityOk ? '✓ chain verified' : `✗ broken at ${vault.integrityBrokenAt ?? 'unknown'}`}
              </Text>

              <Text style={s.vaultLabel}>Entry Count</Text>
              <Text style={s.vaultItemText}>{vault.entryCount} immutable entries</Text>

              <Text style={s.vaultLabel}>Head Hash</Text>
              <Text style={s.vaultItemText} numberOfLines={1}>{vault.headHash ?? '(empty ledger)'}</Text>

              <Text style={s.vaultLabel}>Distinct Event Types ({vault.distinctTypes.length})</Text>
              {vault.distinctTypes.slice(0, 6).map((t) => (
                <Text key={t} style={s.vaultItemText}>· {t}</Text>
              ))}
              {vault.distinctTypes.length > 6 && (
                <Text style={s.vaultItemText}>… +{vault.distinctTypes.length - 6} more</Text>
              )}

              <Text style={s.vaultLabel}>Distinct Tags ({vault.distinctTags.length})</Text>
              <Text style={s.vaultItemText} numberOfLines={2}>
                {vault.distinctTags.slice(0, 12).join(', ')}
                {vault.distinctTags.length > 12 ? '…' : ''}
              </Text>

              <Text style={s.vaultNote}>{vault.note}</Text>
            </View>
          )}

          {!vaultUnlocked && vault && (
            <Text style={s.vaultHint}>Vault contents hidden. Tap lock to reveal.</Text>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function TraitRow({
  label, value, color, busy, onDelta,
}: {
  label: string;
  value: number;
  color: string;
  busy: boolean;
  onDelta: (delta: number) => void;
}) {
  return (
    <View style={s.traitRow}>
      <Text style={s.traitLabel}>{label}</Text>
      <View style={s.traitTrack}>
        <View style={[s.traitFill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
      <Pressable onPress={() => onDelta(-10)} disabled={busy} style={[s.traitBtn, busy && s.btnDisabled]}>
        <Text style={s.traitBtnText}>−</Text>
      </Pressable>
      <Text style={s.traitVal}>{value}</Text>
      <Pressable onPress={() => onDelta(10)} disabled={busy} style={[s.traitBtn, busy && s.btnDisabled]}>
        <Text style={s.traitBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 14 },
  errBanner: { color: theme.red, fontSize: 12, fontFamily: 'monospace', marginBottom: 12 },
  card: { marginBottom: 12 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textMuted, fontSize: 12, marginBottom: 10 },
  empty: { color: theme.textMuted, fontSize: 12, fontStyle: 'italic', padding: 8 },
  voidCard: { marginBottom: 12 },
  voidField: { height: 160, backgroundColor: theme.void, borderRadius: 16, borderWidth: 1, borderColor: `${theme.purple}33`, position: 'relative', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  voidOrb: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(185, 138, 255, 0.08)', top: 30, left: '35%' },
  voidOrb2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(216, 107, 255, 0.06)', top: 50, left: '45%' },
  voidOrb3: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(70, 215, 255, 0.04)', top: 65, left: '52%' },
  voidInput: { width: '80%', height: 44, borderRadius: 12, backgroundColor: 'rgba(10, 6, 18, 0.8)', borderWidth: 1, borderColor: `${theme.purple}44`, paddingHorizontal: 14, color: theme.text, fontSize: 13, textAlign: 'center' },
  manifestBtn: { marginTop: 10, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.purple },
  manifestBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  btnDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  manifestResult: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: theme.glassSoft, gap: 8 },
  manifestIntention: { color: theme.purple, fontSize: 13, fontWeight: '700', fontStyle: 'italic' },
  manifestStep: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepNum: { color: theme.purple, fontSize: 12, fontWeight: '800', width: 16, fontFamily: 'monospace' },
  stepBody: { flex: 1 },
  stepAction: { color: theme.text, fontSize: 12, fontWeight: '600' },
  stepRationale: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
  manifestRef: { color: theme.textMuted, fontSize: 10, fontFamily: 'monospace', marginTop: 4 },
  forgeList: { gap: 8 },
  construct: { borderRadius: 12, borderWidth: 1, padding: 12 },
  constructHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  constructName: { fontSize: 13, fontWeight: '700', flex: 1 },
  constructScope: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' },
  soulPanel: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  soulAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${theme.gold}14`, borderWidth: 1, borderColor: `${theme.gold}44`, alignItems: 'center', justifyContent: 'center' },
  soulAvatarIcon: { fontSize: 28, color: theme.gold },
  soulTraits: { flex: 1, gap: 8 },
  traitRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  traitLabel: { color: theme.textSecondary, fontSize: 10, fontWeight: '600', width: 86 },
  traitTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  traitFill: { height: '100%', borderRadius: 4 },
  traitBtn: { width: 22, height: 22, borderRadius: 6, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  traitBtnText: { color: theme.text, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  traitVal: { color: theme.text, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', width: 26, textAlign: 'center' },
  vaultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vaultLock: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  vaultLockIcon: { fontSize: 14 },
  vaultLockText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  vaultBody: { gap: 4 },
  vaultBlurred: { opacity: 0.15 },
  vaultLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 2 },
  vaultItemText: { color: theme.textSecondary, fontSize: 12, fontFamily: 'monospace', paddingLeft: 2 },
  vaultNote: { color: theme.textMuted, fontSize: 10, marginTop: 10, fontStyle: 'italic' },
  vaultHint: { color: theme.textMuted, fontSize: 12, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
});
