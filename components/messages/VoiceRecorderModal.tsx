import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography, fontFamily } from '@/theme/tokens';

const MAX_RECORDING_SEC = 5 * 60;

function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface VoiceRecorderModalProps {
  visible: boolean;
  onRequestClose: () => void;
  /** Called with the local recording URI, duration, and content type once the user taps send. */
  onRecorded: (localUri: string, durationSec: number, mimeType: string) => void;
}

/** Tap-to-open, records immediately, then Cancel (discard) or Send (attach). Chat-only. */
export function VoiceRecorderModal({
  visible,
  onRequestClose,
  onRecorded,
}: VoiceRecorderModalProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [preparing, setPreparing] = useState(false);
  const startedRef = useRef(false);
  const autoSentRef = useRef(false);

  const handleCancel = async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      /* best-effort cleanup */
    }
    onRequestClose();
  };

  const handleSend = async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
      const uri = recorder.uri;
      const durationSec = Math.round(state.durationMillis / 1000);
      if (uri && durationSec > 0) {
        const mimeType = Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a';
        onRecorded(uri, durationSec, mimeType);
      }
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      onRequestClose();
    }
  };

  useEffect(() => {
    if (!visible) {
      startedRef.current = false;
      autoSentRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      setPreparing(true);
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          if (!cancelled) {
            Alert.alert(t('common.error'), t('attachments.micPermissionRequired'));
            onRequestClose();
          }
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        if (cancelled) return;
        await recorder.prepareToRecordAsync();
        if (cancelled) return;
        recorder.record();
      } catch {
        if (!cancelled) {
          Alert.alert(t('common.error'), t('common.error'));
          onRequestClose();
        }
      } finally {
        if (!cancelled) setPreparing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recorder identity is stable per mount; only re-run on visibility change
  }, [visible]);

  useEffect(() => {
    if (
      !autoSentRef.current &&
      state.isRecording &&
      state.durationMillis / 1000 >= MAX_RECORDING_SEC
    ) {
      autoSentRef.current = true;
      void handleSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-check when duration/isRecording change
  }, [state.durationMillis, state.isRecording]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.recIndicatorRow}>
            <View style={styles.recDot} />
            <Text style={styles.recLabel}>
              {preparing
                ? t('attachments.voiceRecorderPreparing')
                : t('attachments.voiceRecorderRecording')}
            </Text>
          </View>
          <Text style={styles.timer} accessibilityLiveRegion="polite">
            {formatTimer(state.durationMillis)}
          </Text>
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleCancel}
              style={[styles.actionButton, styles.cancelButton]}
              accessibilityLabel={t('common.cancel')}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={26} color={colors.onSurfaceVariant} />
            </Pressable>
            <Pressable
              onPress={handleSend}
              disabled={preparing}
              style={[styles.actionButton, styles.sendButton, preparing && styles.buttonDisabled]}
              accessibilityLabel={t('attachments.voiceRecorderSend')}
              accessibilityHint={t('attachments.voiceRecorderSendHint')}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={26} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  recIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  recLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  timer: {
    fontFamily: fontFamily.serif,
    fontSize: 40,
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  sendButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
