import type { ApiError } from './errors';
import type {
  Chat,
  ChatFolder,
  ChatFolderItem,
  ChatMember,
  ChatMessage,
  ChatSharedContentMessage,
  CreateChatInput,
  CreateChatMessageInput,
  CreateDiscussionInput,
  CreateDiscussionPostInput,
  Announcement,
  CreateAnnouncementInput,
  CreateGlobalAnnouncementInput,
  GlobalAnnouncement,
  CreateGroupDiscussionInput,
  CreateGroupEventInput,
  CreateGroupRecurringMeetingInput,
  CreateGroupInput,
  Discussion,
  DiscussionPost,
  EventRsvpAttendee,
  EventRsvpResponse,
  FriendRequest,
  Group,
  PostReactionDetail,
  GroupAdmin,
  GroupDiscussion,
  GroupEvent,
  GroupRecurringMeeting,
  GroupMember,
  GroupMemberSettings,
  GroupMemberSettingsUpdates,
  NotificationPreferences,
  NotificationPreferencesUpdates,
  OnboardingProfileData,
  PostReactionType,
  Profile,
  ProfileUpdates,
  UpdateChatInput,
  UpdateChatMessageInput,
  UpdateDiscussionInput,
  UpdateDiscussionPostInput,
  UpdateGroupEventInput,
  UpdateGroupRecurringMeetingInput,
  UpdateGroupInput,
  PushToken,
  InAppNotification,
  MarkInAppNotificationsReadInput,
} from './dto';

/**
 * Data contract: domain operations. No backend-specific types.
 * Adapters implement these; app code uses only the facade.
 */
export interface DataContract {
  getProfile(userId: string): Promise<Profile | ApiError>;
  createProfile(userId: string, data: OnboardingProfileData): Promise<Profile | ApiError>;
  updateProfile(userId: string, updates: ProfileUpdates): Promise<Profile | ApiError>;
  /** When base64Data is provided (e.g. from picker with base64: true), it is used for upload and imageUri is only for fallback/logging. */
  uploadProfileImage(
    userId: string,
    imageUri: string,
    base64Data?: string | null
  ): Promise<string | ApiError>;
  /** Upload group banner image. Returns public URL. Used when creating/editing groups. */
  uploadGroupBannerImage(
    userId: string,
    imageUri: string,
    base64Data?: string | null
  ): Promise<string | ApiError>;
  /** Upload discussion post image. Returns public URL. Used when replying with attachments. */
  uploadDiscussionPostImage(
    userId: string,
    imageUri: string,
    base64Data?: string | null
  ): Promise<string | ApiError>;
  /** Upload chat avatar or chat message image. Returns public URL. */
  uploadChatImage(
    userId: string,
    imageUri: string,
    base64Data?: string | null,
    options?: { chatId?: string }
  ): Promise<string | ApiError>;
  /** Upload chat message file/video (or thumbnail JPEG under messages/{userId}/thumbs/). */
  uploadChatMessageAttachment(
    userId: string,
    localUri: string,
    options: {
      contentType: string;
      fileName: string;
      base64Data?: string | null;
      objectKind: 'message' | 'thumbnail';
    }
  ): Promise<string | ApiError>;
  /** Upload discussion post file/video (or thumbnail under {userId}/thumbs/). */
  uploadDiscussionPostAttachment(
    userId: string,
    localUri: string,
    options: {
      contentType: string;
      fileName: string;
      base64Data?: string | null;
      objectKind: 'post' | 'thumbnail';
    }
  ): Promise<string | ApiError>;

  getNotificationPreferences(userId: string): Promise<NotificationPreferences | ApiError>;
  updateNotificationPreferences(
    userId: string,
    updates: NotificationPreferencesUpdates
  ): Promise<NotificationPreferences | ApiError>;

  // Groups (Forums and Ministries - top level)
  getGroups(params?: { type?: 'forum' | 'ministry'; search?: string }): Promise<Group[] | ApiError>;
  getGroup(id: string): Promise<Group | ApiError>;
  createGroup(params: CreateGroupInput, createdByUserId: string): Promise<Group | ApiError>;
  updateGroup(id: string, params: UpdateGroupInput): Promise<Group | ApiError>;
  deleteGroup(id: string): Promise<void | ApiError>;

