/**
 * React Query hooks wrapping api.data calls. All server state flows through these hooks.
 * Keeps the facade as the boundary; hooks add caching, deduplication, and invalidation.
 */
import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, isApiError } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import type {
  Announcement,
  ChatMessage,
  CreateChatMessageInput,
  CreateDiscussionPostInput,
  CreateGroupInput,
  DiscussionPost,
  EventRsvpResponse,
  Group,
  GroupType,
  NotificationPreferencesUpdates,
  OnboardingProfileData,
  PostReactionType,
  Profile,
  ProfileUpdates,
  UpdateGroupInput,
} from '@/lib/api';
import { chatMessagesToSharedContentPlaceholder } from '@/lib/chatSharedContent';
import { mergeUpcomingJoinedGroupEvents } from '@/lib/upcomingJoinedGroupEvents';

/** Throws on ApiError so useQuery gets error state. Returns data otherwise. */
async function queryFn<T>(promise: Promise<T | import('@/lib/api').ApiError>): Promise<T> {
  const result = await promise;
  if (isApiError(result)) {
    throw result;
  }
  return result;
}

function newOptimisticMessageId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return `opt-${c.randomUUID()}`;
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type DiscussionPostWithOutbound = DiscussionPost & {
  outboundStatus?: 'sending' | 'failed';
  outboundRetryPayload?: CreateDiscussionPostInput;
};

type ChatMessageWithOutbound = ChatMessage & {
  outboundStatus?: 'sending' | 'failed';
  outboundRetryPayload?: CreateChatMessageInput;
};

// --- Profile ---

export function useProfileQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => queryFn(api.data.getProfile(userId!)),
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: ProfileUpdates }) =>
      queryFn(api.data.updateProfile(userId, updates)),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
  });
}

export function useCreateProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: OnboardingProfileData }) =>
      queryFn(api.data.createProfile(userId, data)),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
  });
}

export function useUploadProfileImageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      imageUri,
      base64Data,
    }: {
      userId: string;
      imageUri: string;
      base64Data?: string | null;
    }) => queryFn(api.data.uploadProfileImage(userId, imageUri, base64Data)) as Promise<string>,
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
  });
}

// --- Notification preferences ---

export function useNotificationPreferencesQuery(
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.notificationPreferences(userId ?? ''),
    queryFn: () => queryFn(api.data.getNotificationPreferences(userId!)),
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: NotificationPreferencesUpdates;
    }) => queryFn(api.data.updateNotificationPreferences(userId, updates)),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.notificationPreferences(userId) });
    },
  });
}

// --- Groups ---

export function useGroupsQuery(params?: { type?: GroupType; search?: string; enabled?: boolean }) {
  const { type, search, enabled = true } = params ?? {};
  return useQuery({
    queryKey: queryKeys.groups({ type, search: search?.trim() || undefined }),
    queryFn: () =>
      queryFn(api.data.getGroups({ type, search: search?.trim() || undefined })) as Promise<
        import('@/lib/api').Group[]
      >,
    enabled,
  });
}

export function useGroupQuery(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.group(id ?? ''),
    queryFn: () => queryFn(api.data.getGroup(id!)) as Promise<import('@/lib/api').Group>,
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useGroupsForUserQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.groupsForUser(userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupsForUser(userId!)) as Promise<import('@/lib/api').Group[]>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useGroupMembersQuery(groupId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.groupMembers(groupId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupMembers(groupId!)) as Promise<import('@/lib/api').GroupMember[]>,
    enabled: !!groupId && (options?.enabled ?? true),
  });
}

// --- Friendships ---

export function useFriendIdsQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.friendIds(userId ?? ''),
    queryFn: () => queryFn(api.data.getFriendIds(userId!)) as Promise<string[]>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useAreFriendsQuery(
  userId: string | undefined,
  targetUserId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.areFriends(userId ?? '', targetUserId ?? ''),
    queryFn: () => queryFn(api.data.areFriends(userId!, targetUserId!)) as Promise<boolean>,
    enabled: !!userId && !!targetUserId && userId !== targetUserId && (options?.enabled ?? true),
  });
}

export function useAddFriendMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, friendId }: { userId: string; friendId: string }) =>
      queryFn(api.data.addFriend(userId, friendId)),
    onSuccess: (_, { userId, friendId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.friendIds(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.friendIds(friendId) });
      qc.invalidateQueries({ queryKey: queryKeys.areFriends(userId, friendId) });
    },
  });
}

export function useRemoveFriendMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, friendId }: { userId: string; friendId: string }) =>
      queryFn(api.data.removeFriend(userId, friendId)),
    onSuccess: (_, { userId, friendId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.friendIds(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.friendIds(friendId) });
      qc.invalidateQueries({ queryKey: queryKeys.areFriends(userId, friendId) });
    },
  });
}

// --- Friend requests ---

export function useFriendRequestBetweenQuery(
  userId: string | undefined,
  targetUserId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.friendRequestBetween(userId ?? '', targetUserId ?? ''),
    queryFn: () =>
      queryFn(api.data.getFriendRequestBetween(userId!, targetUserId!)) as Promise<
        import('@/lib/api').FriendRequest | null
      >,
    enabled: !!userId && !!targetUserId && userId !== targetUserId && (options?.enabled ?? true),
  });
}

