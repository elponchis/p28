/**
 * Shared DTOs (camelCase). Adapters map backend responses to these types.
 * Extend as needed for later stories (e.g. Group, Message).
 */

export interface User {
  id: string;
  email?: string;
  createdAt?: string;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  /** ISO 8601 date string when the session expires */
  expiresAt?: string;
  user: User;
}

export interface Profile {
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  /** ISO-8601 date string (YYYY-MM-DD) */
  birthDate?: string;
  /** Country code or name (fixed list in UI) */
  country?: string;
  /** App locale/language code (e.g. en, es) */
  preferredLanguage?: string;
  avatarUrl?: string;
  bio?: string;
  updatedAt?: string;
  /**
   * ISO timestamp: last time the user focused the Notifications tab (server-synced for badge/push).
   */
  notificationsBadgeClearedAt?: string;
}

export interface ProfileUpdates {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  preferredLanguage?: string;
}

export type OnboardingProfileData = {
  firstName: string;
  lastName: string;
  /** ISO-8601 date string (YYYY-MM-DD) */
  birthDate?: string;
  country?: string;
  preferredLanguage?: string;
};

/** Notification preference settings per user. Stored in notification_preferences table. */
export interface NotificationPreferences {
  userId: string;
  eventsEnabled: boolean;
  announcementsEnabled: boolean;
  recurringMeetingsEnabled: boolean;
  messagesEnabled: boolean;
  updatedAt?: string;
}

/** Partial updates for notification preferences. */
export interface NotificationPreferencesUpdates {
  eventsEnabled?: boolean;
  announcementsEnabled?: boolean;
  recurringMeetingsEnabled?: boolean;
  messagesEnabled?: boolean;
}

/** Group announcement lifecycle (legacy rows may still be cancelled). */
export type AnnouncementStatus = 'published' | 'cancelled';

/** Announcement in a group (push + in-app). */
export interface Announcement {
  id: string;
  groupId: string;
  createdByUserId: string;
  title: string;
  body: string;
  /** Online meeting URL (Zoom, Meet, etc.); optional. */
  meetingLink: string;
  status: AnnouncementStatus;
  publishedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
}

/** Create announcement (published immediately; push sent via Edge after insert). */
export interface CreateAnnouncementInput {
  title: string;
  body: string;
  meetingLink: string;
}

