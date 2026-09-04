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

/**
 * Cap on the embed's width inside a message.
 *
 * VideoEmbedPlayer fills its container, which is right for a lesson page but
 * turns a pasted link into a hero player inside a chat bubble or a reply card —
 * on desktop the card is 600px wide, so the embed dwarfed the message it came
 * with. Wide enough to keep the provider's controls usable, and clearly a
 * preview rather than the main event.
 */
const MESSAGE_EMBED_MAX_WIDTH = 280;

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xs,
    width: '100%',
    maxWidth: MESSAGE_EMBED_MAX_WIDTH,
  },
});