export function useReceivedFriendRequestsQuery(
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.receivedFriendRequests(userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getReceivedFriendRequests(userId!)) as Promise<
        import('@/lib/api').FriendRequest[]
      >,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useSentFriendRequestsQuery(
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.sentFriendRequests(userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getSentFriendRequests(userId!)) as Promise<
        import('@/lib/api').FriendRequest[]
      >,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function usePendingFriendRequestCountQuery(
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.pendingFriendRequestCount(userId ?? ''),
    queryFn: () => queryFn(api.data.getPendingFriendRequestCount(userId!)) as Promise<number>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useInAppNotificationsQuery(
  userId: string | undefined,
  options?: { enabled?: boolean; limit?: number }
) {
  const limit = options?.limit ?? 50;
  return useQuery({
    queryKey: [...queryKeys.inAppNotifications(userId ?? ''), limit] as const,
    queryFn: () =>
      queryFn(api.data.listInAppNotifications(userId!, { limit })) as Promise<
        import('@/lib/api').InAppNotification[]
      >,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useInAppUnreadNotificationCountQuery(
  userId: string | undefined,
  badgeClearedAt: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.inAppUnreadNotificationCount(userId ?? '', badgeClearedAt),
    queryFn: () =>
      queryFn(
        api.data.getUnreadInAppNotificationCount(
          userId!,
          badgeClearedAt ? { createdAfter: badgeClearedAt } : undefined
        )
      ) as Promise<number>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useAppBadgeCountQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.appBadgeCount(userId ?? ''),
    queryFn: () => queryFn(api.data.getAppBadgeCount(userId!)) as Promise<number>,
    enabled: !!userId && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

export function useSetNotificationsBadgeClearedAtMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, clearedAtIso }: { userId: string; clearedAtIso: string }) =>
      queryFn(api.data.setNotificationsBadgeClearedAt(userId, clearedAtIso)),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'inAppUnreadNotificationCount' &&
          q.queryKey[1] === userId,
      });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useMarkInAppNotificationsReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: import('@/lib/api').MarkInAppNotificationsReadInput) =>
      queryFn(api.data.markInAppNotificationsRead(input)),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.inAppNotifications(userId) });
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'inAppUnreadNotificationCount' &&
          q.queryKey[1] === userId,
      });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useSendFriendRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ senderId, receiverId }: { senderId: string; receiverId: string }) =>
      queryFn(api.data.sendFriendRequest(senderId, receiverId)) as Promise<
        import('@/lib/api').FriendRequest
      >,
    onSuccess: (_, { senderId, receiverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.friendRequestBetween(senderId, receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.receivedFriendRequests(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.sentFriendRequests(senderId) });
      qc.invalidateQueries({ queryKey: queryKeys.pendingFriendRequestCount(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(receiverId) });
    },
  });
}

export function useCancelFriendRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      senderId,
      receiverId,
    }: {
      requestId: string;
      senderId: string;
      receiverId: string;
    }) => queryFn(api.data.cancelFriendRequest(requestId)),
    onSuccess: (_, { senderId, receiverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.friendRequestBetween(senderId, receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.receivedFriendRequests(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.sentFriendRequests(senderId) });
      qc.invalidateQueries({ queryKey: queryKeys.pendingFriendRequestCount(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(receiverId) });
    },
  });
}

export function useAcceptFriendRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      receiverId,
    }: {
      requestId: string;
      receiverId: string;
      senderId: string;
    }) => queryFn(api.data.acceptFriendRequest(requestId, receiverId)),
    onSuccess: (_, { senderId, receiverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.friendRequestBetween(senderId, receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.receivedFriendRequests(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.sentFriendRequests(senderId) });
      qc.invalidateQueries({ queryKey: queryKeys.pendingFriendRequestCount(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.friendIds(senderId) });
      qc.invalidateQueries({ queryKey: queryKeys.friendIds(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.areFriends(senderId, receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(receiverId) });
    },
  });
}

export function useDeclineFriendRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      receiverId,
    }: {
      requestId: string;
      receiverId: string;
      senderId: string;
    }) => queryFn(api.data.declineFriendRequest(requestId, receiverId)),
    onSuccess: (_, { senderId, receiverId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.friendRequestBetween(senderId, receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.receivedFriendRequests(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.sentFriendRequests(senderId) });
      qc.invalidateQueries({ queryKey: queryKeys.pendingFriendRequestCount(receiverId) });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(receiverId) });
    },
  });
}

export function useGroupAdminsQuery(groupId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.groupAdmins(groupId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupAdmins(groupId!)) as Promise<import('@/lib/api').GroupAdmin[]>,
    enabled: !!groupId && (options?.enabled ?? true),
  });
}

/** Full `group_admins` table (e.g. super-admin assign). Prefer {@link useGroupAdminsQuery} for community UI. */
export function useGroupAdminsAllQuery(
  groupId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.groupAdminsAll(groupId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupAdminsAll(groupId!)) as Promise<import('@/lib/api').GroupAdmin[]>,
    enabled: !!groupId && (options?.enabled ?? true),
  });
}

/** True if user has a `group_admins` row or is platform `super_admin` (effective admin in every group). */
export function useUserIsGroupAdminQuery(
  groupId: string | undefined,
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.userIsGroupAdmin(groupId ?? '', userId ?? ''),
    queryFn: () => queryFn(api.data.isUserGroupAdmin(groupId!, userId!)) as Promise<boolean>,
    enabled: !!groupId && !!userId && (options?.enabled ?? true),
  });
}

export function useAddGroupAdminMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      queryFn(api.data.addGroupAdmin(groupId, userId)),
    onSuccess: (_data, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupAdmins(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groupAdminsAll(groupId) });
      qc.invalidateQueries({ queryKey: ['userIsGroupAdmin', groupId] });
      qc.invalidateQueries({ queryKey: queryKeys.userIsGroupAdmin(groupId, userId) });
    },
  });
}

export function useRemoveGroupAdminMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      queryFn(api.data.removeGroupAdmin(groupId, userId)),
    onSuccess: (_data, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupAdmins(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groupAdminsAll(groupId) });
      qc.invalidateQueries({ queryKey: ['userIsGroupAdmin', groupId] });
      qc.invalidateQueries({ queryKey: queryKeys.userIsGroupAdmin(groupId, userId) });
    },
  });
}

export function useAnnouncementsQuery(
  groupId: string | undefined,
  options?: { enabled?: boolean; discover?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const discover = options?.discover === true;
  return useQuery({
    queryKey: queryKeys.announcements(groupId ?? '', discover),
    queryFn: () =>
      queryFn(api.data.getAnnouncements(groupId!, { discover })) as Promise<
        import('@/lib/api').Announcement[]
      >,
    enabled: !!groupId && enabled,
  });
}

/** One most recent published announcement per joined group (newest first in the list). */
export interface HomeLatestAnnouncementRow extends Announcement {
  groupName: string;
}

export function useLatestPublishedAnnouncementsPerJoinedGroupQuery(
  groups: Group[] | undefined,
  userId: string | undefined
) {
  const groupIds = useMemo(() => [...new Set((groups ?? []).map((g) => g.id))].sort(), [groups]);
  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups ?? []) {
      m.set(g.id, g.name);
    }
    return m;
  }, [groups]);
  const groupIdsKey = groupIds.join(',');

  return useQuery({
    queryKey: queryKeys.latestPublishedAnnouncementsPerJoinedGroup(userId ?? '', groupIdsKey),
    queryFn: async () => {
      const rows: HomeLatestAnnouncementRow[] = [];
      for (const gid of groupIds) {
        const list = (await queryFn(
          api.data.getAnnouncements(gid, { status: 'published', limit: 1 })
        )) as Announcement[];
        const ann = list[0];
        if (ann) {
          rows.push({ ...ann, groupName: groupNameById.get(gid) ?? '' });
        }
      }
      rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return rows;
    },
    enabled: !!userId && groupIds.length > 0,
  });
}

