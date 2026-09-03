import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar, avatarFallbackInitial, StackedAvatars } from '@/components/primitives';
import { EmptyState } from '@/components/patterns/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import {
  useChatRequestsQuery,
  useChatsForUserQuery,
  useSearchProfilesQuery,
} from '@/hooks/useApiQueries';
import type { Chat } from '@/lib/api';
import { formatRelativeTime } from '@/lib/dates';
import { t } from '@/lib/i18n';
import {
  colors,
  fontFamily,
  radius,
  shadow,
  spacing,
  typography,
  tabScreenContent,
} from '@/theme/tokens';

const CHAT_AVATAR_SIZE = 56;

function ChatAvatar({
  imageUrl,
  fallbackText,
}: {
  imageUrl?: string | null;
  fallbackText: string;
}) {
  const initial = avatarFallbackInitial(fallbackText);

  return (
    <View style={avatarStyles.wrapper}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={avatarStyles.image}
          contentFit="cover"
          accessibilityRole="image"
        />
      ) : (
        <View style={[avatarStyles.image, avatarStyles.fallback]}>
          {initial ? <Text style={avatarStyles.fallbackText}>{initial}</Text> : null}
        </View>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrapper: {
    width: CHAT_AVATAR_SIZE,
    height: CHAT_AVATAR_SIZE,
    position: 'relative',
  },
  image: {
    width: CHAT_AVATAR_SIZE,
    height: CHAT_AVATAR_SIZE,
    borderRadius: CHAT_AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: CHAT_AVATAR_SIZE * 0.36,
    color: colors.primary,
  },
});

