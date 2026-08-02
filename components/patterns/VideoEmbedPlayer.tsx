import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { parseVideoEmbedUrl } from '@/lib/videoEmbed';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

// react-native-webview has no web target; guarding the require behind a runtime check
// (rather than `import`) means it's never invoked on web, so Metro's web bundle never
// executes its native-module bindings — it only needs to resolve, not run, on that platform.
const WebView: typeof import('react-native-webview').WebView | null =
  Platform.OS === 'web' ? null : require('react-native-webview').WebView;

interface VideoEmbedPlayerProps {
  videoUrl: string;
  accessibilityLabel?: string;
}

/** Embeds a YouTube/Vimeo lesson video: an <iframe> on web, a WebView on native. */
export function VideoEmbedPlayer({ videoUrl, accessibilityLabel }: VideoEmbedPlayerProps) {
  const embed = parseVideoEmbedUrl(videoUrl);

  if (!embed) {
    return (
      <View
        style={[styles.container, styles.unsupported]}
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={styles.unsupportedText}>{t('lessons.unsupportedVideoUrl')}</Text>
      </View>
    );
  }

  return Platform.select({
    web: () => (
      <View style={styles.container} accessibilityLabel={accessibilityLabel}>
        {React.createElement('iframe', {
          src: embed.embedUrl,
          style: { width: '100%', height: '100%', border: 'none' },
          allow:
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          allowFullScreen: true,
          title: accessibilityLabel ?? embed.embedUrl,
        })}
      </View>
    ),
    default: () => (
      <View style={styles.container} accessibilityLabel={accessibilityLabel}>
        {WebView ? (
          <WebView
            source={{ uri: embed.embedUrl }}
            style={styles.webview}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
          />
        ) : null}
      </View>
    ),
  })();
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  unsupported: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  unsupportedText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