export function useAnnouncementQuery(
  announcementId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.announcement(announcementId ?? ''),
    queryFn: () =>
      queryFn(api.data.getAnnouncement(announcementId!)) as Promise<
        import('@/lib/api').Announcement
      >,
    enabled: !!announcementId && (options?.enabled ?? true),
  });
}

export function useGlobalAnnouncementsQuery(
  userId: string | undefined,
  options?: { enabled?: boolean; limit?: number }
) {
  const limit = options?.limit ?? 10;
  return useQuery({
    queryKey: queryKeys.globalAnnouncements(),
    queryFn: () =>
      queryFn(api.data.listGlobalAnnouncements({ limit })) as Promise<
        import('@/lib/api').GlobalAnnouncement[]
      >,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useCreateGlobalAnnouncementMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      input,
    }: {
      userId: string;
      input: import('@/lib/api').CreateGlobalAnnouncementInput;
    }) => queryFn(api.data.createGlobalAnnouncement(userId, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.globalAnnouncements() });
    },
  });
}

export function useCreateAnnouncementMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      input,
    }: {
      groupId: string;
      userId: string;
      input: import('@/lib/api').CreateAnnouncementInput;
    }) => {
      const created = await queryFn(api.data.createAnnouncement(groupId, userId, input));
      const publishResult = await api.data.publishAnnouncement(created.id);
      if (isApiError(publishResult) && __DEV__) {
        console.warn('[announcements] publishAnnouncement after create', publishResult.message);
      }
      return created;
    },
    onSuccess: (_data, { groupId }) => {
      qc.invalidateQueries({ queryKey: ['announcements', groupId] });
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'latestPublishedAnnouncementsPerJoinedGroup',
      });
    },
  });
}

export function useGroupEventsQuery(
  groupId: string | undefined,
  options?: { enabled?: boolean; discover?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const discover = options?.discover === true;
  return useQuery({
    queryKey: queryKeys.groupEvents(groupId ?? '', discover),
    queryFn: () =>
      queryFn(api.data.getGroupEvents(groupId!, { discover })) as Promise<
        import('@/lib/api').GroupEvent[]
      >,
    enabled: !!groupId && enabled,
  });
}

/** Active future events across `groups`, merged and sorted soonest first (for Home). */
export function useUpcomingJoinedGroupEventsQuery(
  groups: Group[] | undefined,
  userId: string | undefined
) {
  const groupIds = useMemo(() => [...new Set((groups ?? []).map((g) => g.id))].sort(), [groups]);
  const groupById = useMemo(() => {
    const m = new Map<string, Pick<Group, 'name' | 'bannerImageUrl'>>();
    for (const g of groups ?? []) {
      m.set(g.id, { name: g.name, bannerImageUrl: g.bannerImageUrl });
    }
    return m;
  }, [groups]);
  const groupIdsKey = groupIds.join(',');

  return useQuery({
    queryKey: queryKeys.upcomingJoinedGroupEvents(userId ?? '', groupIdsKey),
    queryFn: async () => {
      const lists = await Promise.all(groupIds.map((id) => queryFn(api.data.getGroupEvents(id))));
      return mergeUpcomingJoinedGroupEvents(groupIds, lists, groupById);
    },
    enabled: !!userId && groupIds.length > 0,
  });
}

export function useGroupEventQuery(eventId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.groupEvent(eventId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupEvent(eventId!)) as Promise<import('@/lib/api').GroupEvent>,
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

export function useEventRsvpsQuery(eventId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.eventRsvps(eventId ?? ''),
    queryFn: () =>
      queryFn(api.data.getEventRsvps(eventId!)) as Promise<import('@/lib/api').EventRsvpAttendee[]>,
    enabled: !!eventId && (options?.enabled ?? true),
  });
}

export function useMyEventRsvpQuery(
  eventId: string | undefined,
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.myEventRsvp(eventId ?? '', userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getMyEventRsvp(eventId!, userId!)) as Promise<{
        response: import('@/lib/api').EventRsvpResponse;
        updatedAt: string;
      } | null>,
    enabled: !!eventId && !!userId && (options?.enabled ?? true),
  });
}

/**
 * Map of event id → the current user's RSVP for events that require RSVP (e.g. home carousel).
 */
export function useMyEventRsvpsMapForEventsQuery(
  userId: string | undefined,
  events: { id: string; requiresRsvp: boolean }[]
) {
  const targets = useMemo(() => events.filter((e) => e.requiresRsvp), [events]);
  const queries = useQueries({
    queries: targets.map((e) => ({
      queryKey: queryKeys.myEventRsvp(e.id, userId ?? ''),
      queryFn: () =>
        queryFn(api.data.getMyEventRsvp(e.id, userId!)) as Promise<{
          response: EventRsvpResponse;
          updatedAt: string;
        } | null>,
      enabled: !!userId && targets.length > 0,
    })),
  });
  const dataSignature = queries.map((q) => q.data?.response ?? '').join('\0');
  return useMemo(() => {
    const m = new Map<string, EventRsvpResponse>();
    for (let i = 0; i < targets.length; i++) {
      const d = queries[i]?.data;
      if (d?.response) m.set(targets[i].id, d.response);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when RSVP payloads change (dataSignature); queries omitted to avoid unstable ref churn
  }, [targets, dataSignature]);
}

export function useGroupRecurringMeetingsQuery(
  groupId: string | undefined,
  options?: { enabled?: boolean; discover?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const discover = options?.discover === true;
  return useQuery({
    queryKey: queryKeys.groupRecurringMeetings(groupId ?? '', discover),
    queryFn: () =>
      queryFn(api.data.getGroupRecurringMeetings(groupId!, { discover })) as Promise<
        import('@/lib/api').GroupRecurringMeeting[]
      >,
    enabled: !!groupId && enabled,
  });
}

export function useCreateGroupRecurringMeetingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      input,
    }: {
      groupId: string;
      userId: string;
      input: import('@/lib/api').CreateGroupRecurringMeetingInput;
    }) => queryFn(api.data.createGroupRecurringMeeting(groupId, userId, input)),
    onSuccess: (row) => {
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'groupRecurringMeetings' &&
          q.queryKey[1] === row.groupId,
      });
    },
  });
}

export function useUpdateGroupRecurringMeetingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meetingId,
      userId,
      input,
    }: {
      meetingId: string;
      userId: string;
      input: import('@/lib/api').UpdateGroupRecurringMeetingInput;
    }) => queryFn(api.data.updateGroupRecurringMeeting(meetingId, userId, input)),
    onSuccess: (row) => {
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'groupRecurringMeetings' &&
          q.queryKey[1] === row.groupId,
      });
    },
  });
}

export function useDeleteGroupRecurringMeetingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId }: { meetingId: string; groupId: string }) =>
      queryFn(api.data.deleteGroupRecurringMeeting(meetingId)),
    onSuccess: (_void, { groupId }) => {
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === 'groupRecurringMeetings' &&
          q.queryKey[1] === groupId,
      });
    },
  });
}

export function useCreateGroupEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      input,
    }: {
      groupId: string;
      userId: string;
      input: import('@/lib/api').CreateGroupEventInput;
    }) => {
      const created = await queryFn(api.data.createGroupEvent(groupId, userId, input));
      const notifyResult = await api.data.notifyGroupEventCreated(created.id);
      if (isApiError(notifyResult)) {
        console.warn('[groupEvents] notifyGroupEventCreated after create', notifyResult.message);
      }
      return created;
    },
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ['groupEvents', event.groupId] });
      qc.invalidateQueries({ queryKey: queryKeys.discussions({ groupId: event.groupId }) });
      qc.invalidateQueries({ queryKey: ['upcomingJoinedGroupEvents'] });
    },
  });
}

export function useUpdateGroupEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      input,
    }: {
      eventId: string;
      userId: string;
      input: import('@/lib/api').UpdateGroupEventInput;
    }) => queryFn(api.data.updateGroupEvent(eventId, userId, input)),
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ['groupEvents', event.groupId] });
      qc.invalidateQueries({ queryKey: queryKeys.groupEvent(event.id) });
      qc.invalidateQueries({ queryKey: queryKeys.discussions({ groupId: event.groupId }) });
      qc.invalidateQueries({ queryKey: queryKeys.discussion(event.discussionId) });
      qc.invalidateQueries({ queryKey: ['upcomingJoinedGroupEvents'] });
    },
  });
}

export function useCancelGroupEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, groupId }: { eventId: string; groupId: string }) =>
      queryFn(api.data.cancelGroupEvent(eventId)),
    onSuccess: (_void, { eventId, groupId }) => {
      qc.invalidateQueries({ queryKey: ['groupEvents', groupId] });
      qc.invalidateQueries({ queryKey: queryKeys.groupEvent(eventId) });
      qc.invalidateQueries({ queryKey: ['upcomingJoinedGroupEvents'] });
    },
  });
}

export function useUpsertEventRsvpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      response,
    }: {
      eventId: string;
      userId: string;
      response: import('@/lib/api').EventRsvpResponse;
    }) => queryFn(api.data.upsertEventRsvp(eventId, userId, response)),
    onSuccess: (_void, { eventId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.eventRsvps(eventId) });
      qc.invalidateQueries({ queryKey: queryKeys.myEventRsvp(eventId, userId) });
      qc.invalidateQueries({ queryKey: ['groupEvents'] });
      qc.invalidateQueries({ queryKey: queryKeys.groupEvent(eventId) });
      qc.invalidateQueries({ queryKey: ['upcomingJoinedGroupEvents'] });
    },
  });
}

export function useRemoveEventRsvpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) =>
      queryFn(api.data.removeEventRsvp(eventId, userId)),
    onSuccess: (_void, { eventId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.eventRsvps(eventId) });
      qc.invalidateQueries({ queryKey: queryKeys.myEventRsvp(eventId, userId) });
      qc.invalidateQueries({ queryKey: ['groupEvents'] });
      qc.invalidateQueries({ queryKey: queryKeys.groupEvent(eventId) });
      qc.invalidateQueries({ queryKey: ['upcomingJoinedGroupEvents'] });
    },
  });
}

export function useGroupMemberSettingsQuery(
  groupId: string | undefined,
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.groupMemberSettings(groupId ?? '', userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupMemberSettings(groupId!, userId!)) as Promise<
        import('@/lib/api').GroupMemberSettings
      >,
    enabled: !!groupId && !!userId && (options?.enabled ?? true),
  });
}

export function useUpdateGroupMemberSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      updates,
    }: {
      groupId: string;
      userId: string;
      updates: import('@/lib/api').GroupMemberSettingsUpdates;
    }) =>
      queryFn(api.data.updateGroupMemberSettings(groupId, userId, updates)) as Promise<
        import('@/lib/api').GroupMemberSettings
      >,
    onSuccess: (_, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupMemberSettings(groupId, userId) });
    },
  });
}

export function useRegisterPushTokenMutation() {
  return useMutation({
    mutationFn: async ({
      userId,
      token,
      platform,
    }: {
      userId: string;
      token: string;
      platform: 'ios' | 'android';
    }) =>
      queryFn(api.data.registerPushToken(userId, token, platform)) as Promise<
        import('@/lib/api').PushToken
      >,
  });
}

export function useIsAdminQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.isAdmin(userId ?? ''),
    queryFn: () => queryFn(api.data.isAdmin(userId!)) as Promise<boolean>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useIsSuperAdminQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.isSuperAdmin(userId ?? ''),
    queryFn: () => queryFn(api.data.isSuperAdmin(userId!)) as Promise<boolean>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useGroupsWhereUserIsAdminQuery(
  userId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.groupsWhereUserIsAdmin(userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupsWhereUserIsAdmin(userId!)) as Promise<import('@/lib/api').Group[]>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useGroupDiscussionsQuery(
  groupId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.groupDiscussions(groupId ?? ''),
    queryFn: () =>
      queryFn(api.data.getGroupDiscussions(groupId!)) as Promise<
        import('@/lib/api').GroupDiscussion[]
      >,
    enabled: !!groupId && (options?.enabled ?? true),
  });
}

