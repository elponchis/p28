import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import { useAuth } from '@/hooks/useAuth';
import {
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useReceivedFriendRequestsQuery,
} from '@/hooks/useApiQueries';
import type { FriendRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { colors, radius, shadow, spacing, typography } from '@/theme/tokens';

export default function FriendRequestsScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';
  const router = useRouter();

  const { data: requests, isLoading, refetch } = useReceivedFriendRequestsQuery(userId);

  const acceptMutation = useAcceptFriendRequestMutation();
  const declineMutation = useDeclineFriendRequestMutation();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const handleAccept = useCallback(
    (request: FriendRequest) => {
      acceptMutation.mutate({
        requestId: request.id,
        receiverId: userId,
        senderId: request.senderId,
      });
    },
    [userId, acceptMutation]
  );

  const handleDecline = useCallback(
    (request: FriendRequest) => {
      declineMutation.mutate({
        requestId: request.id,
        receiverId: userId,
        senderId: request.senderId,
      });
    },
    [userId, declineMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: FriendRequest }) => {
      const isPending = acceptMutation.isPending || declineMutation.isPending;

      return (
        <View style={styles.card}>
          <Pressable
            style={styles.userRow}
            onPress={() => router.push(`/profile/${item.senderId}`)}
            accessibilityLabel={item.senderDisplayName ?? t('notifications.userProfile')}
            accessibilityRole="button"
          >
            <Avatar
              source={item.senderAvatarUrl ? { uri: item.senderAvatarUrl } : null}
              fallbackText={item.senderDisplayName}
              size="md"
              accessibilityLabel={
                item.senderDisplayName
                  ? `${item.senderDisplayName} ${t('notifications.profilePictureOf')}`
                  : t('notifications.profilePicture')
              }
            />
            <View style={styles.userInfo}>
              <Text style={styles.displayName} numberOfLines={1}>
                {item.senderDisplayName ?? t('notifications.unknownUser')}
              </Text>
              <Text style={styles.timestamp}>{formatRelativeTime(item.createdAt)}</Text>
            </View>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              onPress={() => handleAccept(item)}
              style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}
              disabled={isPending}
              accessibilityLabel={t('friends.acceptRequest')}
              accessibilityHint={t('friends.acceptRequestHint')}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={18} color={colors.surface} />
              <Text style={styles.acceptText}>{t('friends.acceptRequest')}</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDecline(item)}
              style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}
              disabled={isPending}
              accessibilityLabel={t('friends.declineRequest')}
              accessibilityHint={t('friends.declineRequestHint')}
              accessibilityRole="button"
            >
              <Text style={styles.declineText}>{t('friends.declineRequest')}</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [handleAccept, handleDecline, acceptMutation.isPending, declineMutation.isPending, router]
  );

  if (isLoading && !requests) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel={t('common.loading')}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.listContent,
        (!requests || requests.length === 0) && styles.centered,
      ]}
      data={requests ?? []}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.ink300} />
          <Text style={styles.emptyTitle}>{t('notifications.noRequests')}</Text>
          <Text style={styles.emptySubtitle}>{t('notifications.noRequestsSubtitle')}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    shadowColor: colors.shadow,
    shadowOffset: shadow.cardSoft.shadowOffset,
    shadowOpacity: shadow.cardSoft.shadowOpacity,
    shadowRadius: shadow.cardSoft.shadowRadius,
    elevation: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  acceptText: {
    ...typography.label,
    color: colors.surface,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.button,
  },
  declineText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
