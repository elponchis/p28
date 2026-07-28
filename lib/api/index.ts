/**
 * Backend facade. App and components import only from here (e.g. api.auth.getSession()).
 * Do not import from lib/api/adapters/ or @supabase/* outside the adapter layer.
 */
import * as supabaseAdapter from './adapters/supabase';

export const auth = supabaseAdapter.auth;
export const data = supabaseAdapter.data;
export const realtime = supabaseAdapter.realtime;

/** Facade object for app usage: api.auth, api.data, api.realtime */
export const api = { auth, data, realtime };

export { getUserFacingError } from '../errors';

export { isApiError } from './contracts';
export type {
  AuthContract,
  AuthStateListener,
  DataContract,
  RealtimeContract,
  RealtimeChannelId,
  RealtimeHandlers,
  ApiError,
  User,
  Session,
  Profile,
  ProfileUpdates,
  OnboardingProfileData,
  Announcement,
  AnnouncementStatus,
  NotificationPreferences,
  NotificationPreferencesUpdates,
  CreateAnnouncementInput,
  CreateGlobalAnnouncementInput,
  GlobalAnnouncement,
  CreateGroupEventInput,
  CreateGroupRecurringMeetingInput,
  EventRsvpAttendee,
  EventRsvpResponse,
  Group,
  GroupType,
  CreateGroupInput,
  UpdateGroupEventInput,
  UpdateGroupRecurringMeetingInput,
  UpdateGroupInput,
  GroupMember,
  GroupMemberSettings,
  GroupMemberSettingsUpdates,
  GroupAdmin,
  GroupEvent,
  GroupEventStatus,
  GroupRecurringMeeting,
  RecurringMeetingFrequency,
  Discussion,
  CreateDiscussionInput,
  UpdateDiscussionInput,
  DiscussionPost,
  CreateDiscussionPostInput,
  UpdateDiscussionPostInput,
  PostReactionCounts,
  PostReactionDetail,
  PostReactionType,
  FriendRequest,
  FriendRequestStatus,
  Chat,
  ChatMember,
  ChatMessage,
  ChatSharedContentMessage,
  ChatFolder,
  ChatFolderItem,
  CreateChatInput,
  UpdateChatInput,
  CreateChatMessageInput,
  UpdateChatMessageInput,
  PushToken,
  InAppNotification,
  InAppNotificationKind,
  MarkInAppNotificationsReadInput,
  MessageAttachment,
  MessageAttachmentKind,
} from './contracts';