  // Group membership (community roster; omits platform super_admins already shown as leaders — see lib/groupCommunityDisplay.ts)
  getGroupMembers(groupId: string): Promise<GroupMember[] | ApiError>;
  joinGroup(groupId: string, userId: string): Promise<void | ApiError>;
  leaveGroup(groupId: string, userId: string): Promise<void | ApiError>;
  getGroupsForUser(userId: string): Promise<Group[] | ApiError>;

  // Friendships
  getFriendIds(userId: string): Promise<string[] | ApiError>;
  areFriends(userId: string, targetUserId: string): Promise<boolean | ApiError>;
  addFriend(userId: string, friendId: string): Promise<void | ApiError>;
  removeFriend(userId: string, friendId: string): Promise<void | ApiError>;

  // Friend requests
  sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest | ApiError>;
  cancelFriendRequest(requestId: string): Promise<void | ApiError>;
  acceptFriendRequest(requestId: string, receiverId: string): Promise<void | ApiError>;
  declineFriendRequest(requestId: string, receiverId: string): Promise<void | ApiError>;
  getReceivedFriendRequests(userId: string): Promise<FriendRequest[] | ApiError>;
  getSentFriendRequests(userId: string): Promise<FriendRequest[] | ApiError>;
  getFriendRequestBetween(
    userId: string,
    targetUserId: string
  ): Promise<FriendRequest | null | ApiError>;
  getPendingFriendRequestCount(userId: string): Promise<number | ApiError>;

  /** In-app group activity (announcements + events), newest first. */
  listInAppNotifications(
    userId: string,
    options?: { limit?: number }
  ): Promise<InAppNotification[] | ApiError>;
  getUnreadInAppNotificationCount(
    userId: string,
    options?: { createdAfter?: string }
  ): Promise<number | ApiError>;
  markInAppNotificationsRead(input: MarkInAppNotificationsReadInput): Promise<void | ApiError>;

  /** Total app-icon badge: unread chats + pending friend requests + in-app unread (respects notifications_badge_cleared_at). */
  getAppBadgeCount(userId: string): Promise<number | ApiError>;
  /** Persist Notifications-tab visit time (RLS: own profile only). */
  setNotificationsBadgeClearedAt(userId: string, clearedAtIso: string): Promise<void | ApiError>;

  // Group admins (community leaders; omits platform super_admins unless creator or also a member — see lib/groupCommunityDisplay.ts)
  getGroupAdmins(groupId: string): Promise<GroupAdmin[] | ApiError>;
  /** All `group_admins` rows (e.g. super-admin assign UI). Not filtered for community display. */
  getGroupAdminsAll(groupId: string): Promise<GroupAdmin[] | ApiError>;
  /**
   * Whether `userId` may act as a group admin for this group: `group_admins` row **or**
   * platform `app_roles.super_admin` (effective admin in every group).
   */
  isUserGroupAdmin(groupId: string, userId: string): Promise<boolean | ApiError>;
  /** Group creator or super admin (RLS). Adds user as a group admin. */
  addGroupAdmin(groupId: string, userId: string): Promise<void | ApiError>;
  /** Group creator or super admin (RLS). Removes a row from `group_admins` (does not remove group membership). */
  removeGroupAdmin(groupId: string, userId: string): Promise<void | ApiError>;

  // Group announcements
  /**
   * @param options.discover When true, returns published announcements without meeting links (for non-members).
   *   `status` / `limit` are ignored when discover is true.
   */
  getAnnouncements(
    groupId: string,
    options?: { discover?: boolean; status?: 'published'; limit?: number }
  ): Promise<Announcement[] | ApiError>;
  getAnnouncement(id: string): Promise<Announcement | ApiError>;
  createAnnouncement(
    groupId: string,
    userId: string,
    input: CreateAnnouncementInput
  ): Promise<Announcement | ApiError>;
  /** Invokes Edge Function to send push notifications for a published announcement (idempotent). */
  publishAnnouncement(announcementId: string): Promise<void | ApiError>;