export function useCreateGroupDiscussionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      input,
    }: {
      groupId: string;
      userId: string;
      input: import('@/lib/api').CreateGroupDiscussionInput;
    }) =>
      queryFn(api.data.createGroupDiscussion(groupId, userId, input)) as Promise<
        import('@/lib/api').GroupDiscussion
      >,
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupDiscussions(groupId) });
    },
  });
}

// --- Reddit-style discussions ---

export function useDiscussionsQuery(params?: { groupId?: string; enabled?: boolean }) {
  const { groupId, enabled = true } = params ?? {};
  return useQuery({
    queryKey: queryKeys.discussions({ groupId }),
    queryFn: () =>
      queryFn(api.data.getDiscussions({ groupId })) as Promise<import('@/lib/api').Discussion[]>,
    enabled,
  });
}

export function useDiscussionQuery(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.discussion(id ?? ''),
    queryFn: () => queryFn(api.data.getDiscussion(id!)) as Promise<import('@/lib/api').Discussion>,
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useDiscussionPostsQuery(
  discussionId: string | undefined,
  options?: { enabled?: boolean; userId?: string }
) {
  const { enabled = true, userId } = options ?? {};
  return useQuery({
    queryKey: queryKeys.discussionPosts(discussionId ?? '', userId),
    queryFn: () =>
      queryFn(api.data.getDiscussionPosts(discussionId!, { userId })) as Promise<
        import('@/lib/api').DiscussionPost[]
      >,
    enabled: !!discussionId && enabled,
  });
}

export function useCreateDiscussionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      input,
    }: {
      groupId: string;
      userId: string;
      input: import('@/lib/api').CreateDiscussionInput;
    }) =>
      queryFn(api.data.createDiscussion(groupId, userId, input)) as Promise<
        import('@/lib/api').Discussion
      >,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

export function useUpdateDiscussionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      discussionId,
      params,
    }: {
      discussionId: string;
      params: import('@/lib/api').UpdateDiscussionInput;
    }) =>
      queryFn(api.data.updateDiscussion(discussionId, params)) as Promise<
        import('@/lib/api').Discussion
      >,
    onSuccess: (_, { discussionId }) => {
      qc.invalidateQueries({ queryKey: ['discussion', discussionId] });
      qc.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

export function useDeleteDiscussionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ discussionId }: { discussionId: string }) =>
      queryFn(api.data.deleteDiscussion(discussionId)),
    onSuccess: (_, { discussionId }) => {
      qc.invalidateQueries({ queryKey: ['discussion', discussionId] });
      qc.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

export function useCreateDiscussionPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      discussionId,
      userId,
      input,
    }: {
      discussionId: string;
      userId: string;
      input: CreateDiscussionPostInput;
      optimisticId?: string;
    }) =>
      queryFn(
        api.data.createDiscussionPost(discussionId, userId, input)
      ) as Promise<DiscussionPost>,
    onMutate: async (variables) => {
      const { discussionId, userId, input, optimisticId: retryId } = variables;
      const queryKey = queryKeys.discussionPosts(discussionId, userId);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<DiscussionPostWithOutbound[]>(queryKey);
      const optimisticId = retryId ?? newOptimisticMessageId();
      const profile = qc.getQueryData<Profile>(queryKeys.profile(userId));

      if (retryId) {
        qc.setQueryData<DiscussionPostWithOutbound[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((p) =>
            p.id === retryId ? { ...p, outboundStatus: 'sending' as const } : p
          );
        });
        return { previous, optimisticId };
      }

      const optimisticPost: DiscussionPostWithOutbound = {
        id: optimisticId,
        discussionId,
        userId,
        body: input.body,
        createdAt: new Date().toISOString(),
        parentPostId: input.parentPostId,
        imageUrls: input.imageUrls,
        attachments: input.attachments,
        authorDisplayName: profile?.displayName,
        authorAvatarUrl: profile?.avatarUrl,
        outboundStatus: 'sending',
        outboundRetryPayload: input,
      };
      qc.setQueryData<DiscussionPostWithOutbound[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticPost,
      ]);
      return { previous, optimisticId };
    },
    onError: (_err, variables, context) => {
      const optimisticId = context?.optimisticId;
      if (!optimisticId) return;
      const queryKey = queryKeys.discussionPosts(variables.discussionId, variables.userId);
      qc.setQueryData<DiscussionPostWithOutbound[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((p) =>
          p.id === optimisticId ? { ...p, outboundStatus: 'failed' as const } : p
        );
      });
    },
    onSuccess: (serverPost, variables, context) => {
      const optimisticId = context?.optimisticId;
      const queryKey = queryKeys.discussionPosts(variables.discussionId, variables.userId);
      if (optimisticId) {
        qc.setQueryData<DiscussionPostWithOutbound[]>(queryKey, (old) => {
          if (!old) return [serverPost];
          return old.map((p) => (p.id === optimisticId ? serverPost : p));
        });
      }
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'discussionPosts' && q.queryKey[1] === variables.discussionId,
      });
    },
  });
}

export function useUpdateDiscussionPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      input,
    }: {
      postId: string;
      userId: string;
      input: import('@/lib/api').UpdateDiscussionPostInput;
    }) =>
      queryFn(api.data.updateDiscussionPost(postId, userId, input)) as Promise<
        import('@/lib/api').DiscussionPost
      >,
    onSuccess: (updatedPost) => {
      qc.invalidateQueries({
        predicate: (q) =>
          q.queryKey[0] === 'discussionPosts' && q.queryKey[1] === updatedPost.discussionId,
      });
    },
  });
}

