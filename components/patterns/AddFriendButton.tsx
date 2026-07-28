import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { IconButton } from '@/components/primitives';
import { FadeActionSheet } from '@/components/patterns/FadeActionSheet';
import {
  useAcceptFriendRequestMutation,
  useAreFriendsQuery,
  useCancelFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useFriendRequestBetweenQuery,
  useSendFriendRequestMutation,
} from '@/hooks/useApiQueries';
import { t } from '@/lib/i18n';
import { getUserFacingError } from '@/lib/api';
import { colors, radius, typography, spacing } from '@/theme/tokens';

export interface AddFriendButtonProps {
  currentUserId: string;
  targetUserId: string;
  displayName?: string;
  compact?: boolean;
  onError?: (message: string) => void;
}

export function AddFriendButton({
  currentUserId,
  targetUserId,
  displayName,
  compact = false,
  onError,
}: AddFriendButtonProps) {
  const { data: areFriends, isLoading: friendsLoading } = useAreFriendsQuery(
    currentUserId,
    targetUserId
  );
  const { data: pendingRequest, isLoading: requestLoading } = useFriendRequestBetweenQuery(
    currentUserId,
    targetUserId
  );
  const sendMutation = useSendFriendRequestMutation();
  const cancelMutation = useCancelFriendRequestMutation();
  const acceptMutation = useAcceptFriendRequestMutation();
  const declineMutation = useDeclineFriendRequestMutation();

  const [sheetVisible, setSheetVisible] = useState(false);

  const isPending =
    sendMutation.isPending ||
    cancelMutation.isPending ||
    acceptMutation.isPending ||
    declineMutation.isPending;

  const handleSend = useCallback(() => {
    sendMutation.mutate(
      { senderId: currentUserId, receiverId: targetUserId },
      {
        onError: (err) => {
          const msg = getUserFacingError(err);
          onError?.(msg);
          if (!onError) {
            Alert.alert(t('common.error'), msg);
          }
        },
      }
    );
  }, [currentUserId, targetUserId, sendMutation, onError]);

  const handleCancel = useCallback(() => {
    if (!pendingRequest) return;
    cancelMutation.mutate(
      {
        requestId: pendingRequest.id,
        senderId: pendingRequest.senderId,
        receiverId: pendingRequest.receiverId,
      },
      {
        onError: (err) => {
          onError?.(getUserFacingError(err));
        },
      }
    );
  }, [pendingRequest, cancelMutation, onError]);

  const handleAccept = useCallback(() => {
    if (!pendingRequest) return;
    acceptMutation.mutate(
      {
        requestId: pendingRequest.id,
        receiverId: currentUserId,
        senderId: pendingRequest.senderId,
      },
      {
        onError: (err) => {
          onError?.(getUserFacingError(err));
        },
      }
    );
  }, [pendingRequest, currentUserId, acceptMutation, onError]);

  const handleDecline = useCallback(() => {
    if (!pendingRequest) return;
    declineMutation.mutate(
      {
        requestId: pendingRequest.id,
        receiverId: currentUserId,
        senderId: pendingRequest.senderId,
      },
      {
        onError: (err) => {
          onError?.(getUserFacingError(err));
        },
      }
    );
  }, [pendingRequest, currentUserId, declineMutation, onError]);

  if (currentUserId === targetUserId) return null;

  if (friendsLoading || requestLoading) {
    return (
      <View style={[styles.wrapper, compact && styles.compactWrapper]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (areFriends) return null;

  const wrapperStyle = [
    styles.wrapper,
    compact && styles.compactWrapper,
    isPending && styles.disabled,
  ];

  const isSentByMe = pendingRequest?.senderId === currentUserId;
  const isReceivedByMe = pendingRequest?.receiverId === currentUserId;

  // Current user sent a request → show "Friend Requested" button
  if (pendingRequest && isSentByMe) {
    if (compact) {
      return (
        <View style={wrapperStyle} pointerEvents={isPending ? 'none' : 'auto'}>
          <IconButton
            name="time-outline"
            onPress={() => setSheetVisible(true)}
            size={20}
            color={colors.ink500}
            accessibilityLabel={t('friends.friendRequested')}
            accessibilityHint={t('friends.friendRequestedHint')}
          />
          <FadeActionSheet
            visible={sheetVisible}
            onRequestClose={() => setSheetVisible(false)}
            options={[
              {
                icon: 'close-circle-outline',
                label: t('friends.cancelRequest'),
                onPress: handleCancel,
                destructive: true,
                accessibilityHint: t('friends.cancelRequestHint'),
              },
            ]}
          />
        </View>
      );
    }

    return (
      <View style={wrapperStyle} pointerEvents={isPending ? 'none' : 'auto'}>
        <Pressable
          onPress={() => setSheetVisible(true)}
          style={({ pressed }) => [styles.requestedButton, pressed && styles.buttonPressed]}
          disabled={isPending}
          accessibilityLabel={t('friends.friendRequested')}
          accessibilityHint={t('friends.friendRequestedHint')}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={18} color={colors.ink500} />
          <Text style={styles.requestedButtonText}>{t('friends.friendRequested')}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.ink500} />
        </Pressable>
        <FadeActionSheet
          visible={sheetVisible}
          onRequestClose={() => setSheetVisible(false)}
          options={[
            {
              icon: 'close-circle-outline',
              label: t('friends.cancelRequest'),
              onPress: handleCancel,
              destructive: true,
              accessibilityHint: t('friends.cancelRequestHint'),
            },
          ]}
        />
      </View>
    );
  }

  // Current user received a request → show Accept / Decline
  if (pendingRequest && isReceivedByMe) {
    if (compact) {
      return (
        <View
          style={[wrapperStyle, styles.compactActions]}
          pointerEvents={isPending ? 'none' : 'auto'}
        >
          <IconButton
            name="checkmark-circle-outline"
            onPress={handleAccept}
            size={20}
            color={colors.success}
            accessibilityLabel={t('friends.acceptRequest')}
            accessibilityHint={t('friends.acceptRequestHint')}
          />
          <IconButton
            name="close-circle-outline"
            onPress={handleDecline}
            size={20}
            color={colors.error}
            accessibilityLabel={t('friends.declineRequest')}
            accessibilityHint={t('friends.declineRequestHint')}
          />
        </View>
      );
    }

    return (
      <View style={wrapperStyle} pointerEvents={isPending ? 'none' : 'auto'}>
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleAccept}
            style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}
            disabled={isPending}
            accessibilityLabel={t('friends.acceptRequest')}
            accessibilityHint={t('friends.acceptRequestHint')}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={18} color={colors.surface} />
            <Text style={styles.acceptButtonText}>{t('friends.acceptRequest')}</Text>
          </Pressable>
          <Pressable
            onPress={handleDecline}
            style={({ pressed }) => [styles.declineButton, pressed && styles.buttonPressed]}
            disabled={isPending}
            accessibilityLabel={t('friends.declineRequest')}
            accessibilityHint={t('friends.declineRequestHint')}
            accessibilityRole="button"
          >
            <Text style={styles.declineButtonText}>{t('friends.declineRequest')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // No relationship → show "Add friend"
  if (compact) {
    return (
      <View style={wrapperStyle} pointerEvents={isPending ? 'none' : 'auto'}>
        <IconButton
          name="person-add-outline"
          onPress={handleSend}
          size={20}
          color={colors.primary}
          accessibilityLabel={
            displayName ? `${t('friends.addFriend')}: ${displayName}` : t('friends.addFriend')
          }
          accessibilityHint={t('friends.addFriendHint')}
        />
      </View>
    );
  }

  return (
    <View style={wrapperStyle} pointerEvents={isPending ? 'none' : 'auto'}>
      <Pressable
        onPress={handleSend}
        style={({ pressed }) => [styles.addButton, pressed && styles.buttonPressed]}
        disabled={isPending}
        accessibilityLabel={
          displayName ? `${t('friends.addFriend')}: ${displayName}` : t('friends.addFriend')
        }
        accessibilityHint={t('friends.addFriendHint')}
        accessibilityRole="button"
      >
        <Ionicons name="person-add-outline" size={18} color={colors.primary} />
        <Text style={styles.addButtonText}>{t('friends.addFriend')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  compactWrapper: {
    alignSelf: 'center',
  },
  compactActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.button,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    ...typography.label,
    color: colors.primary,
  },
  requestedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.button,
  },
  requestedButtonText: {
    ...typography.label,
    color: colors.ink500,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  acceptButtonText: {
    ...typography.label,
    color: colors.onPrimary,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.button,
  },
  declineButtonText: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
