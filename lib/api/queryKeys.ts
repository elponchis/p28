/**
 * React Query key factory. Centralizes all query keys for consistency and invalidation.
 */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  notificationPreferences: (userId: string) => ['notificationPreferences', userId] as const,
  groups: (params?: { type?: 'forum' | 'ministry'; search?: string }) =>
    ['groups', params ?? {}] as const,
  group: (id: string) => ['group', id] as const,
  groupMembers: (groupId: string) => ['groupMembers', groupId] as const,
  groupDiscussions: (groupId: string) => ['groupDiscussions', groupId] as const,
  discussions: (params?: { groupId?: string }) => ['discussions', params ?? {}] as const,
  discussion: (id: string) => ['discussion', id] as const,
  discussionPosts: (discussionId: string, userId?: string) =>
    ['discussionPosts', discussionId, userId ?? null] as const,
  discussionPostReactions: (postId: string) => ['discussionPostReactions', postId] as const,
  groupsForUser: (userId: string) => ['groupsForUser', userId] as const,
  groupAdmins: (groupId: string) => ['groupAdmins', groupId] as const,
  groupAdminsAll: (groupId: string) => ['groupAdmins', groupId, 'all'] as const,
  userIsGroupAdmin: (groupId: string, userId: string) =>
    ['userIsGroupAdmin', groupId, userId] as const,
  isAdmin: (userId: string) => ['isAdmin', userId] as const,
  isSuperAdmin: (userId: string) => ['isSuperAdmin', userId] as const,
  friendIds: (userId: string) => ['friendIds', userId] as const,
  areFriends: (userId: string, targetUserId: string) =>
    ['areFriends', userId, targetUserId] as const,
  friendRequestBetween: (userId: string, targetUserId: string) =>
    ['friendRequestBetween', userId, targetUserId] as const,
  receivedFriendRequests: (userId: string) => ['receivedFriendRequests', userId] as const,
  sentFriendRequests: (userId: string) => ['sentFriendRequests', userId] as const,
  pendingFriendRequestCount: (userId: string) => ['pendingFriendRequestCount', userId] as const,
  inAppNotifications: (userId: string) => ['inAppNotifications', userId] as const,
  inAppUnreadNotificationCount: (userId: string, badgeClearedAt: string | null) =>
    ['inAppUnreadNotificationCount', userId, badgeClearedAt ?? ''] as const,
  appBadgeCount: (userId: string) => ['appBadgeCount', userId] as const,
  chatsForUser: (userId: string, folderId?: string) =>
    ['chatsForUser', userId, folderId ?? null] as const,
  chat: (id: string) => ['chat', id] as const,
  findExisting1on1Chat: (userId: string, otherUserId: string) =>
    ['findExisting1on1Chat', userId, otherUserId] as const,
  chatMessages: (chatId: string, userId?: string) =>
    ['chatMessages', chatId, userId ?? null] as const,
  chatSharedContent: (chatId: string) => ['chatSharedContent', chatId] as const,
  chatMessageReactions: (messageId: string) => ['chatMessageReactions', messageId] as const,
  chatFolders: (userId: string) => ['chatFolders', userId] as const,
  chatFolderItems: (folderId: string) => ['chatFolderItems', folderId] as const,
  profiles: (userIds: string[]) => ['profiles', [...userIds].sort()] as const,
  searchProfiles: (search: string, excludeUserId: string) =>
    ['searchProfiles', search.trim(), excludeUserId] as const,
  groupsWhereUserIsAdmin: (userId: string) => ['groupsWhereUserIsAdmin', userId] as const,
  announcements: (groupId: string, discover?: boolean) =>
    ['announcements', groupId, discover === true ? 'discover' : 'member'] as const,
  /** Latest published announcement per joined group, aggregated on the home screen. */
  latestPublishedAnnouncementsPerJoinedGroup: (userId: string, groupIdsKey: string) =>
    ['latestPublishedAnnouncementsPerJoinedGroup', userId, groupIdsKey] as const,
  announcement: (id: string) => ['announcement', id] as const,
  globalAnnouncements: () => ['globalAnnouncements'] as const,
  groupEvents: (groupId: string, discover?: boolean) =>
    ['groupEvents', groupId, discover === true ? 'discover' : 'member'] as const,
  /** Aggregated upcoming events across groups the user has joined (`groupIdsKey` = sorted ids joined). */
  upcomingJoinedGroupEvents: (userId: string, groupIdsKey: string) =>
    ['upcomingJoinedGroupEvents', userId, groupIdsKey] as const,
  groupRecurringMeetings: (groupId: string, discover?: boolean) =>
    ['groupRecurringMeetings', groupId, discover === true ? 'discover' : 'member'] as const,
  groupEvent: (id: string) => ['groupEvent', id] as const,
  eventRsvps: (eventId: string) => ['eventRsvps', eventId] as const,
  myEventRsvp: (eventId: string, userId: string) => ['myEventRsvp', eventId, userId] as const,
  groupMemberSettings: (groupId: string, userId: string) =>
    ['groupMemberSettings', groupId, userId] as const,
};
