import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, onConfirm, onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.btn, destructive ? styles.btnDanger : styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,13,18,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#0B0D12', marginBottom: 8 },
  message: { fontSize: 14, color: '#5C6472', lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  btnGhost: { backgroundColor: '#F7F8FA' },
  btnPrimary: { backgroundColor: '#6366F1' },
  btnDanger: { backgroundColor: '#EF4444' },
  btnGhostText: { fontSize: 14, fontWeight: '600', color: '#5C6472' },
  btnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});
