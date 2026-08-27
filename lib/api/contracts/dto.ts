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
  /** Business-card role label, e.g. "Pastor". Visible regardless of friendship (unlike bio). */
  title?: string;
  /** Business-card affiliation, e.g. "Blue Ocean". Visible regardless of friendship (unlike bio). */
  organization?: string;
  /** Free-form business-card labels, e.g. ["Pastor", "Blue Ocean"]. Visible regardless of friendship. */
  tags?: string[];
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
  title?: string;
  organization?: string;
  tags?: string[];
}

export type OnboardingProfileData = {
  firstName: string;
  lastName: string;
  /** ISO-8601 date string (YYYY-MM-DD) */
  birthDate?: string;
  country?: string;
  preferredLanguage?: string;
};

/** Profile fields sent as auth signUp metadata; consumed by the on_auth_user_created DB trigger. */
export type SignUpProfileMetadata = {
  firstName: string;
  lastName: string;
  displayName?: string;
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

/** LMS course belonging to a group; access follows group membership/admin RLS. */
export interface Course {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseInput {
  title: string;
  description?: string;
  coverImageUrl?: string;
  sortOrder: number;
}

export interface UpdateCourseInput {
  title: string;
  description?: string;
  coverImageUrl?: string;
  sortOrder: number;
}

/** Lesson within a course. Video is an embedded YouTube/Vimeo URL, not a file upload. */
export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonInput {
  title: string;
  description?: string;
  videoUrl: string;
  sortOrder: number;
}

export interface UpdateLessonInput {
  title: string;
  description?: string;
  videoUrl: string;
  sortOrder: number;
}

/** Assignment belonging to a group; access follows group membership/admin RLS. */
/** One file within a submission's `files` array or an assignment's `materials` array. */
export interface UploadedFile {
  path: string;
  name: string;
  size?: number;
}

/**
 * What a student is asked to hand in: a file upload (the original behaviour, and the
 * default for every assignment created before quizzes existed) or a set of questions.
 */
export type AssignmentType = 'file' | 'quiz';

/**
 * How one quiz question is answered. `multiple_choice` picks from `options`;
 * `short_answer` and `essay` are both free text and differ only in the size of the
 * input a student is given, since neither can be machine-graded either way.
 */
export type QuizQuestionType = 'multiple_choice' | 'short_answer' | 'essay';

/** One selectable choice. `id` is client-generated and stable across edits. */
export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  assignmentId: string;
  prompt: string;
  questionType: QuizQuestionType;
  /** Empty for the free-text question types. */
  options: QuizOption[];
  /** Multiple choice only: whether more than one option may be picked. */
  allowMultiple: boolean;
  points: number;
  required: boolean;
  sortOrder: number;
  /**
   * Which options are correct. Group admins only: the answer key lives in a separate,
   * admin-readable table, so this is always `undefined` for a student — not merely
   * hidden by the UI.
   */
  correctOptionIds?: string[];
}

/** One question as authored in the quiz builder. `id` absent means a newly added question. */
export interface QuizQuestionInput {
  id?: string;
  prompt: string;
  questionType: QuizQuestionType;
  options: QuizOption[];
  allowMultiple: boolean;
  points: number;
  required: boolean;
  sortOrder: number;
  correctOptionIds?: string[];
}

/** Server-computed verdict for one keyed multiple-choice question. Never carries the key itself. */
export interface QuizAnswerResult {
  questionId: string;
  correct: boolean;
}

/** One student's answer to one question: chosen options, free text, or neither if skipped. */
export interface QuizAnswer {
  questionId: string;
  optionIds?: string[];
  text?: string;
}

export interface Assignment {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  /** ISO timestamp; undefined/absent means no deadline. */
  dueDate?: string;
  createdByUserId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Reference material an instructor attached to the assignment (public bucket). */
  materials: UploadedFile[];
  assignmentType: AssignmentType;
  /** Whether a student may replace a submission they already made. Server-enforced in RLS. */
  allowResubmission: boolean;
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  dueDate?: string;
  sortOrder: number;
  materials?: UploadedFile[];
  /** Defaults to `'file'` when omitted. */
  assignmentType?: AssignmentType;
  /** Defaults to true when omitted. */
  allowResubmission?: boolean;
  /** Written in the same call for a quiz assignment; ignored for a file assignment. */
  questions?: QuizQuestionInput[];
}

export interface UpdateAssignmentInput {
  title: string;
  description?: string;
  dueDate?: string;
  sortOrder: number;
  materials?: UploadedFile[];
  assignmentType?: AssignmentType;
  allowResubmission?: boolean;
  /** undefined leaves the existing questions alone; an array replaces the whole set. */
  questions?: QuizQuestionInput[];
}

/**
 * A student's submission for an assignment. One row per (assignment, user) — resubmitting
 * replaces the files and row in place rather than creating a new one. `feedback`/`score`/
 * `reviewedByUserId`/`reviewedAt` are set only by group admins (server-enforced).
 */
export interface Submission {
  id: string;
  assignmentId: string;
  userId: string;
  /** Always empty for a quiz submission. */
  files: UploadedFile[];
  /** Always empty for a file submission. */
  answers: QuizAnswer[];
  /**
   * Per-question right/wrong, computed server-side. Covers only keyed multiple-choice
   * questions — a written answer has no automatic verdict. Deliberately carries the
   * verdict and not the correct options, so showing a student their results never
   * hands them the answer key.
   */
  answerResults: QuizAnswerResult[];
  submittedAt: string;
  feedback?: string;
  score?: number;
  /**
   * Points scored on the machine-gradable (multiple-choice) questions, out of
   * `autoScoreMax`. Computed server-side on every write; undefined for file
   * assignments and for quizzes with no answer key. Written questions are excluded
   * from both numbers, so this never reads as a zero for an ungraded essay.
   */
  autoScore?: number;
  autoScoreMax?: number;
  reviewedByUserId?: string;
  reviewedAt?: string;
  /** Enriched when fetched by a group admin viewing all submissions. */
  authorDisplayName?: string;
  authorAvatarUrl?: string;
}

/**
 * Input for submitting/resubmitting, replacing whatever this user had before.
 * A file assignment sends `files`; a quiz sends `answers`.
 */
export interface UpsertSubmissionInput {
  files?: { fileUri: string; fileName: string; fileSize?: number; mimeType: string }[];
  answers?: QuizAnswer[];
}

/** Group-admin-only: grade/feedback update for a submission. */
export interface UpdateSubmissionFeedbackInput {
  feedback?: string;
  score?: number;
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
  /** Set when this thread is a course's discussion board (courseId only) or a lesson's Q&A (courseId + lessonId). */
  courseId?: string;
  lessonId?: string;
}

/** Input for creating a discussion (topic). Set courseId (course board) or courseId+lessonId (lesson Q&A) to scope it to the LMS instead of the general group feed. */
export interface CreateDiscussionInput {
  title: string;
  body: string;
  courseId?: string;
  lessonId?: string;
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
export type MessageAttachmentKind = 'image' | 'video' | 'file' | 'audio';

export interface MessageAttachment {
  kind: MessageAttachmentKind;
  /** Public URL of the image, video, audio, or downloadable file. */
  url: string;
  /** Original file name (expected for `file`, optional for video/audio). */
  fileName?: string;
  mimeType?: string;
  /** Video poster image URL (JPEG), optional. */
  thumbnailUrl?: string;
  /** Duration in seconds (voice messages). */
  durationSec?: number;
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
/** A member's standing in a chat: an unaccepted first message is a request. */
export type ChatRequestState = 'accepted' | 'pending' | 'declined';

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
  /**
   * The CALLER's own state on this chat. 'pending' means someone they are not friends
   * with started the conversation and they have not accepted it yet, so it belongs in
   * the requests inbox rather than the main list.
   */
  requestState?: ChatRequestState;
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
  /** When set, the message was soft-deleted; body/attachments are cleared server-side and the UI shows a tombstone. */
  deletedAt?: string;
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