function updatePostReaction(
  post: DiscussionPost,
  reactionType: PostReactionType,
  delta: 1 | -1,
  userId: string
): DiscussionPost {
  const counts = { ...(post.reactionCounts ?? { prayer: 0, laugh: 0, thumbsUp: 0 }) };
  const userReactions = [...(post.userReactionTypes ?? [])];
  if (delta === 1) {
    const prev = userReactions[0];
    if (prev) {
      const prevKey = prev === 'thumbs_up' ? 'thumbsUp' : prev;
      counts[prevKey] = Math.max(0, counts[prevKey] - 1);
    }
    const key = reactionType === 'thumbs_up' ? 'thumbsUp' : reactionType;
    counts[key] = (counts[key] ?? 0) + 1;
    return { ...post, reactionCounts: counts, userReactionTypes: [reactionType] };
  } else {
    const key = reactionType === 'thumbs_up' ? 'thumbsUp' : reactionType;
    counts[key] = Math.max(0, counts[key] - 1);
    const i = userReactions.indexOf(reactionType);
    if (i >= 0) userReactions.splice(i, 1);
    return { ...post, reactionCounts: counts, userReactionTypes: userReactions };
  }
}

export function useReactToPostMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      discussionId,
      userId,
      reactionType,
    }: {
      postId: string;
      discussionId: string;
      userId: string;
      reactionType: PostReactionType;
    }) => queryFn(api.data.reactToDiscussionPost(postId, userId, reactionType)) as Promise<void>,
    onMutate: async ({ postId, discussionId, userId, reactionType }) => {
      await qc.cancelQueries({ queryKey: queryKeys.discussionPosts(discussionId, userId) });
      const previous = qc.getQueryData<DiscussionPost[]>(
        queryKeys.discussionPosts(discussionId, userId)
      );
      qc.setQueryData<DiscussionPost[]>(
        queryKeys.discussionPosts(discussionId, userId),
        (old = []) =>
          old.map((p) => (p.id === postId ? updatePostReaction(p, reactionType, 1, userId) : p))
      );
      return { previous };
    },
    onError: (_, { discussionId, userId }, context) => {
      if (context?.previous != null) {
        qc.setQueryData(queryKeys.discussionPosts(discussionId, userId), context.previous);
      }
    },
    onSettled: (_, __, { postId, discussionId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.discussionPosts(discussionId, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.discussionPostReactions(postId) });
    },
  });
}

export function useDiscussionPostReactionsQuery(
  postId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.discussionPostReactions(postId ?? ''),
    queryFn: () =>
      queryFn(api.data.getDiscussionPostReactions(postId!)) as Promise<
        import('@/lib/api').PostReactionDetail[]
      >,
    enabled: !!postId && (options?.enabled ?? true),
  });
}

export function useRemovePostReactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postId,
      discussionId,
      userId,
      reactionType,
    }: {
      postId: string;
      discussionId: string;
      userId: string;
      reactionType: PostReactionType;
    }) =>
      queryFn(api.data.removeDiscussionPostReaction(postId, userId, reactionType)) as Promise<void>,
    onMutate: async ({ postId, discussionId, userId, reactionType }) => {
      await qc.cancelQueries({ queryKey: queryKeys.discussionPosts(discussionId, userId) });
      const previous = qc.getQueryData<DiscussionPost[]>(
        queryKeys.discussionPosts(discussionId, userId)
      );
      qc.setQueryData<DiscussionPost[]>(
        queryKeys.discussionPosts(discussionId, userId),
        (old = []) =>
          old.map((p) => (p.id === postId ? updatePostReaction(p, reactionType, -1, userId) : p))
      );
      return { previous };
    },
    onError: (_, { discussionId, userId }, context) => {
      if (context?.previous != null) {
        qc.setQueryData(queryKeys.discussionPosts(discussionId, userId), context.previous);
      }
    },
    onSettled: (_, __, { postId, discussionId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.discussionPosts(discussionId, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.discussionPostReactions(postId) });
    },
  });
}

export function useJoinGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      queryFn(api.data.joinGroup(groupId, userId)),
    onSuccess: (_, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupsForUser(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
    },
  });
}

export function useLeaveGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) =>
      queryFn(api.data.leaveGroup(groupId, userId)),
    onSuccess: (_, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groupsForUser(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
    },
  });
}

export function useCreateGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      params,
      createdByUserId,
    }: {
      params: CreateGroupInput;
      createdByUserId: string;
    }) =>
      queryFn(api.data.createGroup(params, createdByUserId)) as Promise<import('@/lib/api').Group>,
    onSuccess: (_, { createdByUserId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups() });
      qc.invalidateQueries({ queryKey: queryKeys.groupsForUser(createdByUserId) });
    },
  });
}

export function useUpdateGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, params }: { groupId: string; params: UpdateGroupInput }) =>
      queryFn(api.data.updateGroup(groupId, params)) as Promise<import('@/lib/api').Group>,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.group(updated.id) });
      qc.invalidateQueries({ queryKey: queryKeys.groups() });
      qc.invalidateQueries({ queryKey: queryKeys.groupsForUser(updated.createdByUserId) });
    },
  });
}

export function useDeleteGroupMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId }: { groupId: string }) =>
      queryFn(api.data.deleteGroup(groupId)) as Promise<void>,
    onSuccess: (_, { groupId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      qc.invalidateQueries({ queryKey: queryKeys.groups() });
      if (userId) {
        qc.invalidateQueries({ queryKey: queryKeys.groupsForUser(userId) });
      }
    },
  });
}

export function useUploadGroupBannerImageMutation() {
  return useMutation({
    mutationFn: async ({
      userId,
      imageUri,
      base64Data,
    }: {
      userId: string;
      imageUri: string;
      base64Data?: string | null;
    }) => queryFn(api.data.uploadGroupBannerImage(userId, imageUri, base64Data)) as Promise<string>,
  });
}

export function useUploadDiscussionPostImageMutation() {
  return useMutation({
    mutationFn: async ({
      userId,
      imageUri,
      base64Data,
    }: {
      userId: string;
      imageUri: string;
      base64Data?: string | null;
    }) =>
      queryFn(api.data.uploadDiscussionPostImage(userId, imageUri, base64Data)) as Promise<string>,
  });
}

// --- Chats ---

export function useChatsForUserQuery(
  userId: string | undefined,
  options?: { folderId?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.chatsForUser(userId ?? '', options?.folderId),
    queryFn: () =>
      queryFn(api.data.getChatsForUser(userId!, { folderId: options?.folderId })) as Promise<
        import('@/lib/api').Chat[]
      >,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useChatQuery(chatId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.chat(chatId ?? ''),
    queryFn: () => queryFn(api.data.getChat(chatId!)) as Promise<import('@/lib/api').Chat>,
  });
}