  /** Newest global (platform) announcements for the home feed. */
  listGlobalAnnouncements(options?: { limit?: number }): Promise<GlobalAnnouncement[] | ApiError>;
  /** Super admins only (RLS). */
  createGlobalAnnouncement(
    userId: string,
    input: CreateGlobalAnnouncementInput
  ): Promise<GlobalAnnouncement | ApiError>;

  // Group events
  /** @param options.discover When true, returns events without meeting links (for non-members). */
  getGroupEvents(
    groupId: string,
    options?: { discover?: boolean }
  ): Promise<GroupEvent[] | ApiError>;
  getGroupEvent(id: string): Promise<GroupEvent | ApiError>;
  createGroupEvent(
    groupId: string,
    userId: string,
    input: CreateGroupEventInput
  ): Promise<GroupEvent | ApiError>;
  /** Invokes Edge Function to send push notifications for a newly created group event. */
  notifyGroupEventCreated(eventId: string): Promise<void | ApiError>;
  updateGroupEvent(
    eventId: string,
    userId: string,
    input: UpdateGroupEventInput
  ): Promise<GroupEvent | ApiError>;
  cancelGroupEvent(eventId: string): Promise<void | ApiError>;
  getEventRsvps(eventId: string): Promise<EventRsvpAttendee[] | ApiError>;
  getMyEventRsvp(
    eventId: string,
    userId: string
  ): Promise<{ response: EventRsvpResponse; updatedAt: string } | null | ApiError>;
  upsertEventRsvp(
    eventId: string,
    userId: string,
    response: EventRsvpResponse
  ): Promise<void | ApiError>;
  removeEventRsvp(eventId: string, userId: string): Promise<void | ApiError>;

  /** @param options.discover When true, returns rows without meeting links (for non-members). */
  getGroupRecurringMeetings(
    groupId: string,
    options?: { discover?: boolean }
  ): Promise<GroupRecurringMeeting[] | ApiError>;
  createGroupRecurringMeeting(
    groupId: string,
    userId: string,
    input: CreateGroupRecurringMeetingInput
  ): Promise<GroupRecurringMeeting | ApiError>;
  updateGroupRecurringMeeting(
    meetingId: string,
    userId: string,
    input: UpdateGroupRecurringMeetingInput
  ): Promise<GroupRecurringMeeting | ApiError>;
  deleteGroupRecurringMeeting(meetingId: string): Promise<void | ApiError>;

  getGroupMemberSettings(groupId: string, userId: string): Promise<GroupMemberSettings | ApiError>;
  updateGroupMemberSettings(
    groupId: string,
    userId: string,
    updates: GroupMemberSettingsUpdates
  ): Promise<GroupMemberSettings | ApiError>;

  registerPushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android'
  ): Promise<PushToken | ApiError>;
  removePushToken(userId: string, token: string): Promise<void | ApiError>;

  // Group discussions
  getGroupDiscussions(groupId: string): Promise<GroupDiscussion[] | ApiError>;
  createGroupDiscussion(
    groupId: string,
    userId: string,
    input: CreateGroupDiscussionInput
  ): Promise<GroupDiscussion | ApiError>;

  // Reddit-style discussions (topics + replies)
  getDiscussions(params?: { groupId?: string }): Promise<Discussion[] | ApiError>;
  getDiscussion(id: string): Promise<Discussion | ApiError>;
  createDiscussion(
    groupId: string,
    userId: string,
    input: CreateDiscussionInput
  ): Promise<Discussion | ApiError>;
  updateDiscussion(id: string, params: UpdateDiscussionInput): Promise<Discussion | ApiError>;
  deleteDiscussion(id: string): Promise<void | ApiError>;
  getDiscussionPosts(
    discussionId: string,
    options?: { userId?: string }
  ): Promise<DiscussionPost[] | ApiError>;
  createDiscussionPost(
    discussionId: string,
    userId: string,
    input: CreateDiscussionPostInput
  ): Promise<DiscussionPost | ApiError>;
  updateDiscussionPost(
    postId: string,
    userId: string,
    input: UpdateDiscussionPostInput
  ): Promise<DiscussionPost | ApiError>;
  /** Add or replace reaction on a discussion post. One reaction per user per post. */
  reactToDiscussionPost(
    postId: string,
    userId: string,
    reactionType: PostReactionType
  ): Promise<void | ApiError>;
  /** Remove reaction from a discussion post. */
  removeDiscussionPostReaction(
    postId: string,
    userId: string,
    reactionType: PostReactionType
  ): Promise<void | ApiError>;
  /** Get who gave which reaction on a post. */
  getDiscussionPostReactions(postId: string): Promise<PostReactionDetail[] | ApiError>;

  // Chats
  getChatsForUser(userId: string, options?: { folderId?: string }): Promise<Chat[] | ApiError>;
  getChat(id: string): Promise<Chat | ApiError>;
  findExisting1on1Chat(userId: string, otherUserId: string): Promise<Chat | null | ApiError>;
  /** Find a chat with exactly these members (current user + memberUserIds). Works for 1-on-1 and group chats. */
  findExistingChatByMembers(
    userId: string,
    memberUserIds: string[]
  ): Promise<Chat | null | ApiError>;
  createChat(userId: string, input: CreateChatInput): Promise<Chat | ApiError>;
  addChatMembers(
    chatId: string,
    addedByUserId: string,
    memberUserIds: string[]
  ): Promise<void | ApiError>;
  /** Remove another user from the chat. Only the chat creator may call this (see RLS). */
  removeChatMember(
    chatId: string,
    memberUserId: string,
    removedByUserId: string
  ): Promise<void | ApiError>;
  /** Mark a chat as read by updating last_read_at for the current user. */
  markChatRead(chatId: string, userId: string): Promise<void | ApiError>;
  updateChat(id: string, input: UpdateChatInput): Promise<Chat | ApiError>;
  getChatMessages(chatId: string, options?: { userId?: string }): Promise<ChatMessage[] | ApiError>;
  /** Messages with attachments, legacy images, or URLs in body; ordered newest first. */
  getChatSharedContent(chatId: string): Promise<ChatSharedContentMessage[] | ApiError>;
  createChatMessage(
    chatId: string,
    userId: string,
    input: CreateChatMessageInput
  ): Promise<ChatMessage | ApiError>;
  updateChatMessage(
    messageId: string,
    userId: string,
    input: UpdateChatMessageInput
  ): Promise<ChatMessage | ApiError>;
  reactToChatMessage(
    messageId: string,
    chatId: string,
    userId: string,
    reactionType: PostReactionType
  ): Promise<void | ApiError>;
  removeChatMessageReaction(
    messageId: string,
    chatId: string,
    userId: string,
    reactionType: PostReactionType
  ): Promise<void | ApiError>;
  getChatMessageReactions(messageId: string): Promise<PostReactionDetail[] | ApiError>;
  getChatFolders(userId: string): Promise<ChatFolder[] | ApiError>;
  createChatFolder(userId: string, name: string): Promise<ChatFolder | ApiError>;
  updateChatFolder(folderId: string, userId: string, name: string): Promise<ChatFolder | ApiError>;
  deleteChatFolder(folderId: string, userId: string): Promise<void | ApiError>;
  getChatFolderItems(folderId: string): Promise<ChatFolderItem[] | ApiError>;
  addChatToFolder(
    folderId: string,
    chatId: string,
    userId: string
  ): Promise<ChatFolderItem | ApiError>;
  removeChatFromFolder(folderId: string, chatId: string, userId: string): Promise<void | ApiError>;
  /** Get profiles for multiple user IDs. Used for friend picker. */
  getProfiles(userIds: string[]): Promise<Profile[] | ApiError>;
  /** Search profiles by display name, first name, last name, or email. Excludes excludeUserId (typically current user). */
  searchProfiles(search: string, excludeUserId: string): Promise<Profile[] | ApiError>;

  // App roles (Super Admin, Admin)
  isSuperAdmin(userId: string): Promise<boolean | ApiError>;
  isAdmin(userId: string): Promise<boolean | ApiError>;
  getGroupsWhereUserIsAdmin(userId: string): Promise<Group[] | ApiError>;
  assignAdmin(userId: string, assignedByUserId: string): Promise<void | ApiError>;
  revokeAdmin(userId: string): Promise<void | ApiError>;
  /** Look up user's UUID by email via RPC. Returns null if no user found. */
  getUserIdByEmail(email: string): Promise<string | null | ApiError>;
}
