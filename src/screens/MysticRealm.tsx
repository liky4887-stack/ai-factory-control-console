import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { StatusChip } from '../components/StatusChip';
import { CommandButton } from '../components/CommandButton';
import { NebulaBackground } from '../components/NebulaBackground';
import { theme } from '../theme';

const CONSTRUCTS = [
  { name: 'Quantum Analytics Core', scope: 'Global', complexity: 'High', color: theme.cyan },
  { name: 'Neural Commerce Engine', scope: 'Domain', complexity: 'Medium', color: theme.blue },
  { name: 'Cipher Protocol Stack', scope: 'Module', complexity: 'Extreme', color: theme.purple },
  { name: 'Sovereign Guardrail Mesh', scope: 'Global', complexity: 'High', color: theme.gold },
];

const SCHEMAS = [
  'user_profiles_encrypted',
  'ledger_integrity_hashes',
  'agent_personas_sealed',
  'omega_passphrase_vault',
];

const GUARDRAILS = [
  'No unencrypted writes',
  'All reads require audit',
  'Mutations need multi-sig',
  'No cross-domain leakage',
];

export function MysticRealm() {
  const [intention, setIntention] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [soulTraits, setSoulTraits] = useState({ risk: 60, speed: 75, taste: 80 });

  return (
    <View style={s.root}>
      <NebulaBackground />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.h1}>Mystic Realm</Text>
        <Text style={s.sub}>Void, forge, soul, and vault — the singularity layer</Text>

        <GlassCard style={s.voidCard} accent={theme.purple}>
          <Text style={s.cardTitle}>Void Manifestation Engine</Text>
          <Text style={s.cardDesc}>Speak a single high-level intention into the void</Text>
          <View style={s.voidField} testID="void-manifestation-engine">
            <View style={s.voidOrb} />
            <View style={s.voidOrb2} />
            <View style={s.voidOrb3} />
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={[s.voidParticle, { left: `${15 + (i * 6) % 70}%`, top: `${20 + (i * 11) % 60}%`, opacity: 0.2 + ((i * 3) % 5) / 10 }]} />
            ))}
            <TextInput
              value={intention}
              onChangeText={setIntention}
              placeholder="Type your intention…"
              placeholderTextColor={theme.textMuted}
              style={s.voidInput}
              autoCapitalize="none"
            />
          </View>
          <CommandButton label="Manifest" variant="primary" onPress={() => {}} style={s.voidBtn} />
        </GlassCard>

        <GlassCard style={s.card} accent={theme.cyan}>
          <Text style={s.cardTitle}>Digital Singularity Forge</Text>
          <Text style={s.cardDesc}>Master constructs the system is architecting</Text>
          <View style={s.forgeList} testID="digital-singularity-forge">
            {CONSTRUCTS.map((c, i) => (
              <View key={i} style={[s.construct, { borderColor: `${c.color}44`, backgroundColor: `${c.color}10` }]}>
                <View style={s.constructHead}>
                  <Text style={[s.constructName, { color: c.color }]}>{c.name}</Text>
                  <StatusChip label={c.complexity} status={c.complexity === 'Extreme' ? 'error' : c.complexity === 'High' ? 'warning' : 'pending'} />
                </View>
                <Text style={s.constructScope}>Scope: {c.scope}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={s.card} accent={theme.gold}>
          <Text style={s.cardTitle}>Sovereign Soul Sync</Text>
          <Text style={s.cardDesc}>Mirror of the operator profile and style</Text>
          <View style={s.soulPanel} testID="sovereign-soul-sync">
            <View style={s.soulAvatar}>
              <Text style={s.soulAvatarIcon}>☯</Text>
            </View>
            <View style={s.soulTraits}>
              <View style={s.traitRow}>
                <Text style={s.traitLabel}>Risk Profile</Text>
                <View style={s.traitTrack}>
                  <View style={[s.traitFill, { width: `${soulTraits.risk}%`, backgroundColor: theme.red }]} />
                </View>
                <Text style={s.traitVal}>{soulTraits.risk}</Text>
              </View>
              <View style={s.traitRow}>
                <Text style={s.traitLabel}>Speed vs Accuracy</Text>
                <View style={s.traitTrack}>
                  <View style={[s.traitFill, { width: `${soulTraits.speed}%`, backgroundColor: theme.cyan }]} />
                </View>
                <Text style={s.traitVal}>{soulTraits.speed}</Text>
              </View>
              <View style={s.traitRow}>
                <Text style={s.traitLabel}>Design Taste</Text>
                <View style={s.traitTrack}>
                  <View style={[s.traitFill, { width: `${soulTraits.taste}%`, backgroundColor: theme.gold }]} />
                </View>
                <Text style={s.traitVal}>{soulTraits.taste}</Text>
              </View>
            </View>
          </View>
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
          <View style={[s.vaultBody, !vaultUnlocked && s.vaultBlurred]} testID="zero-knowledge-vault">
            <Text style={s.vaultLabel}>Sensitive Schemas</Text>
            {SCHEMAS.map((sc, i) => (
              <View key={i} style={s.vaultItem}>
                <Text style={s.vaultDot}>•</Text>
                <Text style={s.vaultItemText}>{sc}</Text>
              </View>
            ))}
            <Text style={s.vaultLabel}>Guardrails</Text>
            {GUARDRAILS.map((g, i) => (
              <View key={i} style={s.vaultItem}>
                <Text style={s.vaultDot}>•</Text>
                <Text style={s.vaultItemText}>{g}</Text>
              </View>
            ))}
          </View>
          {!vaultUnlocked && (
            <Text style={s.vaultHint}>Vault contents encrypted. Tap lock to reveal.</Text>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  h1: { color: theme.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.3 },
  sub: { color: theme.textMuted, fontSize: 13, marginTop: 3, marginBottom: 14 },
  card: { marginBottom: 12 },
  cardTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: theme.textMuted, fontSize: 12, marginBottom: 10 },
  voidCard: { marginBottom: 12 },
  voidField: { height: 160, backgroundColor: theme.void, borderRadius: 16, borderWidth: 1, borderColor: `${theme.purple}33`, position: 'relative', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  voidOrb: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(185, 138, 255, 0.08)', top: 30, left: '35%' },
  voidOrb2: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(216, 107, 255, 0.06)', top: 50, left: '45%' },
  voidOrb3: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(70, 215, 255, 0.04)', top: 65, left: '52%' },
  voidParticle: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: theme.purple },
  voidInput: { width: '80%', height: 44, borderRadius: 12, backgroundColor: 'rgba(10, 6, 18, 0.8)', borderWidth: 1, borderColor: `${theme.purple}44`, paddingHorizontal: 14, color: theme.text, fontSize: 13, textAlign: 'center' },
  voidBtn: { marginTop: 10, alignSelf: 'center' },
  forgeList: { gap: 8 },
  construct: { borderRadius: 12, borderWidth: 1, padding: 12 },
  constructHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  constructName: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  constructScope: { color: theme.textMuted, fontSize: 11, fontFamily: 'monospace' },
  soulPanel: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  soulAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${theme.gold}14`, borderWidth: 1, borderColor: `${theme.gold}44`, alignItems: 'center', justifyContent: 'center' },
  soulAvatarIcon: { fontSize: 28, color: theme.gold },
  soulTraits: { flex: 1, gap: 8 },
  traitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  traitLabel: { color: theme.textSecondary, fontSize: 11, fontWeight: '600', width: 90 },
  traitTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  traitFill: { height: '100%', borderRadius: 4 },
  traitVal: { color: theme.text, fontSize: 11, fontWeight: '700', fontFamily: 'monospace', width: 28 },
  vaultHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vaultLock: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: theme.glassSoft, borderWidth: 1, borderColor: theme.border },
  pressed: { opacity: 0.7 },
  vaultLockIcon: { fontSize: 14 },
  vaultLockText: { color: theme.textSecondary, fontSize: 11, fontWeight: '600' },
  vaultBody: { gap: 4 },
  vaultBlurred: { opacity: 0.15 },
  vaultLabel: { color: theme.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  vaultItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  vaultDot: { color: theme.purple, fontSize: 12 },
  vaultItemText: { color: theme.textSecondary, fontSize: 12, fontFamily: 'monospace' },
  vaultHint: { color: theme.textMuted, fontSize: 12, marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
});
