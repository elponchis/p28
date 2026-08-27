import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, Button } from '@/components/primitives';
import { EmptyState } from '@/components/patterns';
import { DesktopContentContainer } from '@/components/layout/DesktopContentContainer';
import { useAuth } from '@/hooks/useAuth';
import { useChatRequestsQuery, useRespondToChatRequestMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { confirm } from '@/lib/dialogs';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

/**
 * Message requests: conversations started by someone the user is not friends with.
 * They are kept out of the main inbox until accepted, so a first message from a
 * group-mate can arrive without a friend request first, and without landing
 * unannounced among the user's real conversations.
 */
export default function MessageRequestsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const router = useRouter();

  const { data: requests = [], isLoading } = useChatRequestsQuery(userId);
  const respondMutation = useRespondToChatRequestMutation();
  const [error, setError] = useState<string | null>(null);
  const [busyChatId, setBusyChatId] = useState<string | null>(null);

  const handleRespond = async (chatId: string, accept: boolean) => {
    if (!userId) return;
    if (!accept) {
      const confirmed = await confirm({
        title: t('messages.declineRequest'),
        message: t('messages.declineRequestConfirm'),
        confirmLabel: t('messages.declineRequest'),
        cancelLabel: t('common.cancel'),
        destructive: true,
      });
      if (!confirmed) return;
    }
    setError(null);
    setBusyChatId(chatId);
    respondMutation.mutate(
      { chatId, userId, accept },
      {
        onSuccess: () => {
          setBusyChatId(null);
          if (accept) router.push(`/messages/chat/${chatId}`);
        },
        onError: (err) => {
          setBusyChatId(null);
          setError(getUserFacingError(err));
        },
      }
    );
  };

  if (!userId) return null;

  if (isLoading && requests.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <DesktopContentContainer maxWidth={600}>
        <Text style={styles.intro}>{t('messages.requestsIntro')}</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {requests.length === 0 ? (
          <EmptyState
            iconName="mail-outline"
            title={t('messages.noRequests')}
            subtitle={t('messages.noRequestsHint')}
          />
        ) : (
          <View style={styles.list}>
            {requests.map((chat) => {
              const name = chat.participantDisplayNames || chat.name || t('common.loading');
              const busy = busyChatId === chat.id;
              return (
                <View key={chat.id} style={styles.card}>
                  <Pressable
                    style={styles.cardHeader}
                    onPress={() => router.push(`/messages/chat/${chat.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                    accessibilityHint={t('messages.openRequestHint')}
                  >
                    <Avatar
                      source={chat.imageUrl ? { uri: chat.imageUrl } : null}
                      fallbackText={name}
                      size="md"
                    />
                    <View style={styles.cardText}>
                      <Text style={styles.name} numberOfLines={1}>
                        {name}
                      </Text>
                      {chat.lastMessagePreview ? (
                        <Text style={styles.preview} numberOfLines={2}>
                          {chat.lastMessagePreview}
                        </Text>
                      ) : null}
                      {chat.lastMessageAt ? (
                        <Text style={styles.meta}>{formatRelativeTime(chat.lastMessageAt)}</Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                  </Pressable>

                  <View style={styles.actions}>
                    <Button
                      title={t('messages.declineRequest')}
                      variant="secondary"
                      onPress={() => handleRespond(chat.id, false)}
                      disabled={busy}
                      fullWidth
                      accessibilityLabel={t('messages.declineRequest')}
                      accessibilityHint={t('messages.declineRequestHint')}
                    />
                    <Button
                      title={t('messages.acceptRequest')}
                      onPress={() => handleRespond(chat.id, true)}
                      disabled={busy}
                      fullWidth
                      accessibilityLabel={t('messages.acceptRequest')}
                      accessibilityHint={t('messages.acceptRequestHint')}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </DesktopContentContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: { padding: spacing.screenHorizontal, paddingBottom: spacing.xxl },
  intro: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardText: { flex: 1, minWidth: 0 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  preview: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  meta: { ...typography.caption, color: colors.onSurfaceVariant, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.body, color: colors.textPrimary },
});
