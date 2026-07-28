import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/primitives';
import { AddFriendButton } from '@/components/patterns/AddFriendButton';
import { FadeActionSheet } from '@/components/patterns/FadeActionSheet';
import { useAuth } from '@/hooks/useAuth';
import {
  useAreFriendsQuery,
  useCreateChatMutation,
  useProfileQuery,
  useRemoveFriendMutation,
} from '@/hooks/useApiQueries';
import { api, getUserFacingError } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import { preferredLanguageDisplayLabel, t } from '@/lib/i18n';
import { avatarSizes, colors, radius, spacing, typography } from '@/theme/tokens';

const cardStyle = {
  backgroundColor: colors.surfaceContainerLow,
  borderRadius: radius.card,
  padding: spacing.cardPadding,
  marginBottom: spacing.cardGap,
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const isOwnProfile = !!session?.user?.id && userId === session.user.id;

  const { data: profile, isLoading, isError, error, refetch } = useProfileQuery(userId);
  const currentUserId = session?.user?.id ?? '';
  const { data: areFriends } = useAreFriendsQuery(currentUserId, userId);
  const removeFriendMutation = useRemoveFriendMutation();
  const createChatMutation = useCreateChatMutation();

  const [friendsSheetVisible, setFriendsSheetVisible] = useState(false);

  const handleOpenFriendsSheet = useCallback(() => {
    setFriendsSheetVisible(true);
  }, []);

  const handleCloseFriendsSheet = useCallback(() => {
    setFriendsSheetVisible(false);
  }, []);

  const handleUnfriend = useCallback(() => {
    if (!currentUserId || !userId) return;
    removeFriendMutation.mutate({ userId: currentUserId, friendId: userId });
  }, [currentUserId, userId, removeFriendMutation]);

  const handleStartChat = useCallback(async () => {
    if (!currentUserId || !userId) return;
    const pushToChat = (chatId: string) => {
      // withAnchor ensures the messages stack includes index so back button works
      router.push(`/messages/chat/${chatId}`, { withAnchor: true } as object);
    };
    try {
      const existing = await api.data.findExisting1on1Chat(currentUserId, userId);
      if (existing && !('message' in existing)) {
        pushToChat(existing.id);
      } else {
        createChatMutation.mutate(
          { userId: currentUserId, input: { memberUserIds: [userId] } },
          {
            onSuccess: (chat) => pushToChat(chat.id),
            onError: (err) => {
              const msg = getUserFacingError(err);
              Alert.alert(t('common.error'), msg);
            },
          }
        );
      }
    } catch (err) {
      const msg = getUserFacingError(err as ApiError);
      Alert.alert(t('common.error'), msg);
    }
  }, [currentUserId, userId, router, createChatMutation]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const errorMessage = isError && error && 'message' in error ? getUserFacingError(error) : null;

  const showBio = areFriends === true;

  if (!userId) {
    router.back();
    return null;
  }

  if (isOwnProfile) {
    router.replace('/(tabs)/profile');
    return null;
  }

  if (isLoading && !profile) {
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(250)} style={styles.animatedContent}>
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <Avatar
            source={profile?.avatarUrl ? { uri: profile.avatarUrl } : null}
            fallbackText={profile?.displayName}
            size="xl"
            accessibilityLabel={
              profile?.displayName
                ? `${profile.displayName} ${t('groups.profilePicture')}`
                : t('profile.profilePhoto')
            }
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>{profile?.displayName ?? t('profile.title')}</Text>
            {currentUserId && userId ? (
              areFriends ? (
                <View style={styles.friendActionsRow}>
                  <Pressable
                    onPress={handleOpenFriendsSheet}
                    style={({ pressed }) => [
                      styles.friendsButton,
                      pressed && styles.friendsButtonPressed,
                    ]}
                    disabled={removeFriendMutation.isPending}
                    accessibilityLabel={t('friends.friends')}
                    accessibilityHint={t('groups.opensOptions')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="people-outline" size={18} color={colors.textPrimary} />
                    <Text style={styles.friendsButtonText} numberOfLines={1} ellipsizeMode="tail">
                      {t('friends.friends')}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    onPress={handleStartChat}
                    style={({ pressed }) => [
                      styles.messageButton,
                      pressed && styles.messageButtonPressed,
                    ]}
                    disabled={createChatMutation.isPending}
                    accessibilityLabel={t('friends.startChat')}
                    accessibilityHint={t('friends.startChatHint')}
                    accessibilityRole="button"
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={colors.onPrimary} />
                    <Text
                      style={styles.messageButtonText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {t('friends.startChat')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <AddFriendButton
                  currentUserId={currentUserId}
                  targetUserId={userId}
                  displayName={profile?.displayName}
                />
              )
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.about')}</Text>
          <View style={styles.aboutFields}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('profile.displayName')}</Text>
              <Text style={styles.rowValue}>{profile?.displayName ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('profile.email')}</Text>
              <Text style={styles.rowValue}>{profile?.email ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('profile.country')}</Text>
              <Text style={styles.rowValue}>{profile?.country ?? '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('profile.preferredLanguage')}</Text>
              <Text style={styles.rowValue}>
                {preferredLanguageDisplayLabel(profile?.preferredLanguage)}
              </Text>
            </View>
          </View>
        </View>

        <FadeActionSheet
          visible={friendsSheetVisible}
          onRequestClose={handleCloseFriendsSheet}
          options={[
            {
              icon: 'person-remove-outline',
              label: t('friends.unfriend'),
              onPress: handleUnfriend,
              destructive: true,
              accessibilityHint: t('friends.removeFriendHint'),
            },
          ]}
        />

        {showBio && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('profile.bio')}</Text>
            <Text style={styles.bio}>{profile?.bio ?? ''}</Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  animatedContent: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flex: 1, minHeight: avatarSizes.xl },
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  friendActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.button,
  },
  friendsButtonPressed: {
    opacity: 0.8,
  },
  friendsButtonText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
  },
  messageButtonPressed: {
    opacity: 0.8,
  },
  messageButtonText: {
    ...typography.label,
    color: colors.onPrimary,
    flex: 1,
    minWidth: 0,
  },
  card: { ...cardStyle },
  cardTitle: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  aboutFields: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowLabel: { ...typography.caption, color: colors.textSecondary },
  rowValue: {
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'right' as const,
    flexShrink: 1,
  },
  bio: { ...typography.body, color: colors.textSecondary },
  centered: { justifyContent: 'center', alignItems: 'center' },
  errorBanner: {
    backgroundColor: colors.accentSoft,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.button,
  },
  errorText: { ...typography.body, color: colors.error },
});