/** Platform-wide announcement shown at the top of the home feed. */
export interface GlobalAnnouncement {
  id: string;
  title: string;
  description: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateGlobalAnnouncementInput {
  title: string;
  description: string;
}

/** Group event lifecycle. */
export type GroupEventStatus = 'active' | 'cancelled';

/** RSVP response for a group event. */
export type EventRsvpResponse = 'going' | 'maybe' | 'not_going';

/** Scheduled event in a group (with linked discussion thread). */
export interface GroupEvent {
  id: string;
  groupId: string;
  createdByUserId: string;
  title: string;
  description: string;
  startsAt: string;
  requiresRsvp: boolean;
  status: GroupEventStatus;
  cancelledAt?: string;
  discussionId: string;
  createdAt: string;
  /** Address or venue name (optional). */
  location: string;
  /** Online meeting URL (Zoom, Meet, etc.); optional. */
  meetingLink: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  /** Count of members who responded "going" (when fetched with list). */
  goingCount?: number;
  /** Count of members who responded "maybe" (when fetched with list). */
  maybeCount?: number;
}

export interface CreateGroupEventInput {
  title: string;
  description: string;
  startsAt: string;
  requiresRsvp: boolean;
  location: string;
  meetingLink: string;
}

export interface UpdateGroupEventInput {
  title: string;
  description: string;
  startsAt: string;
  requiresRsvp: boolean;
  location: string;
  meetingLink: string;
}

/** How often a recurring ministry meeting repeats (wall clock in `timezone`). */
export type RecurringMeetingFrequency = 'weekly' | 'biweekly' | 'monthly_nth';

/** Standing / recurring meeting info for a ministry group (not a dated event). */
export interface GroupRecurringMeeting {
  id: string;
  groupId: string;
  createdByUserId: string;
  title: string;
  description: string;
  location: string;
  meetingLink: string;
  recurrenceFrequency: RecurringMeetingFrequency;
  /** 0 = Sunday … 6 = Saturday (JavaScript `Date.getDay`). */
  weekday: number;
  /** Local wall time in `timezone`, `HH:mm` or `HH:mm:ss`. */
  timeLocal: string;
  /** IANA timezone for `timeLocal` and weekday interpretation. */
  timezone: string;
  /** 1–4 = first…fourth; -1 = last. Only when `recurrenceFrequency === 'monthly_nth'`. */
  monthWeekOrdinal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRecurringMeetingInput {
  title: string;
  description: string;
  location: string;
  meetingLink: string;
  recurrenceFrequency: RecurringMeetingFrequency;
  weekday: number;
  timeLocal: string;
  timezone: string;
  monthWeekOrdinal?: number;
}

export interface UpdateGroupRecurringMeetingInput {
  title: string;
  description: string;
  location: string;
  meetingLink: string;
  recurrenceFrequency: RecurringMeetingFrequency;
  weekday: number;
  timeLocal: string;
  timezone: string;
  monthWeekOrdinal?: number;
}

/** One member's RSVP row (for lists and detail). */
export interface EventRsvpAttendee {
  userId: string;
  response: EventRsvpResponse;
  displayName?: string;
  avatarUrl?: string;
  updatedAt: string;
}

/** Per-member settings for a group (e.g. announcements toggle). */
export interface GroupMemberSettings {
  userId: string;
  groupId: string;
  announcementsEnabled: boolean;
  recurringMeetingsEnabled: boolean;
  eventsEnabled: boolean;
  updatedAt?: string;
}

export interface GroupMemberSettingsUpdates {
  announcementsEnabled?: boolean;
  recurringMeetingsEnabled?: boolean;
  eventsEnabled?: boolean;
}

/** Registered Expo push token for a device. */
export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  createdAt?: string;
  updatedAt?: string;
}

/** In-app notification row (group announcement or event); list + unread badge. */
export type InAppNotificationKind = 'announcement' | 'group_event';

export interface InAppNotification {
  id: string;
  kind: InAppNotificationKind;
  groupId: string;
  /** Snapshot of group name when the notification was created. */
  groupName: string;
  announcementId?: string;
  groupEventId?: string;
  title: string;
  summary: string;
  createdAt: string;
  readAt?: string;
}

/**
 * Mark in-app notifications read (RPC).
 * At most one targeting option: specific ids, announcementId, or groupEventId.
 * Omit all targets to mark every unread notification for the user.
 */
export interface MarkInAppNotificationsReadInput {
  userId: string;
  notificationIds?: string[];
  announcementId?: string;
  groupEventId?: string;
}

/** Group type: forum (discussions) or ministry (announcements, events, recurring services). */
export type GroupType = 'forum' | 'ministry';

/** Group (Forum or Ministry). Top-level concept. From groups table. */
export interface Group {
  id: string;
  type: GroupType;
  name: string;
  description?: string;
  bannerImageUrl?: string;
  preferredLanguage: string;
  country: string;
  createdByUserId: string;
  createdAt?: string;
  updatedAt?: string;
  /** Number of members (when fetched with count). */
  memberCount?: number;
}

/** Input for creating a group. */
export interface CreateGroupInput {
  type: GroupType;
  name: string;
  description?: string;
  bannerImageUrl?: string;
  preferredLanguage?: string;
  country?: string;
}

/** Input for updating a group (partial). */
export interface UpdateGroupInput {
  name?: string;
  description?: string;
  bannerImageUrl?: string;
  preferredLanguage?: string;
  country?: string;
}

/**
 * Group membership for community roster. Loaded via `group_members_for_display` (filters
 * platform super_admins already shown as leaders). See lib/groupCommunityDisplay.ts.
 */
export interface GroupMember {
  userId: string;
  groupId: string;
  joinedAt?: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Group admin for community leader list. Loaded via `group_admins_for_display` (hides
 * platform super_admins unless creator or also a member). See lib/groupCommunityDisplay.ts.
 */
export interface GroupAdmin {
  userId: string;
  groupId: string;
  assignedAt?: string;
  /** From profiles when loaded (for avatars / labels). */
  displayName?: string;
  avatarUrl?: string;
}

/** Group discussion post. From group_discussions table. @deprecated Use Discussion/DiscussionPost for Reddit-style topics. */
export interface GroupDiscussion {
  id: string;
  groupId: string;
  userId: string;
  body: string;
  createdAt: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
}

/** Input for creating a group discussion. @deprecated Use CreateDiscussionInput for Reddit-style topics. */
export interface CreateGroupDiscussionInput {
  body: string;
}

/** Reddit-style discussion topic. From discussions table. */
export interface Discussion {
  id: string;
  groupId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
  /** When the discussion was last edited. If present and different from createdAt, show "[edited]". */
  updatedAt?: string;
  postCount?: number;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  groupName?: string;
  /**
   * When this thread is the linked discussion for a group event (`group_events.discussion_id`),
   * replies/reactions are read-only only if the event is cancelled.
   */
  linkedGroupEvent?: {
    id: string;
    status: GroupEventStatus;
    startsAt: string;
  };
}

/** Input for creating a discussion (topic). */
export interface CreateDiscussionInput {
  title: string;
  body: string;
}

/** Input for updating a discussion (partial). */
export interface UpdateDiscussionInput {
  title?: string;
  body?: string;
}

/** Reaction type on a discussion post reply. */
export type PostReactionType = 'prayer' | 'laugh' | 'thumbs_up';

/** Reaction counts per type for a discussion post. */
export interface PostReactionCounts {
  prayer: number;
  laugh: number;
  thumbsUp: number;
}

/** Who gave which reaction on a post. */
export interface PostReactionDetail {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  reactionType: PostReactionType;
}

/** Structured attachment on chat messages and discussion posts. */
export type MessageAttachmentKind = 'image' | 'video' | 'file';

export interface MessageAttachment {
  kind: MessageAttachmentKind;
  /** Public URL of the image, video, or downloadable file. */
  url: string;
  /** Original file name (expected for `file`, optional for video). */
  fileName?: string;
  mimeType?: string;
  /** Video poster image URL (JPEG), optional. */
  thumbnailUrl?: string;
}

/** Reply to a discussion. From discussion_posts table. */
export interface DiscussionPost {
  id: string;
  discussionId: string;
  userId: string;
  body: string;
  createdAt: string;
  /** When the post was last edited. If present and different from createdAt, show "[edited]". */
  updatedAt?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  /** Parent post id when replying to a reply. */
  parentPostId?: string;
  /** Public URLs of attached images (derived from attachments where kind is image). */
  imageUrls?: string[];
  /** Images, videos, and files (preferred for rendering). */
  attachments?: MessageAttachment[];
  /** Counts per reaction type. */
  reactionCounts?: PostReactionCounts;
  /** Reaction types the current user has on this post (when userId provided to fetch). */
  userReactionTypes?: PostReactionType[];
}

/** Input for creating a discussion post (reply). */
export interface CreateDiscussionPostInput {
  body: string;
  /** Public URLs of attached images (must be uploaded first via uploadDiscussionPostImage). */
  imageUrls?: string[];
  /** Structured attachments (preferred). When non-empty, overrides imageUrls for storage. */
  attachments?: MessageAttachment[];
  /** Parent post id when replying to a reply. */
  parentPostId?: string;
}

/** Friend request status. */
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

/** Friend request between two users. From friend_requests table. */
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
  senderDisplayName?: string;
  senderAvatarUrl?: string;
  receiverDisplayName?: string;
  receiverAvatarUrl?: string;
}

/** Input for updating a discussion post (reply). Partial. */
export interface UpdateDiscussionPostInput {
  body?: string;
  /** Public URLs of attached images (must be uploaded first via uploadDiscussionPostImage). */
  imageUrls?: string[];
  /** When set, replaces stored attachments (and derived image_urls). */
  attachments?: MessageAttachment[];
}

// --- Chats ---

/** Chat (DM or group chat). */
export interface Chat {
  id: string;
  createdByUserId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
  /** Last message preview when listing chats. */
  lastMessagePreview?: string;
  /** Last message timestamp. */
  lastMessageAt?: string;
  /** Member count. */
  memberCount?: number;
  /** Members with displayName, avatarUrl (when enriched, e.g. getChat). */
  members?: ChatMember[];
  /** Comma-separated display names of other participants (for list view when no name). */
  participantDisplayNames?: string;
  /** Number of unread messages for the current user. */
  unreadCount?: number;
}

/** Chat member. */
export interface ChatMember {
  userId: string;
  chatId: string;
  joinedAt?: string;
  displayName?: string;
  avatarUrl?: string;
}

/** Input for creating a chat. */
export interface CreateChatInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  memberUserIds: string[];
}

/** Input for updating a chat (partial). */
export interface UpdateChatInput {
  name?: string;
  description?: string;
  imageUrl?: string;
}

/** Chat message. Same shape as DiscussionPost for component reuse. */
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  parentMessageId?: string;
  imageUrls?: string[];
  attachments?: MessageAttachment[];
  reactionCounts?: PostReactionCounts;
  userReactionTypes?: PostReactionType[];
}

/** Input for creating a chat message. */
export interface CreateChatMessageInput {
  body: string;
  imageUrls?: string[];
  attachments?: MessageAttachment[];
  parentMessageId?: string;
}

/** Input for updating a chat message (partial). */
export interface UpdateChatMessageInput {
  body?: string;
  imageUrls?: string[];
  attachments?: MessageAttachment[];
}

/** Minimal chat message row for shared content index (media, files, link extraction). */
export interface ChatSharedContentMessage {
  id: string;
  createdAt: string;
  body: string;
  imageUrls?: string[];
  attachments?: MessageAttachment[];
}

/** Chat folder (user-defined organization). */
export interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  createdAt?: string;
}

/** Chat folder item (chat in a folder). */
export interface ChatFolderItem {
  folderId: string;
  chatId: string;
  createdAt?: string;
}
