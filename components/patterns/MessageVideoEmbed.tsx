import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { VideoEmbedPlayer } from '@/components/patterns/VideoEmbedPlayer';
import { firstEmbeddableVideoUrl } from '@/lib/videoEmbed';
import { spacing } from '@/theme/tokens';

interface MessageVideoEmbedProps {
  /** The message body to scan for a video link. */
  body?: string | null;
  accessibilityLabel?: string;
}

/**
 * Renders a player for the first YouTube/Vimeo link in a message.
 *
 * Message bodies are plain text, so a pasted link would otherwise sit there
 * inert. This also sidesteps the codec problem entirely: a video hosted on
 * YouTube plays for every viewer, whatever the original recording's codec was.
 *
 * Renders nothing when the body has no embeddable link.
 */
export function MessageVideoEmbed({ body, accessibilityLabel }: MessageVideoEmbedProps) {
  const videoUrl = useMemo(() => firstEmbeddableVideoUrl(body), [body]);
  if (!videoUrl) return null;
  return (
    <View style={styles.wrap}>
      <VideoEmbedPlayer videoUrl={videoUrl} accessibilityLabel={accessibilityLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
  },
});