export function useFindExisting1on1ChatQuery(
  userId: string | undefined,
  otherUserId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.findExisting1on1Chat(userId ?? '', otherUserId ?? ''),
    queryFn: () =>
      queryFn(api.data.findExisting1on1Chat(userId!, otherUserId!)) as Promise<
        import('@/lib/api').Chat | null
      >,
    enabled: !!userId && !!otherUserId && (options?.enabled ?? true),
  });
}

export function useChatMessagesQuery(
  chatId: string | undefined,
  options?: { userId?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.chatMessages(chatId ?? '', options?.userId),
    queryFn: () =>
      queryFn(api.data.getChatMessages(chatId!, { userId: options?.userId })) as Promise<
        import('@/lib/api').ChatMessage[]
      >,
    enabled: !!chatId && (options?.enabled ?? true),
  });
}

export function useChatSharedContentQuery(
  chatId: string | undefined,
  options?: { userId?: string; enabled?: boolean }
) {
  const qc = useQueryClient();
  const uid = options?.userId;
  return useQuery({
    queryKey: queryKeys.chatSharedContent(chatId ?? ''),
    queryFn: () =>
      queryFn(api.data.getChatSharedContent(chatId!)) as Promise<
        import('@/lib/api').ChatSharedContentMessage[]
      >,
    enabled: !!chatId && (options?.enabled ?? true),
    staleTime: 3 * 60 * 1000,
    placeholderData: () => {
      if (!chatId || !uid) return undefined;
      const msgs = qc.getQueryData<ChatMessage[]>(queryKeys.chatMessages(chatId, uid));
      if (!msgs?.length) return undefined;
      return chatMessagesToSharedContentPlaceholder(msgs);
    },
  });
}

export function useMarkChatReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, userId }: { chatId: string; userId: string }) =>
      queryFn(api.data.markChatRead(chatId, userId)) as Promise<void>,
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'chatsForUser' });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useCreateChatMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      input,
    }: {
      userId: string;
      input: import('@/lib/api').CreateChatInput;
    }) => queryFn(api.data.createChat(userId, input)) as Promise<import('@/lib/api').Chat>,
    onSuccess: (chat, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatsForUser(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.chat(chat.id) });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useAddChatMembersMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      addedByUserId,
      memberUserIds,
    }: {
      chatId: string;
      addedByUserId: string;
      memberUserIds: string[];
    }) => queryFn(api.data.addChatMembers(chatId, addedByUserId, memberUserIds)) as Promise<void>,
    onSuccess: (_, { chatId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'chatsForUser' });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'appBadgeCount' });
    },
  });
}

export function useRemoveChatMemberMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      memberUserId,
      removedByUserId,
    }: {
      chatId: string;
      memberUserId: string;
      removedByUserId: string;
    }) =>
      queryFn(api.data.removeChatMember(chatId, memberUserId, removedByUserId)) as Promise<void>,
    onSuccess: (_, { chatId, removedByUserId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'chatsForUser' });
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId, removedByUserId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'appBadgeCount' });
    },
  });
}

export function useUpdateChatMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      input,
    }: {
      chatId: string;
      input: import('@/lib/api').UpdateChatInput;
    }) => queryFn(api.data.updateChat(chatId, input)) as Promise<import('@/lib/api').Chat>,
    onSuccess: (chat) => {
      qc.invalidateQueries({ queryKey: queryKeys.chat(chat.id) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'chatsForUser' });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'appBadgeCount' });
    },
  });
}

export function useCreateChatMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      chatId,
      userId,
      input,
    }: {
      chatId: string;
      userId: string;
      input: CreateChatMessageInput;
      optimisticId?: string;
    }) => queryFn(api.data.createChatMessage(chatId, userId, input)) as Promise<ChatMessage>,
    onMutate: async (variables) => {
      const { chatId, userId, input, optimisticId: retryId } = variables;
      const queryKey = queryKeys.chatMessages(chatId, userId);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<ChatMessageWithOutbound[]>(queryKey);
      const optimisticId = retryId ?? newOptimisticMessageId();
      const profile = qc.getQueryData<Profile>(queryKeys.profile(userId));

      if (retryId) {
        qc.setQueryData<ChatMessageWithOutbound[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((m) =>
            m.id === retryId ? { ...m, outboundStatus: 'sending' as const } : m
          );
        });
        return { previous, optimisticId };
      }

      const optimisticMessage: ChatMessageWithOutbound = {
        id: optimisticId,
        chatId,
        userId,
        body: input.body,
        createdAt: new Date().toISOString(),
        parentMessageId: input.parentMessageId,
        imageUrls: input.imageUrls,
        attachments: input.attachments,
        authorDisplayName: profile?.displayName,
        authorAvatarUrl: profile?.avatarUrl,
        outboundStatus: 'sending',
        outboundRetryPayload: input,
      };
      qc.setQueryData<ChatMessageWithOutbound[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticMessage,
      ]);
      return { previous, optimisticId };
    },
    onError: (_err, variables, context) => {
      const optimisticId = context?.optimisticId;
      if (!optimisticId) return;
      const queryKey = queryKeys.chatMessages(variables.chatId, variables.userId);
      qc.setQueryData<ChatMessageWithOutbound[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === optimisticId ? { ...m, outboundStatus: 'failed' as const } : m
        );
      });
    },
    onSuccess: (serverMessage, variables, context) => {
      const optimisticId = context?.optimisticId;
      const queryKey = queryKeys.chatMessages(variables.chatId, variables.userId);
      if (optimisticId) {
        qc.setQueryData<ChatMessageWithOutbound[]>(queryKey, (old) => {
          if (!old) return [serverMessage];
          return old.map((m) => (m.id === optimisticId ? serverMessage : m));
        });
      }
      qc.invalidateQueries({
        queryKey: queryKeys.chatMessages(variables.chatId, variables.userId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.chatSharedContent(variables.chatId) });
      qc.invalidateQueries({ queryKey: queryKeys.chat(variables.chatId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'chatsForUser' });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'appBadgeCount' });
    },
  });
}

