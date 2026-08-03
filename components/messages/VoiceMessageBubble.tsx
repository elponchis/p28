import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { t } from '@/lib/i18n';
import { colors, spacing, fontFamily } from '@/theme/tokens';

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface VoiceMessageBubbleProps {
  url: string;
  durationSec?: number;
  isOwnMessage: boolean;
}

/** Compact inline voice-message player used inside a chat bubble. */
export function VoiceMessageBubble({ url, durationSec, isOwnMessage }: VoiceMessageBubbleProps) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    return () => {
      player.pause();
    };
  }, [player]);

  const isPlaying = status.playing;
  const total = status.duration > 0 ? status.duration : (durationSec ?? 0);
  const current = status.currentTime ?? 0;
  const progress = total > 0 ? Math.min(1, current / total) : 0;
  const remainingLabel = isPlaying ? formatTime(Math.max(0, total - current)) : formatTime(total);

  const handleToggle = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (total > 0 && current >= total - 0.05)) {
      void player.seekTo(0);
    }
    player.play();
  };

  return (
    <Pressable
      onPress={handleToggle}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={
        isPlaying ? t('attachments.pauseVoiceMessage') : t('attachments.playVoiceMessage')
      }
    >
      <Ionicons
        name={isPlaying ? 'pause-circle' : 'play-circle'}
        size={32}
        color={isOwnMessage ? colors.onPrimary : colors.primary}
      />
      <View style={styles.trackCol}>
        <View style={[styles.track, isOwnMessage && styles.trackOwn]}>
          <View
            style={[
              styles.trackFill,
              isOwnMessage && styles.trackFillOwn,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        <Text style={[styles.durationText, isOwnMessage && styles.durationTextOwn]}>
          {remainingLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 180,
    paddingVertical: spacing.xs,
  },
  trackCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  trackOwn: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  trackFillOwn: {
    backgroundColor: colors.onPrimary,
  },
  durationText: {
    fontFamily: fontFamily.sans,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  durationTextOwn: {
    color: 'rgba(255,255,255,0.75)',
  },
});