function ChatRow({
  chat,
  currentUserId,
  onPress,
}: {
  chat: Chat;
  currentUserId: string;
  onPress: () => void;
}) {
  const otherMembers = (chat.members ?? []).filter((m) => m.userId && m.userId !== currentUserId);
  const hasOtherMembers = otherMembers.length > 0;
  const isGroupChat = otherMembers.length > 1;
  const unread = (chat.unreadCount ?? 0) > 0;

  const displayName =
    chat.name?.trim() ||
    chat.participantDisplayNames ||
    (hasOtherMembers
      ? otherMembers.map((m) => m.displayName ?? t('common.loading')).join(', ')
      : t('messages.lastMessage'));

  const firstOtherMember = otherMembers[0];
  const avatarUrl = chat.imageUrl || firstOtherMember?.avatarUrl;
  const fallbackText = displayName?.slice(0, 2) ?? '?';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        unread && styles.chatRowUnread,
        pressed && styles.chatRowPressed,
      ]}
      accessibilityLabel={displayName}
      accessibilityHint={t('messages.lastMessage')}
      accessibilityRole="button"
    >
      {isGroupChat && !chat.imageUrl ? (
        <StackedAvatars
          members={chat.members ?? []}
          excludeUserId={currentUserId}
          maxCount={3}
          size="lg"
          ringed
        />
      ) : (
        <ChatAvatar imageUrl={avatarUrl} fallbackText={fallbackText} />
      )}

      <View style={styles.chatRowContent}>
        <View style={styles.chatRowHeader}>
          <Text style={[styles.chatName, !unread && styles.chatNameSecondary]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.chatRowMeta}>
            {chat.lastMessageAt && (
              <Text style={[styles.chatTime, unread && styles.chatTimeUnread]}>
                {formatRelativeTime(chat.lastMessageAt)}
              </Text>
            )}
            {unread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {chat.unreadCount! > 99 ? '99+' : chat.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
        {chat.lastMessagePreview ? (
          <Text style={[styles.chatPreview, unread && styles.chatPreviewUnread]} numberOfLines={1}>
            {chat.lastMessagePreview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function MessagesIndexScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [searchQuery, setSearchQuery] = useState('');
  // Searching people used to mean leaving this screen for the friends list first.
  // The same box now finds them here, so a profile is one tap from the tab you land on.
  const [debouncedPeopleSearch, setDebouncedPeopleSearch] = useState('');
  const peopleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (peopleDebounceRef.current) clearTimeout(peopleDebounceRef.current);
    peopleDebounceRef.current = setTimeout(() => {
      setDebouncedPeopleSearch(searchQuery.trim());
    }, 200);
    return () => {
      if (peopleDebounceRef.current) clearTimeout(peopleDebounceRef.current);
    };
  }, [searchQuery]);

  const { data: chats = [], isLoading, refetch } = useChatsForUserQuery(userId);
  const { data: chatRequests = [] } = useChatRequestsQuery(userId);
  const { data: peopleResults = [], isFetching: isSearchingPeople } = useSearchProfilesQuery(
    debouncedPeopleSearch,
    userId,
    { enabled: debouncedPeopleSearch.length >= 1 }
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleCreateChat = useCallback(() => {
    // The new-chat screen, not a one-friend sheet: a group has to be reachable from the first
    // step, rather than by starting a private chat with someone and inviting people into it.
    router.push('/messages/create');
  }, [router]);

  const handleOpenFriends = useCallback(() => {
    router.push('/messages/friends');
  }, [router]);

  const sortedChats = useMemo(
    () =>
      [...chats].sort((a, b) => {
        const aTime = a.lastMessageAt ?? a.createdAt;
        const bTime = b.lastMessageAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }),
    [chats]
  );

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return sortedChats;
    const q = searchQuery.toLowerCase().trim();
    return sortedChats.filter((chat) => {
      const name = (
        chat.name ||
        chat.participantDisplayNames ||
        chat.members?.map((m) => m.displayName).join(' ') ||
        ''
      ).toLowerCase();
      const preview = (chat.lastMessagePreview ?? '').toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [sortedChats, searchQuery]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.heading}>{t('messages.conversations')}</Text>
          <Pressable
            onPress={() => router.push('/messages/requests')}
            accessibilityLabel={t('messages.requestsTitle')}
            accessibilityHint={t('messages.requestsHint')}
            hitSlop={8}
            style={styles.friendsButton}
          >
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.6 : 1 }}>
                <Ionicons name="mail-outline" size={24} color={colors.primary} />
                {chatRequests.length > 0 ? (
                  <View style={styles.requestBadge}>
                    <Text style={styles.requestBadgeText}>
                      {chatRequests.length > 9 ? '9+' : String(chatRequests.length)}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={handleOpenFriends}
            accessibilityLabel={t('messages.friendsList')}
            accessibilityHint={t('messages.friendsListHint')}
            hitSlop={8}
            style={styles.friendsButton}
          >
            {({ pressed }) => (
              <Ionicons
                name="people-outline"
                size={24}
                color={colors.primary}
                style={{ opacity: pressed ? 0.6 : 1 }}
              />
            )}
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.onSurfaceVariant}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t('messages.searchPlaceholder')}
            placeholderTextColor={`${colors.onSurfaceVariant}99`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityLabel={t('messages.searchPlaceholder')}
          />
        </View>
      </View>
    ),
    [searchQuery, handleOpenFriends, router, chatRequests.length]
  );

  const renderPeopleResults = useCallback(() => {
    if (!searchQuery.trim()) return null;
    return (
      <View style={styles.peopleSection}>
        <Text style={styles.peopleHeading}>{t('messages.otherPeopleSection')}</Text>
        {peopleResults.length === 0 ? (
          <Text style={styles.peopleEmpty}>
            {isSearchingPeople ? t('common.loading') : t('messages.noSearchResults')}
          </Text>
        ) : (
          peopleResults.map((person) => {
            const name =
              person.displayName ||
              [person.firstName, person.lastName].filter(Boolean).join(' ').trim() ||
              t('common.loading');
            return (
              <Pressable
                key={person.userId}
                onPress={() => router.push(`/profile/${person.userId}`)}
                style={({ pressed }) => [styles.personRow, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityHint={t('messages.viewProfileHint')}
              >
                <Avatar
                  source={person.avatarUrl ? { uri: person.avatarUrl } : null}
                  fallbackText={name}
                  size="md"
                />
                <Text style={styles.personName} numberOfLines={1}>
                  {name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            );
          })
        )}
      </View>
    );
  }, [searchQuery, peopleResults, isSearchingPeople, router]);

  if (!userId) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.contentMaxWidth, tabScreenContent]}>
        {isLoading ? (
          <>
            {renderHeader()}
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </>
        ) : filteredChats.length === 0 ? (
          <ScrollView keyboardShouldPersistTaps="handled">
            {renderHeader()}
            {searchQuery.trim() ? null : (
              <View style={styles.emptyWrap}>
                <EmptyState
                  iconName="chatbubbles-outline"
                  title={t('messages.noChats')}
                  subtitle={t('messages.noChatsSubtitle')}
                />
              </View>
            )}
            {renderPeopleResults()}
          </ScrollView>
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(c) => c.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderPeopleResults}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <ChatRow
                chat={item}
                currentUserId={userId}
                onPress={() => router.push(`/messages/chat/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* FAB — New message */}
      <Pressable
        onPress={handleCreateChat}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 80 },
          pressed && styles.fabPressed,
        ]}
        accessibilityLabel={t('messages.newChat')}
        accessibilityHint={t('messages.newChatHint')}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={24} color={colors.onSecondaryContainer} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentMaxWidth: {
    flex: 1,
  },

  // ── List header (heading + search) ──
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: {
    fontFamily: fontFamily.serifBold,
    fontSize: 30,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  friendsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleSection: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  peopleHeading: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  peopleEmpty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  personName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  requestBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBadgeText: {
    ...typography.micro,
    color: colors.onPrimary,
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: colors.onSurface,
    paddingVertical: 14,
  },

  // ── Chat rows ──
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.cardPadding,
    gap: spacing.md,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xs,
  },
  chatRowUnread: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    ...shadow.cardSoft,
    shadowColor: colors.shadow,
  },
  chatRowPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  chatRowContent: {
    flex: 1,
    minWidth: 0,
  },
  chatRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  chatRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatName: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  chatNameSecondary: {
    opacity: 0.8,
  },
  chatTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontFamily: fontFamily.sansSemiBold,
  },
  chatPreview: {
    ...typography.bodyMd,
    color: `${colors.onSurfaceVariant}B3`,
  },
  chatPreviewUnread: {
    fontFamily: fontFamily.sansMedium,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },

  // ── Empty / loading ──
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.lg,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
    shadowColor: colors.shadow,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.9 }],
  },
});