export function useUpdateChatMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      chatId,
      userId,
      input,
    }: {
      messageId: string;
      chatId: string;
      userId: string;
      input: import('@/lib/api').UpdateChatMessageInput;
    }) =>
      queryFn(api.data.updateChatMessage(messageId, userId, input)) as Promise<
        import('@/lib/api').ChatMessage
      >,
    onSuccess: (_, { chatId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatSharedContent(chatId) });
    },
  });
}

export function useReactToChatMessageMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      chatId,
      userId,
      reactionType,
    }: {
      messageId: string;
      chatId: string;
      userId: string;
      reactionType: import('@/lib/api').PostReactionType;
    }) =>
      queryFn(
        api.data.reactToChatMessage(messageId, chatId, userId, reactionType)
      ) as Promise<void>,
    onSuccess: (_, { messageId, chatId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatMessageReactions(messageId) });
    },
  });
}

export function useRemoveChatMessageReactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      chatId,
      userId,
      reactionType,
    }: {
      messageId: string;
      chatId: string;
      userId: string;
      reactionType: import('@/lib/api').PostReactionType;
    }) =>
      queryFn(
        api.data.removeChatMessageReaction(messageId, chatId, userId, reactionType)
      ) as Promise<void>,
    onSuccess: (_, { messageId, chatId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(chatId, userId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatMessageReactions(messageId) });
    },
  });
}

export function useChatMessageReactionsQuery(
  messageId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.chatMessageReactions(messageId ?? ''),
    queryFn: () =>
      queryFn(api.data.getChatMessageReactions(messageId!)) as Promise<
        import('@/lib/api').PostReactionDetail[]
      >,
    enabled: !!messageId && (options?.enabled ?? true),
  });
}

export function useChatFoldersQuery(userId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.chatFolders(userId ?? ''),
    queryFn: () =>
      queryFn(api.data.getChatFolders(userId!)) as Promise<import('@/lib/api').ChatFolder[]>,
    enabled: !!userId && (options?.enabled ?? true),
  });
}

export function useChatFolderItemsQuery(
  folderId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.chatFolderItems(folderId ?? ''),
    queryFn: () =>
      queryFn(api.data.getChatFolderItems(folderId!)) as Promise<
        import('@/lib/api').ChatFolderItem[]
      >,
    enabled: !!folderId && (options?.enabled ?? true),
  });
}

export function useCreateChatFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) =>
      queryFn(api.data.createChatFolder(userId, name)) as Promise<import('@/lib/api').ChatFolder>,
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatFolders(userId) });
    },
  });
}

export function useUpdateChatFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      folderId,
      userId,
      name,
    }: {
      folderId: string;
      userId: string;
      name: string;
    }) =>
      queryFn(api.data.updateChatFolder(folderId, userId, name)) as Promise<
        import('@/lib/api').ChatFolder
      >,
    onSuccess: (_, { folderId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatFolders(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatFolderItems(folderId) });
    },
  });
}

export function useDeleteChatFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, userId }: { folderId: string; userId: string }) =>
      queryFn(api.data.deleteChatFolder(folderId, userId)) as Promise<void>,
    onSuccess: (_, { folderId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatFolders(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatFolderItems(folderId) });
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'chatsForUser' });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useAddChatToFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      folderId,
      chatId,
      userId,
    }: {
      folderId: string;
      chatId: string;
      userId: string;
    }) =>
      queryFn(api.data.addChatToFolder(folderId, chatId, userId)) as Promise<
        import('@/lib/api').ChatFolderItem
      >,
    onSuccess: (_, { folderId, chatId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatFolderItems(folderId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatsForUser(userId) });
      qc.invalidateQueries({
        queryKey: queryKeys.chatsForUser(userId, folderId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useRemoveChatFromFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      folderId,
      chatId,
      userId,
    }: {
      folderId: string;
      chatId: string;
      userId: string;
    }) => queryFn(api.data.removeChatFromFolder(folderId, chatId, userId)) as Promise<void>,
    onSuccess: (_, { folderId, chatId, userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatFolderItems(folderId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatsForUser(userId) });
      qc.invalidateQueries({
        queryKey: queryKeys.chatsForUser(userId, folderId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.appBadgeCount(userId) });
    },
  });
}

export function useProfilesQuery(userIds: string[] | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.profiles(userIds ?? []),
    queryFn: () =>
      queryFn(api.data.getProfiles(userIds!)) as Promise<import('@/lib/api').Profile[]>,
    enabled: !!userIds && userIds.length > 0 && (options?.enabled ?? true),
  });
}

export function useSearchProfilesQuery(
  search: string,
  excludeUserId: string | undefined,
  options?: { enabled?: boolean }
) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: queryKeys.searchProfiles(trimmed, excludeUserId ?? ''),
    queryFn: () =>
      queryFn(api.data.searchProfiles(trimmed, excludeUserId!)) as Promise<
        import('@/lib/api').Profile[]
      >,
    enabled: trimmed.length >= 2 && !!excludeUserId && (options?.enabled ?? true),
  });
}

export function useUploadChatImageMutation() {
  return useMutation({
    mutationFn: async ({
      userId,
      imageUri,
      base64Data,
      chatId,
    }: {
      userId: string;
      imageUri: string;
      base64Data?: string | null;
      chatId?: string;
    }) =>
      queryFn(
        api.data.uploadChatImage(userId, imageUri, base64Data, chatId ? { chatId } : undefined)
      ) as Promise<string>,
  });
}

export function useUploadChatMessageAttachmentMutation() {
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      localUri: string;
      contentType: string;
      fileName: string;
      base64Data?: string | null;
      objectKind: 'message' | 'thumbnail';
    }) =>
      queryFn(
        api.data.uploadChatMessageAttachment(params.userId, params.localUri, {
          contentType: params.contentType,
          fileName: params.fileName,
          base64Data: params.base64Data,
          objectKind: params.objectKind,
        })
      ) as Promise<string>,
  });
}

export function useUploadDiscussionPostAttachmentMutation() {
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      localUri: string;
      contentType: string;
      fileName: string;
      base64Data?: string | null;
      objectKind: 'post' | 'thumbnail';
    }) =>
      queryFn(
        api.data.uploadDiscussionPostAttachment(params.userId, params.localUri, {
          contentType: params.contentType,
          fileName: params.fileName,
          base64Data: params.base64Data,
          objectKind: params.objectKind,
        })
      ) as Promise<string>,
  });
}
