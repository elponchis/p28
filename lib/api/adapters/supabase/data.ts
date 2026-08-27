import type { SupabaseClient } from '@supabase/supabase-js';

import { isAllowedRecurringMeetingTimeZone } from '@/lib/ianaTimeZones';
import {
  attachmentsForApiRow,
  deriveImageUrlsForDb,
  deriveLegacyImageUrls,
  isAllowedMessageAttachmentMimeType,
  MAX_MESSAGE_ATTACHMENT_BYTES,
  mergeAttachmentsForCreate,
  normalizeMimeTypeForAllowlist,
  parseClientAttachments,
} from '@/lib/api/messageAttachments';
import {
  isAllowedSubmissionMimeType,
  MAX_SUBMISSION_FILE_BYTES,
  MAX_SUBMISSION_FILES,
} from '@/lib/api/assignmentSubmissions';
import { parseMeetingLinkInput } from '@/lib/meetingLink';
import type { DataContract, OnUploadProgress } from '../../contracts';
import type { ApiError } from '../../contracts/errors';
import { isApiError } from '../../contracts/guards';
import type {
  Assignment,
  Chat,
  ChatFolder,
  ChatFolderItem,
  ChatMember,
  ChatMessage,
  ChatSharedContentMessage,
  CreateAssignmentInput,
  CreateChatInput,
  CreateChatMessageInput,
  CreateCourseInput,
  CreateDiscussionInput,
  CreateDiscussionPostInput,
  CreateLessonInput,
  Announcement,
  CreateAnnouncementInput,
  CreateGlobalAnnouncementInput,
  GlobalAnnouncement,
  CreateGroupDiscussionInput,
  CreateGroupEventInput,
  CreateGroupRecurringMeetingInput,
  CreateGroupInput,
  Course,
  Discussion,
  DiscussionPost,
  EventRsvpAttendee,
  EventRsvpResponse,
  FriendRequest,
  Group,
  GroupEvent,
  GroupRecurringMeeting,
  Lesson,
  PostReactionDetail,
  RecurringMeetingFrequency,
  GroupAdmin,
  GroupDiscussion,
  GroupMember,
  GroupMemberSettings,
  GroupMemberSettingsUpdates,
  InAppNotification,
  MarkInAppNotificationsReadInput,
  NotificationPreferences,
  NotificationPreferencesUpdates,
  OnboardingProfileData,
  PostReactionType,
  Profile,
  ProfileUpdates,
  PushToken,
  QuizAnswer,
  QuizAnswerResult,
  QuizOption,
  QuizQuestion,
  QuizQuestionInput,
  QuizQuestionType,
  Submission,
  UpdateAssignmentInput,
  UpdateChatInput,
  UpdateChatMessageInput,
  UpdateCourseInput,
  UpdateDiscussionInput,
  UpdateDiscussionPostInput,
  UpdateGroupEventInput,
  UpdateGroupRecurringMeetingInput,
  UpdateGroupInput,
  UpdateLessonInput,
  UpdateSubmissionFeedbackInput,
  UploadedFile,
  UpsertSubmissionInput,
} from '../../contracts/dto';

function toApiError(err: unknown): ApiError {
  if (err && typeof err === 'object') {
    const e = err as Error & { code?: string; message?: string };
    const code = e.code;
    if (code === 'PGRST116') {
      return { message: 'Resource not found', code: 'NOT_FOUND' };
    }
    let message =
      typeof e.message === 'string' ? e.message : code ? String(code) : 'An error occurred';
    if (code === '23505') {
      if (message.includes('group_members_pkey')) {
        return {
          message: 'You have already joined this group',
          code: 'ALREADY_EXISTS',
        };
      } else if (message.includes('group_admins_pkey')) {
        return {
          message: 'User is already an admin for this group',
          code: 'ALREADY_EXISTS',
        };
      } else if (message.includes('app_roles_pkey')) {
        return {
          message: 'User already has an app role',
          code: 'ALREADY_EXISTS',
        };
      } else if (message.includes('friendships_pkey')) {
        return {
          message: 'Already friends with this user',
          code: 'ALREADY_EXISTS',
        };
      } else if (message.includes('friend_requests_unique_pending')) {
        return {
          message: 'Friend request already sent',
          code: 'ALREADY_EXISTS',
        };
      }
    }
    return { message, code };
  }
  return { message: String(err ?? 'An error occurred') };
}

/** Supabase storage URL path segment for the avatars bucket (public or authenticated). */
const AVATARS_BUCKET_SEGMENT = '/avatars/';

/** Infer image extension/content type from URI (e.g. .png -> image/png). */
function contentTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Identify an image from its magic number. Authoritative where a file extension is
 * only a guess — a mislabelled upload can be rejected by a bucket's allowed_mime_types
 * and reaches viewers with the wrong type.
 */
function sniffImageContentType(bytes: Uint8Array): string | null {
  const at = (i: number) => bytes[i];
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    at(0) === 0x89 &&
    at(1) === 0x50 &&
    at(2) === 0x4e &&
    at(3) === 0x47 &&
    at(4) === 0x0d &&
    at(5) === 0x0a &&
    at(6) === 0x1a &&
    at(7) === 0x0a
  ) {
    return 'image/png';
  }
  // "GIF87a" / "GIF89a"
  if (bytes.length >= 6 && at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46) {
    return 'image/gif';
  }
  // "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    at(0) === 0x52 &&
    at(1) === 0x49 &&
    at(2) === 0x46 &&
    at(3) === 0x46 &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/** Decode base64 image data to ArrayBuffer. Use this for upload in React Native (Blob from ArrayBuffer is not supported). */
function base64ToArrayBuffer(
  base64: string,
  contentType: string = 'image/jpeg'
): { body: ArrayBuffer; contentType: string } {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // The caller's content type is inferred from the URI, which is extensionless on web.
  return { body: bytes.buffer, contentType: sniffImageContentType(bytes) ?? contentType };
}

/** Result type for image read: body is ArrayBuffer or Blob (Supabase accepts both). */
type ImageUploadBody = { body: ArrayBuffer | Blob; contentType: string };

/** Max longest-edge dimension for auto-resized images (matches typical in-app display sizes). */
const IMAGE_MAX_DIMENSION = 1600;
/** JPEG/WebP compression quality (0..1) applied to auto-resized images. */
const IMAGE_COMPRESS_QUALITY = 0.8;

/**
 * Resizes/compresses an image URI in place before upload, when it's a raster type we can safely
 * re-encode (jpeg/png/webp — not gif, to preserve animation). No-ops (and never throws) when
 * expo-image-manipulator isn't available (e.g. web/Node tests) or manipulation fails, so a
 * compression bug never blocks an upload — it just skips straight to the original file.
 */
async function compressImageIfNeeded(uri: string, contentType: string): Promise<string> {
  if (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') {
    return uri;
  }
  try {
    const Manipulator = require('expo-image-manipulator') as {
      manipulateAsync?: (
        uri: string,
        actions: { resize: { width?: number; height?: number } }[],
        options: { compress: number; format: unknown }
      ) => Promise<{ uri: string }>;
      SaveFormat?: { JPEG: unknown; PNG: unknown; WEBP: unknown };
    };
    if (!Manipulator?.manipulateAsync || !Manipulator.SaveFormat) return uri;
    const format =
      contentType === 'image/png'
        ? Manipulator.SaveFormat.PNG
        : contentType === 'image/webp'
          ? Manipulator.SaveFormat.WEBP
          : Manipulator.SaveFormat.JPEG;
    const result = await Manipulator.manipulateAsync(
      uri,
      [{ resize: { width: IMAGE_MAX_DIMENSION } }],
      { compress: IMAGE_COMPRESS_QUALITY, format }
    );
    return result.uri;
  } catch {
    return uri;
  }
}

/**
 * Reads an image file from a local URI, auto-resizing/compressing it first (see
 * compressImageIfNeeded). Uses expo-file-system/legacy on React Native when available; returns
 * ArrayBuffer to avoid Blob-from-ArrayBuffer in RN. Falls back to fetch for web/Node tests.
 */
async function readImageFile(imageUri: string): Promise<ImageUploadBody> {
  const contentType = contentTypeFromUri(imageUri);
  const uri = await compressImageIfNeeded(imageUri, contentType);

  try {
    const LegacyFS = require('expo-file-system/legacy') as {
      readAsStringAsync?: (uri: string, options: { encoding: string }) => Promise<string>;
      EncodingType?: { Base64: string };
    };
    if (LegacyFS?.readAsStringAsync) {
      const encoding = LegacyFS.EncodingType?.Base64 ?? 'base64';
      const base64 = await LegacyFS.readAsStringAsync(uri, { encoding });
      const { body } = base64ToArrayBuffer(base64, contentType);
      return { body, contentType };
    }
  } catch {
    // Fall through to fetch (e.g. web or Node tests)
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Failed to fetch image');
  }
  const blob = await response.blob();
  const type = blob.type || contentType;
  return { body: blob, contentType: type };
}

/** Reads env Supabase URL/anon key the same way lib/api/adapters/supabase/index.ts does. */
function getSupabaseRestConfig(): { url: string; anonKey: string } {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  };
}

/**
 * Uploads a file to Supabase Storage, optionally reporting 0..1 progress via XMLHttpRequest's
 * `upload.onprogress` (fetch, which supabase-js's storage client uses internally, does not
 * expose upload progress in React Native). Falls back to the plain supabase-js upload when no
 * onProgress is given, or when the session/env isn't available for the XHR path.
 */
async function uploadToStorage(
  getClient: () => SupabaseClient,
  bucket: string,
  path: string,
  body: ArrayBuffer | Blob,
  contentType: string,
  upsert: boolean,
  onProgress?: OnUploadProgress
): Promise<ApiError | null> {
  const client = getClient();

  if (!onProgress) {
    const { error } = await client.storage.from(bucket).upload(path, body, { upsert, contentType });
    return error ? toApiError(error) : null;
  }

  const { url: supabaseUrl, anonKey } = getSupabaseRestConfig();
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!supabaseUrl || !anonKey || !token) {
    const { error } = await client.storage.from(bucket).upload(path, body, { upsert, contentType });
    return error ? toApiError(error) : null;
  }

  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const objectUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodedPath}`;

  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', objectUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', anonKey);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('x-upsert', String(upsert));
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(1);
          resolve();
        } else {
          // The body carries Storage's actual explanation (e.g. an RLS denial or a
          // rejected mime type); without it a failed upload is undiagnosable.
          const detail = (xhr.responseText ?? '').trim().slice(0, 500);
          reject(
            new Error(
              detail
                ? `Upload failed (${xhr.status}): ${detail}`
                : `Upload failed with status ${xhr.status}`
            )
          );
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(body as XMLHttpRequestBodyInit);
    });
    return null;
  } catch (e) {
    return toApiError(e);
  }
}

async function getUriSizeBytes(uri: string): Promise<number | undefined> {
  try {
    const LegacyFS = require('expo-file-system/legacy') as {
      getInfoAsync?: (path: string) => Promise<{ exists: boolean; size?: number }>;
    };
    if (LegacyFS?.getInfoAsync) {
      const info = await LegacyFS.getInfoAsync(uri);
      if (info.exists && typeof info.size === 'number') return info.size;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function sanitizeStorageFileSegment(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').trim();
  return (cleaned.length > 0 ? cleaned : 'file').slice(0, 120);
}

/**
 * Read arbitrary binary upload (image / video / document). Validates MIME allowlist and size cap;
 * both default to the chat/discussion attachment policy but can be overridden (e.g. for
 * assignment submissions, which have their own allowlist).
 */
async function readBinaryFile(
  uri: string,
  contentType: string,
  base64Data?: string | null,
  options?: { isAllowed?: (mime: string) => boolean; maxBytes?: number }
): Promise<ImageUploadBody> {
  const isAllowed = options?.isAllowed ?? isAllowedMessageAttachmentMimeType;
  const maxBytes = options?.maxBytes ?? MAX_MESSAGE_ATTACHMENT_BYTES;
  const mime = normalizeMimeTypeForAllowlist(contentType);
  if (!isAllowed(mime)) {
    throw new Error('File type not allowed');
  }

  const size =
    base64Data == null || base64Data.length === 0 ? await getUriSizeBytes(uri) : undefined;
  if (size !== undefined && size > maxBytes) {
    throw new Error('File is too large');
  }

  if (base64Data != null && base64Data.length > 0) {
    const { body } = base64ToArrayBuffer(base64Data, mime);
    if (body.byteLength > maxBytes) {
      throw new Error('File is too large');
    }
    return { body, contentType: mime };
  }

  try {
    const response = await fetch(uri);
    if (response.ok) {
      const blob = await response.blob();
      const type = normalizeMimeTypeForAllowlist(blob.type || mime);
      if (!isAllowed(type)) {
        throw new Error('File type not allowed');
      }
      if (blob.size > maxBytes) {
        throw new Error('File is too large');
      }
      return { body: blob, contentType: type };
    }
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'File is too large' || e.message === 'File type not allowed')
    ) {
      throw e;
    }
    /* fall through */
  }

  try {
    const LegacyFS = require('expo-file-system/legacy') as {
      readAsStringAsync?: (u: string, options: { encoding: string }) => Promise<string>;
      EncodingType?: { Base64: string };
    };
    if (LegacyFS?.readAsStringAsync) {
      const encoding = LegacyFS.EncodingType?.Base64 ?? 'base64';
      const base64 = await LegacyFS.readAsStringAsync(uri, { encoding });
      const { body } = base64ToArrayBuffer(base64, mime);
      if (body.byteLength > maxBytes) {
        throw new Error('File is too large');
      }
      return { body, contentType: mime };
    }
  } catch (e) {
    if (
      e instanceof Error &&
      (e.message === 'File is too large' || e.message === 'File type not allowed')
    ) {
      throw e;
    }
    /* fall through */
  }

  throw new Error('Failed to read file');
}

/**
 * Extracts storage path from a Supabase storage URL, or returns undefined.
 * Handles both public (e.g. .../object/public/avatars/[path]) and other URL shapes.
 */
function avatarPathFromPublicUrl(avatarUrl: string): string | undefined {
  const idx = avatarUrl.indexOf(AVATARS_BUCKET_SEGMENT);
  if (idx === -1) return undefined;
  const withQuery = avatarUrl.slice(idx + AVATARS_BUCKET_SEGMENT.length);
  const path = withQuery.split('?')[0]?.trim();
  return path || undefined;
}

/**
 * Resolves avatar URL to a signed URL so it works for private buckets. Returns the
 * original URL if resolution fails (e.g. not our storage URL, or signed URL error).
 */
async function resolveAvatarDisplayUrl(
  getClient: () => SupabaseClient,
  avatarUrl: string
): Promise<string> {
  const path = avatarPathFromPublicUrl(avatarUrl);
  if (!path) return avatarUrl;
  try {
    const { data, error } = await getClient()
      .storage.from('avatars')
      .createSignedUrl(path, 60 * 60); // 1 hour
    if (error || !data?.signedUrl) return avatarUrl;
    return data.signedUrl;
  } catch {
    return avatarUrl;
  }
}

/** Display fields for stacked avatars / member rows (name + resolved avatar URL). */
async function fetchProfileDisplayByUserIds(
  getClient: () => SupabaseClient,
  userIds: string[]
): Promise<Map<string, { displayName?: string; avatarUrl?: string }>> {
  const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
  const unique = [...new Set(userIds)];
  for (const uid of unique) {
    const { data: p } = await getClient()
      .from('profiles')
      .select('display_name, first_name, last_name, avatar_url, email')
      .eq('user_id', uid)
      .maybeSingle();
    if (!p) continue;
    const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    let displayName: string | undefined = p.display_name?.trim() || derivedDisplayName || undefined;
    if (!displayName) {
      const email = typeof p.email === 'string' ? p.email.trim() : '';
      if (email) {
        const local = email.split('@')[0]?.trim();
        if (local) displayName = local;
      }
    }
    let avatarUrl = p.avatar_url ?? undefined;
    if (avatarUrl) {
      avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
    }
    profileMap.set(uid, { displayName, avatarUrl });
  }
  return profileMap;
}

function mapNotificationPrefsRow(row: {
  user_id: string;
  events_enabled: boolean;
  announcements_enabled: boolean;
  recurring_meetings_enabled?: boolean | null;
  messages_enabled: boolean;
  updated_at?: string | null;
}): NotificationPreferences {
  return {
    userId: row.user_id,
    eventsEnabled: row.events_enabled ?? true,
    announcementsEnabled: row.announcements_enabled ?? true,
    recurringMeetingsEnabled: row.recurring_meetings_enabled ?? true,
    messagesEnabled: row.messages_enabled ?? true,
    updatedAt: row.updated_at ?? undefined,
  };
}

type GroupRow = {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  banner_image_url?: string | null;
  preferred_language?: string | null;
  country?: string | null;
  created_by_user_id: string;
  created_at?: string | null;
  updated_at?: string | null;
  group_members?: Array<{ count: number }>;
};

function mapGroupRow(row: GroupRow): Group {
  const memberCount =
    Array.isArray(row.group_members) && row.group_members[0]?.count != null
      ? row.group_members[0].count
      : undefined;
  return {
    id: row.id,
    type: row.type as 'forum' | 'ministry',
    name: row.name,
    description: row.description ?? undefined,
    bannerImageUrl: row.banner_image_url ?? undefined,
    preferredLanguage: row.preferred_language ?? 'en',
    country: row.country ?? 'Online',
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    memberCount,
  };
}

function mapGroupMemberRow(
  row: { user_id: string; group_id: string; joined_at?: string | null },
  profile?: { displayName?: string; avatarUrl?: string } | null
): GroupMember {
  return {
    userId: row.user_id,
    groupId: row.group_id,
    joinedAt: row.joined_at ?? undefined,
    displayName: profile?.displayName,
    avatarUrl: profile?.avatarUrl,
  };
}

function mapGroupAdminRow(
  row: { user_id: string; group_id: string; assigned_at?: string | null },
  profile?: { displayName?: string; avatarUrl?: string } | null
): GroupAdmin {
  return {
    userId: row.user_id,
    groupId: row.group_id,
    assignedAt: row.assigned_at ?? undefined,
    displayName: profile?.displayName,
    avatarUrl: profile?.avatarUrl,
  };
}

type AnnouncementRow = {
  id: string;
  group_id: string;
  created_by_user_id: string;
  title: string;
  body: string;
  meeting_link?: string | null;
  status: string;
  published_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
};

function mapAnnouncementRow(
  row: AnnouncementRow,
  profile?: { displayName?: string; avatarUrl?: string } | null
): Announcement {
  return {
    id: row.id,
    groupId: row.group_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    body: row.body,
    meetingLink: row.meeting_link ?? '',
    status: row.status as Announcement['status'],
    publishedAt: row.published_at ?? undefined,
    cancelledAt: row.cancelled_at ?? undefined,
    createdAt: row.created_at,
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl,
  };
}

type GlobalAnnouncementRow = {
  id: string;
  title: string;
  description: string;
  created_by_user_id: string;
  created_at: string;
};

function mapGlobalAnnouncementRow(row: GlobalAnnouncementRow): GlobalAnnouncement {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

type InAppNotificationRow = {
  id: string;
  user_id: string;
  group_id: string;
  group_name: string;
  kind: 'announcement' | 'group_event';
  announcement_id: string | null;
  group_event_id: string | null;
  title: string;
  summary: string;
  created_at: string;
  read_at: string | null;
};

function mapInAppNotificationRow(row: InAppNotificationRow): InAppNotification {
  return {
    id: row.id,
    kind: row.kind,
    groupId: row.group_id,
    groupName: row.group_name ?? '',
    announcementId: row.announcement_id ?? undefined,
    groupEventId: row.group_event_id ?? undefined,
    title: row.title,
    summary: row.summary,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  };
}

type GroupEventRow = {
  id: string;
  group_id: string;
  created_by_user_id: string;
  title: string;
  description: string;
  starts_at: string;
  requires_rsvp: boolean;
  status: string;
  cancelled_at?: string | null;
  discussion_id: string;
  created_at: string;
  location?: string | null;
  meeting_link?: string | null;
};

function mapGroupEventRow(
  row: GroupEventRow,
  profile?: { displayName?: string; avatarUrl?: string } | null,
  counts?: { going: number; maybe: number }
): GroupEvent {
  return {
    id: row.id,
    groupId: row.group_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description ?? '',
    startsAt: row.starts_at,
    requiresRsvp: row.requires_rsvp,
    status: row.status as GroupEvent['status'],
    cancelledAt: row.cancelled_at ?? undefined,
    discussionId: row.discussion_id,
    createdAt: row.created_at,
    location: row.location ?? '',
    meetingLink: row.meeting_link ?? '',
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl,
    goingCount: counts?.going,
    maybeCount: counts?.maybe,
  };
}

type GroupRecurringMeetingRow = {
  id: string;
  group_id: string;
  created_by_user_id: string;
  title: string;
  description: string;
  location: string;
  meeting_link: string | null;
  recurrence_frequency: string;
  weekday: number;
  time_local: string;
  timezone: string;
  month_week_ordinal: number | null;
  created_at: string;
  updated_at: string;
};

function normalizeTimeLocalForDb(raw: string): string {
  const t = raw.trim();
  const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(t);
  if (!m) return '00:00:00';
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  const s = m[3] !== undefined ? Math.min(59, Math.max(0, parseInt(m[3], 10))) : 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function mapGroupRecurringMeetingRow(row: GroupRecurringMeetingRow): GroupRecurringMeeting {
  const tl = row.time_local?.length >= 5 ? row.time_local.slice(0, 5) : (row.time_local ?? '');
  return {
    id: row.id,
    groupId: row.group_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description ?? '',
    location: row.location ?? '',
    meetingLink: row.meeting_link ?? '',
    recurrenceFrequency: row.recurrence_frequency as RecurringMeetingFrequency,
    weekday: row.weekday,
    timeLocal: tl,
    timezone: row.timezone,
    monthWeekOrdinal: row.month_week_ordinal ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type CourseRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapCourseRow(row: CourseRow): Course {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    description: row.description ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapLessonRow(row: LessonRow): Lesson {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description ?? undefined,
    videoUrl: row.video_url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Raw shape stored in a `files`/`materials` JSONB array column. */
type UploadedFileRow = { path: string; name: string; size?: number | null };

function mapUploadedFileRows(rows: unknown): UploadedFile[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r): r is UploadedFileRow => !!r && typeof r === 'object' && 'path' in r && 'name' in r)
    .map((r) => ({ path: r.path, name: r.name, size: r.size ?? undefined }));
}

type AssignmentRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_by_user_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  materials: unknown;
  assignment_type: string | null;
  allow_resubmission: boolean | null;
};

function mapAssignmentRow(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    groupId: row.group_id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date ?? undefined,
    createdByUserId: row.created_by_user_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    materials: mapUploadedFileRows(row.materials),
    assignmentType: row.assignment_type === 'quiz' ? 'quiz' : 'file',
    // Older rows predate the column; they were resubmittable, so null reads as true.
    allowResubmission: row.allow_resubmission !== false,
  };
}

const ASSIGNMENT_ROW_COLUMNS =
  'id, group_id, title, description, due_date, created_by_user_id, sort_order, created_at, updated_at, materials, assignment_type, allow_resubmission';

type QuizQuestionRow = {
  id: string;
  assignment_id: string;
  prompt: string;
  question_type: string;
  options: unknown;
  allow_multiple: boolean;
  points: number;
  required: boolean;
  sort_order: number;
};

const QUIZ_QUESTION_ROW_COLUMNS =
  'id, assignment_id, prompt, question_type, options, allow_multiple, points, required, sort_order';

function mapQuizOptionRows(value: unknown): QuizOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
    .map((o) => ({ id: String(o.id ?? ''), text: String(o.text ?? '') }))
    .filter((o) => !!o.id);
}

function mapQuizQuestionRow(row: QuizQuestionRow, correctOptionIds?: string[]): QuizQuestion {
  const questionType: QuizQuestionType =
    row.question_type === 'multiple_choice' || row.question_type === 'essay'
      ? row.question_type
      : 'short_answer';
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    prompt: row.prompt,
    questionType,
    options: mapQuizOptionRows(row.options),
    allowMultiple: !!row.allow_multiple,
    points: row.points,
    required: !!row.required,
    sortOrder: row.sort_order,
    correctOptionIds,
  };
}

/**
 * Writes the quiz builder's question list over whatever the assignment currently has.
 *
 * Questions carry their id through an edit rather than being dropped and recreated, so a
 * student who already answered question 3 still has an answer attached to question 3
 * afterwards — answers are stored as a JSONB snapshot keyed by question id, and recreating
 * the rows would orphan every one of them.
 */
async function syncAssignmentQuestions(
  getClient: () => SupabaseClient,
  assignmentId: string,
  questions: QuizQuestionInput[]
): Promise<ApiError | null> {
  const client = getClient();

  const { data: existingRows, error: existingError } = await client
    .from('assignment_questions')
    .select('id')
    .eq('assignment_id', assignmentId);
  if (existingError) return toApiError(existingError);

  const existingIds = new Set(((existingRows ?? []) as { id: string }[]).map((r) => r.id));
  const keptIds = new Set(questions.map((q) => q.id).filter((id): id is string => !!id));

  const removed = [...existingIds].filter((id) => !keptIds.has(id));
  if (removed.length > 0) {
    // The key rows cascade with the question, so they need no separate delete.
    const { error } = await client.from('assignment_questions').delete().in('id', removed);
    if (error) return toApiError(error);
  }

  for (const q of questions) {
    const prompt = q.prompt?.trim();
    if (!prompt) return { message: 'Question text is required', code: 'VALIDATION_ERROR' };

    const isChoice = q.questionType === 'multiple_choice';
    const options = isChoice
      ? q.options.map((o) => ({ id: o.id, text: o.text.trim() })).filter((o) => !!o.text)
      : [];
    if (isChoice && options.length < 2) {
      return {
        message: 'A multiple-choice question needs at least two options',
        code: 'VALIDATION_ERROR',
      };
    }

    const payload = {
      assignment_id: assignmentId,
      prompt,
      question_type: q.questionType,
      options,
      allow_multiple: isChoice ? q.allowMultiple : false,
      points: Number.isFinite(q.points) ? Math.max(0, Math.round(q.points)) : 1,
      required: q.required,
      sort_order: q.sortOrder,
    };

    let questionId = q.id;
    if (questionId && existingIds.has(questionId)) {
      const { error } = await client
        .from('assignment_questions')
        .update(payload)
        .eq('id', questionId);
      if (error) return toApiError(error);
    } else {
      const { data: inserted, error } = await client
        .from('assignment_questions')
        .insert(payload)
        .select('id')
        .single();
      if (error) return toApiError(error);
      questionId = (inserted as { id: string }).id;
    }

    // Only options that still exist can be correct — dropping an option in the builder
    // must not leave it silently marked as the answer.
    const optionIds = new Set(options.map((o) => o.id));
    const correct = isChoice ? (q.correctOptionIds ?? []).filter((id) => optionIds.has(id)) : [];
    const { error: keyError } = await client.from('assignment_question_keys').upsert(
      {
        question_id: questionId,
        assignment_id: assignmentId,
        correct_option_ids: correct,
      },
      { onConflict: 'question_id' }
    );
    if (keyError) return toApiError(keyError);
  }

  return null;
}

function mapQuizAnswerResultRows(value: unknown): QuizAnswerResult[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({ questionId: String(r.questionId ?? ''), correct: r.correct === true }))
    .filter((r) => !!r.questionId);
}

function mapQuizAnswerRows(value: unknown): QuizAnswer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map((a) => ({
      questionId: String(a.questionId ?? ''),
      optionIds: Array.isArray(a.optionIds) ? a.optionIds.map(String) : undefined,
      text: typeof a.text === 'string' ? a.text : undefined,
    }))
    .filter((a) => !!a.questionId);
}

type SubmissionRow = {
  id: string;
  assignment_id: string;
  user_id: string;
  files: unknown;
  answers: unknown;
  answer_results: unknown;
  submitted_at: string;
  feedback: string | null;
  score: number | null;
  auto_score: number | null;
  auto_score_max: number | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
};

function mapSubmissionRow(
  row: SubmissionRow,
  profile?: { displayName?: string; avatarUrl?: string }
): Submission {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    userId: row.user_id,
    files: mapUploadedFileRows(row.files),
    answers: mapQuizAnswerRows(row.answers),
    answerResults: mapQuizAnswerResultRows(row.answer_results),
    submittedAt: row.submitted_at,
    feedback: row.feedback ?? undefined,
    score: row.score ?? undefined,
    autoScore: row.auto_score ?? undefined,
    autoScoreMax: row.auto_score_max ?? undefined,
    reviewedByUserId: row.reviewed_by_user_id ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl,
  };
}

const SUBMISSION_ROW_COLUMNS =
  'id, assignment_id, user_id, files, answers, answer_results, submitted_at, feedback, score, auto_score, auto_score_max, reviewed_by_user_id, reviewed_at';

function validateRecurringMeetingWrite(
  input: CreateGroupRecurringMeetingInput | UpdateGroupRecurringMeetingInput
): ApiError | null {
  const title = input.title.trim();
  if (!title) {
    return { message: 'Title is required', code: 'VALIDATION_ERROR' };
  }
  if (input.weekday < 0 || input.weekday > 6) {
    return { message: 'Invalid weekday', code: 'VALIDATION_ERROR' };
  }
  if (!['weekly', 'biweekly', 'monthly_nth'].includes(input.recurrenceFrequency)) {
    return { message: 'Invalid recurrence', code: 'VALIDATION_ERROR' };
  }
  if (input.recurrenceFrequency === 'monthly_nth') {
    const o = input.monthWeekOrdinal;
    if (o === undefined || !((o >= 1 && o <= 4) || o === -1)) {
      return { message: 'Choose which week of the month', code: 'VALIDATION_ERROR' };
    }
  }
  if (!isAllowedRecurringMeetingTimeZone(input.timezone)) {
    return { message: 'Invalid timezone', code: 'VALIDATION_ERROR' };
  }
  return null;
}

async function loadProfileMapForUserIds(
  getClient: () => SupabaseClient,
  userIds: string[]
): Promise<Map<string, { displayName?: string; avatarUrl?: string }>> {
  const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
  const client = getClient();
  for (const uid of userIds) {
    const { data: p } = await client
      .from('profiles')
      .select('display_name, first_name, last_name, avatar_url')
      .eq('user_id', uid)
      .maybeSingle();
    if (p) {
      const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
      const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
      let avatarUrl = p.avatar_url ?? undefined;
      if (avatarUrl) {
        avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
      }
      profileMap.set(uid, { displayName, avatarUrl });
    }
  }
  return profileMap;
}

async function loadEventRsvpCounts(
  client: SupabaseClient,
  eventIds: string[]
): Promise<Map<string, { going: number; maybe: number }>> {
  const map = new Map<string, { going: number; maybe: number }>();
  if (eventIds.length === 0) return map;
  const { data: rows, error } = await client
    .from('event_rsvps')
    .select('event_id, response')
    .in('event_id', eventIds);
  if (error || !rows) return map;
  for (const r of rows as { event_id: string; response: string }[]) {
    const cur = map.get(r.event_id) ?? { going: 0, maybe: 0 };
    if (r.response === 'going') cur.going += 1;
    if (r.response === 'maybe') cur.maybe += 1;
    map.set(r.event_id, cur);
  }
  return map;
}

type GroupDiscussionRow = {
  id: string;
  group_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

function mapGroupDiscussionRow(
  row: GroupDiscussionRow,
  profile?: { displayName?: string; avatarUrl?: string } | null
): GroupDiscussion {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl,
  };
}

type DiscussionRow = {
  id: string;
  group_id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at?: string;
  course_id?: string | null;
  lesson_id?: string | null;
};

function mapDiscussionRow(
  row: DiscussionRow,
  profile?: { displayName?: string; avatarUrl?: string } | null,
  groupName?: string | null,
  postCount?: number,
  linkedGroupEvent?: Discussion['linkedGroupEvent']
): Discussion {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postCount: postCount ?? 0,
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl,
    groupName: groupName ?? undefined,
    courseId: row.course_id ?? undefined,
    lessonId: row.lesson_id ?? undefined,
    ...(linkedGroupEvent ? { linkedGroupEvent } : {}),
  };
}

function isGroupEventDiscussionLockedRow(ge: { status: string }): boolean {
  return ge.status === 'cancelled';
}

type DiscussionPostRow = {
  id: string;
  discussion_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at?: string;
  parent_post_id?: string | null;
  image_urls?: string[] | null;
  attachments?: unknown;
};

function mapDiscussionPostRow(
  row: DiscussionPostRow,
  profile?: { displayName?: string; avatarUrl?: string } | null,
  reactionCounts?: { prayer: number; laugh: number; thumbsUp: number },
  userReactionTypes?: string[]
): DiscussionPost {
  const attachments = attachmentsForApiRow(row.attachments, row.image_urls);
  const imageUrls = deriveLegacyImageUrls(attachments);
  return {
    id: row.id,
    discussionId: row.discussion_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    parentPostId: row.parent_post_id ?? undefined,
    authorDisplayName: profile?.displayName,
    authorAvatarUrl: profile?.avatarUrl,
    imageUrls,
    attachments: attachments && attachments.length > 0 ? attachments : undefined,
    reactionCounts: reactionCounts ?? { prayer: 0, laugh: 0, thumbsUp: 0 },
    userReactionTypes:
      userReactionTypes?.filter(
        (t): t is 'prayer' | 'laugh' | 'thumbs_up' =>
          t === 'prayer' || t === 'laugh' || t === 'thumbs_up'
      ) ?? undefined,
  };
}

type FriendRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function mapFriendRequestRow(
  row: FriendRequestRow,
  senderProfile?: { displayName?: string; avatarUrl?: string } | null,
  receiverProfile?: { displayName?: string; avatarUrl?: string } | null
): FriendRequest {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status as FriendRequest['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    senderDisplayName: senderProfile?.displayName,
    senderAvatarUrl: senderProfile?.avatarUrl,
    receiverDisplayName: receiverProfile?.displayName,
    receiverAvatarUrl: receiverProfile?.avatarUrl,
  };
}

function mapRow(row: {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  country?: string | null;
  preferred_language?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  title?: string | null;
  organization?: string | null;
  tags?: string[] | null;
  updated_at?: string | null;
  notifications_badge_cleared_at?: string | null;
}): Profile {
  const derivedDisplayName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  const displayName = row.display_name?.trim() || derivedDisplayName || undefined;
  return {
    userId: row.user_id,
    email: row.email ?? undefined,
    displayName: displayName ?? undefined,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    birthDate: row.birth_date ?? undefined,
    country: row.country ?? undefined,
    preferredLanguage: row.preferred_language ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    title: row.title ?? undefined,
    organization: row.organization ?? undefined,
    tags: row.tags ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    notificationsBadgeClearedAt: row.notifications_badge_cleared_at ?? undefined,
  };
}

type InvokeEdgeWithUserJwtResult = { ok: true; data: unknown } | { ok: false; error: ApiError };

/**
 * Refresh session and invoke an Edge Function (Authorization uses current session).
 */
async function invokeEdgeWithUserJwt(
  getClient: () => SupabaseClient,
  functionName: string,
  body: Record<string, unknown>
): Promise<InvokeEdgeWithUserJwtResult> {
  try {
    const client = getClient();
    await client.auth.refreshSession();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      return { ok: false, error: { message: 'Not signed in', code: 'UNAUTHORIZED' } };
    }
    const { data, error } = await client.functions.invoke(functionName, { body });
    if (error) {
      return { ok: false, error: toApiError(error) };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: toApiError(e) };
  }
}

function interpretRemoteErrorPayload(data: unknown): void | ApiError {
  const payload = data as { error?: string } | null;
  if (payload && typeof payload.error === 'string' && payload.error.length > 0) {
    return { message: payload.error, code: 'REMOTE_ERROR' };
  }
  return;
}

/**
 * Invoke push-related Edge Functions; fails on `{ error: string }` JSON body.
 */
async function invokePushEdgeFunctionWithUserJwt(
  getClient: () => SupabaseClient,
  functionName: string,
  body: Record<string, unknown>
): Promise<void | ApiError> {
  const r = await invokeEdgeWithUserJwt(getClient, functionName, body);
  if (!r.ok) return r.error;
  return interpretRemoteErrorPayload(r.data);
}

/**
 * Supabase data adapter. Implements profile operations (Story 1.5),
 * notification preferences (Story 1.6), and group operations (simplified MVP).
 */
export function createSupabaseDataAdapter(getClient: () => SupabaseClient): DataContract {
  return {
    async getProfile(userId: string): Promise<Profile | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('profiles')
          .select(
            'user_id, email, display_name, first_name, last_name, birth_date, country, preferred_language, avatar_url, bio, title, organization, tags, updated_at, notifications_badge_cleared_at'
          )
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        if (!data) return { message: 'Profile not found', code: 'NOT_FOUND' };
        const profile = mapRow(data);
        if (profile.avatarUrl) {
          profile.avatarUrl = await resolveAvatarDisplayUrl(getClient, profile.avatarUrl);
        }
        return profile;
      } catch (e) {
        return toApiError(e);
      }
    },

    async createProfile(userId: string, data: OnboardingProfileData): Promise<Profile | ApiError> {
      try {
        const derivedDisplayName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
        const payload = {
          user_id: userId,
          first_name: data.firstName,
          last_name: data.lastName,
          birth_date: data.birthDate ?? null,
          country: data.country ?? null,
          preferred_language: data.preferredLanguage ?? null,
          display_name: derivedDisplayName || null,
          updated_at: new Date().toISOString(),
        };

        const { data: row, error } = await getClient()
          .from('profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .select(
            'user_id, email, display_name, first_name, last_name, birth_date, country, preferred_language, avatar_url, bio, title, organization, tags, updated_at, notifications_badge_cleared_at'
          )
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Profile not found', code: 'NOT_FOUND' };
        return mapRow(row);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateProfile(userId: string, updates: ProfileUpdates): Promise<Profile | ApiError> {
      try {
        const existing = await this.getProfile(userId);
        const current = ('userId' in existing ? existing : null) as Profile | null;
        const merged: Profile = {
          userId,
          displayName: updates.displayName ?? current?.displayName,
          avatarUrl: updates.avatarUrl ?? current?.avatarUrl,
          bio: updates.bio ?? current?.bio,
          preferredLanguage: updates.preferredLanguage ?? current?.preferredLanguage,
          title: updates.title ?? current?.title,
          organization: updates.organization ?? current?.organization,
          tags: updates.tags ?? current?.tags,
        };

        const payload = {
          user_id: userId,
          display_name: merged.displayName ?? null,
          avatar_url: merged.avatarUrl ?? null,
          bio: merged.bio ?? null,
          preferred_language: merged.preferredLanguage ?? null,
          title: merged.title ?? null,
          organization: merged.organization ?? null,
          tags: merged.tags ?? null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await getClient()
          .from('profiles')
          .upsert(payload, { onConflict: 'user_id' })
          .select(
            'user_id, email, display_name, first_name, last_name, birth_date, country, preferred_language, avatar_url, bio, title, organization, tags, updated_at, notifications_badge_cleared_at'
          )
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Profile not found', code: 'NOT_FOUND' };
        const profile = mapRow(data);
        if (profile.avatarUrl) {
          profile.avatarUrl = await resolveAvatarDisplayUrl(getClient, profile.avatarUrl);
        }
        return profile;
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteAccount(): Promise<void | ApiError> {
      return invokePushEdgeFunctionWithUserJwt(getClient, 'delete-account', {});
    },

    async setNotificationsBadgeClearedAt(
      userId: string,
      clearedAtIso: string
    ): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('profiles')
          .update({
            notifications_badge_cleared_at: clearedAtIso,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getNotificationPreferences(userId: string): Promise<NotificationPreferences | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('notification_preferences')
          .select(
            'user_id, events_enabled, announcements_enabled, recurring_meetings_enabled, messages_enabled, updated_at'
          )
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        if (data) return mapNotificationPrefsRow(data);
        const defaults = {
          user_id: userId,
          events_enabled: true,
          announcements_enabled: true,
          recurring_meetings_enabled: true,
          messages_enabled: true,
          updated_at: new Date().toISOString(),
        };
        const { data: inserted, error: insertError } = await getClient()
          .from('notification_preferences')
          .upsert(defaults, { onConflict: 'user_id' })
          .select(
            'user_id, events_enabled, announcements_enabled, recurring_meetings_enabled, messages_enabled, updated_at'
          )
          .single();
        if (insertError) return toApiError(insertError);
        if (!inserted) return { message: 'Failed to create preferences', code: 'NOT_FOUND' };
        return mapNotificationPrefsRow(inserted);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateNotificationPreferences(
      userId: string,
      updates: NotificationPreferencesUpdates
    ): Promise<NotificationPreferences | ApiError> {
      try {
        const existing = await this.getNotificationPreferences(userId);
        const current = !isApiError(existing) ? existing : null;
        const merged: NotificationPreferences = {
          userId,
          eventsEnabled: updates.eventsEnabled ?? current?.eventsEnabled ?? true,
          announcementsEnabled:
            updates.announcementsEnabled ?? current?.announcementsEnabled ?? true,
          recurringMeetingsEnabled:
            updates.recurringMeetingsEnabled ?? current?.recurringMeetingsEnabled ?? true,
          messagesEnabled: updates.messagesEnabled ?? current?.messagesEnabled ?? true,
          updatedAt: new Date().toISOString(),
        };
        const payload = {
          user_id: userId,
          events_enabled: merged.eventsEnabled,
          announcements_enabled: merged.announcementsEnabled,
          recurring_meetings_enabled: merged.recurringMeetingsEnabled,
          messages_enabled: merged.messagesEnabled,
          updated_at: merged.updatedAt,
        };
        const { data, error } = await getClient()
          .from('notification_preferences')
          .upsert(payload, { onConflict: 'user_id' })
          .select(
            'user_id, events_enabled, announcements_enabled, recurring_meetings_enabled, messages_enabled, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Failed to update preferences', code: 'NOT_FOUND' };
        return mapNotificationPrefsRow(data);
      } catch (e) {
        return toApiError(e);
      }
    },

    async uploadProfileImage(
      userId: string,
      imageUri: string,
      base64Data?: string | null,
      onProgress?: OnUploadProgress
    ): Promise<string | ApiError> {
      try {
        const { body, contentType } =
          base64Data != null && base64Data.length > 0
            ? base64ToArrayBuffer(base64Data, contentTypeFromUri(imageUri))
            : await readImageFile(imageUri);
        const ext =
          contentType === 'image/png'
            ? 'png'
            : contentType === 'image/gif'
              ? 'gif'
              : contentType === 'image/webp'
                ? 'webp'
                : 'jpg';
        const path = `${userId}/avatar.${ext}`;

        const err = await uploadToStorage(
          getClient,
          'avatars',
          path,
          body,
          contentType,
          true,
          onProgress
        );
        if (err) return err;

        const { data } = getClient().storage.from('avatars').getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        return toApiError(e);
      }
    },

    async uploadGroupBannerImage(
      userId: string,
      imageUri: string,
      base64Data?: string | null,
      onProgress?: OnUploadProgress
    ): Promise<string | ApiError> {
      try {
        const { body, contentType } =
          base64Data != null && base64Data.length > 0
            ? base64ToArrayBuffer(base64Data, contentTypeFromUri(imageUri))
            : await readImageFile(imageUri);
        const ext =
          contentType === 'image/png'
            ? 'png'
            : contentType === 'image/gif'
              ? 'gif'
              : contentType === 'image/webp'
                ? 'webp'
                : 'jpg';
        const timestamp = Date.now();
        const path = `${userId}/${timestamp}.${ext}`;

        const err = await uploadToStorage(
          getClient,
          'group-banners',
          path,
          body,
          contentType,
          false,
          onProgress
        );
        if (err) return err;

        const { data } = getClient().storage.from('group-banners').getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        return toApiError(e);
      }
    },

    async uploadDiscussionPostImage(
      userId: string,
      imageUri: string,
      base64Data?: string | null,
      onProgress?: OnUploadProgress
    ): Promise<string | ApiError> {
      try {
        const { body, contentType } =
          base64Data != null && base64Data.length > 0
            ? base64ToArrayBuffer(base64Data, contentTypeFromUri(imageUri))
            : await readImageFile(imageUri);
        const ext =
          contentType === 'image/png'
            ? 'png'
            : contentType === 'image/gif'
              ? 'gif'
              : contentType === 'image/webp'
                ? 'webp'
                : 'jpg';
        const timestamp = Date.now();
        const path = `${userId}/${timestamp}.${ext}`;

        const err = await uploadToStorage(
          getClient,
          'discussion-post-images',
          path,
          body,
          contentType,
          false,
          onProgress
        );
        if (err) return err;

        const { data } = getClient().storage.from('discussion-post-images').getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        return toApiError(e);
      }
    },

    async uploadChatImage(
      userId: string,
      imageUri: string,
      base64Data?: string | null,
      options?: { chatId?: string; onProgress?: OnUploadProgress }
    ): Promise<string | ApiError> {
      try {
        const { body, contentType } =
          base64Data != null && base64Data.length > 0
            ? base64ToArrayBuffer(base64Data, contentTypeFromUri(imageUri))
            : await readImageFile(imageUri);
        const ext =
          contentType === 'image/png'
            ? 'png'
            : contentType === 'image/gif'
              ? 'gif'
              : contentType === 'image/webp'
                ? 'webp'
                : 'jpg';
        const timestamp = Date.now();
        const path = options?.chatId
          ? `avatars/${options.chatId}/${timestamp}.${ext}`
          : `messages/${userId}/${timestamp}.${ext}`;

        const err = await uploadToStorage(
          getClient,
          'chat-images',
          path,
          body,
          contentType,
          false,
          options?.onProgress
        );
        if (err) return err;

        const { data } = getClient().storage.from('chat-images').getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        return toApiError(e);
      }
    },

    async uploadChatMessageAttachment(
      userId: string,
      localUri: string,
      options: {
        contentType: string;
        fileName: string;
        base64Data?: string | null;
        objectKind: 'message' | 'thumbnail';
        onProgress?: OnUploadProgress;
      }
    ): Promise<string | ApiError> {
      try {
        const { body, contentType } = await readBinaryFile(
          localUri,
          options.contentType,
          options.base64Data
        );
        const safe = sanitizeStorageFileSegment(options.fileName);
        const ts = Date.now();
        const path =
          options.objectKind === 'thumbnail'
            ? `messages/${userId}/thumbs/${ts}.jpg`
            : `messages/${userId}/${ts}-${safe}`;

        const err = await uploadToStorage(
          getClient,
          'chat-images',
          path,
          body,
          contentType,
          false,
          options.onProgress
        );
        if (err) return err;
        const { data } = getClient().storage.from('chat-images').getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        if (msg === 'File is too large' || msg === 'File type not allowed') {
          return { message: msg, code: 'VALIDATION_ERROR' };
        }
        return toApiError(e);
      }
    },

    async uploadDiscussionPostAttachment(
      userId: string,
      localUri: string,
      options: {
        contentType: string;
        fileName: string;
        base64Data?: string | null;
        objectKind: 'post' | 'thumbnail';
        onProgress?: OnUploadProgress;
      }
    ): Promise<string | ApiError> {
      try {
        const { body, contentType } = await readBinaryFile(
          localUri,
          options.contentType,
          options.base64Data
        );
        const safe = sanitizeStorageFileSegment(options.fileName);
        const ts = Date.now();
        const path =
          options.objectKind === 'thumbnail'
            ? `${userId}/thumbs/${ts}.jpg`
            : `${userId}/${ts}-${safe}`;

        const err = await uploadToStorage(
          getClient,
          'discussion-post-images',
          path,
          body,
          contentType,
          false,
          options.onProgress
        );
        if (err) return err;
        const { data } = getClient().storage.from('discussion-post-images').getPublicUrl(path);
        return data.publicUrl;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        if (msg === 'File is too large' || msg === 'File type not allowed') {
          return { message: msg, code: 'VALIDATION_ERROR' };
        }
        return toApiError(e);
      }
    },

    async uploadAssignmentMaterial(
      groupId: string,
      userId: string,
      localUri: string,
      options: { contentType: string; fileName: string; onProgress?: OnUploadProgress }
    ): Promise<UploadedFile | ApiError> {
      try {
        const { body, contentType } = await readBinaryFile(
          localUri,
          options.contentType,
          undefined,
          {
            isAllowed: isAllowedSubmissionMimeType,
            maxBytes: MAX_SUBMISSION_FILE_BYTES,
          }
        );
        const safe = sanitizeStorageFileSegment(options.fileName);
        const path = `${groupId}/${userId}/${Date.now()}-${safe}`;

        const err = await uploadToStorage(
          getClient,
          'assignment-materials',
          path,
          body,
          contentType,
          false,
          options.onProgress
        );
        if (err) return err;

        const size = body instanceof ArrayBuffer ? body.byteLength : body.size;
        return { path, name: options.fileName, size };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        if (msg === 'File is too large' || msg === 'File type not allowed') {
          return { message: msg, code: 'VALIDATION_ERROR' };
        }
        return toApiError(e);
      }
    },

    // Groups
    async getGroups(params?: {
      type?: 'forum' | 'ministry';
      search?: string;
    }): Promise<Group[] | ApiError> {
      try {
        let query = getClient()
          .from('groups')
          .select(
            'id, type, name, description, banner_image_url, preferred_language, country, created_by_user_id, created_at, updated_at, group_members(count)'
          )
          .order('name');
        if (params?.type) {
          query = query.eq('type', params.type);
        }
        if (params?.search?.trim()) {
          const term = params.search.trim();
          const pattern = `%${term}%`;
          query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
        }
        const { data, error } = await query;
        if (error) return toApiError(error);
        return (data ?? []).map(mapGroupRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroup(id: string): Promise<Group | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('groups')
          .select(
            'id, type, name, description, banner_image_url, preferred_language, country, created_by_user_id, created_at, updated_at, group_members(count)'
          )
          .eq('id', id)
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Group not found', code: 'NOT_FOUND' };
        return mapGroupRow(data);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createGroup(
      params: CreateGroupInput,
      createdByUserId: string
    ): Promise<Group | ApiError> {
      try {
        const name = params.name?.trim();
        if (!name) {
          return { message: 'Group name is required', code: 'VALIDATION_ERROR' };
        }
        const payload = {
          type: params.type,
          name,
          description: params.description?.trim() || null,
          banner_image_url: params.bannerImageUrl || null,
          preferred_language: params.preferredLanguage ?? 'en',
          country: params.country ?? 'Online',
          created_by_user_id: createdByUserId,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await getClient()
          .from('groups')
          .insert(payload)
          .select(
            'id, type, name, description, banner_image_url, preferred_language, country, created_by_user_id, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Failed to create group', code: 'NOT_FOUND' };
        const groupId = data.id;
        const { error: memError } = await getClient()
          .from('group_members')
          .insert({ group_id: groupId, user_id: createdByUserId });
        if (memError) return toApiError(memError);
        return mapGroupRow(data);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateGroup(id: string, params: UpdateGroupInput): Promise<Group | ApiError> {
      try {
        const payload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (params.name !== undefined) payload.name = params.name;
        if (params.description !== undefined) payload.description = params.description;
        if (params.bannerImageUrl !== undefined) payload.banner_image_url = params.bannerImageUrl;
        if (params.preferredLanguage !== undefined)
          payload.preferred_language = params.preferredLanguage;
        if (params.country !== undefined) payload.country = params.country;

        const { data, error } = await getClient()
          .from('groups')
          .update(payload)
          .eq('id', id)
          .select(
            'id, type, name, description, banner_image_url, preferred_language, country, created_by_user_id, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Group not found', code: 'NOT_FOUND' };
        return mapGroupRow(data);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteGroup(id: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('groups').delete().eq('id', id);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupMembers(groupId: string): Promise<GroupMember[] | ApiError> {
      try {
        const { data: rows, error } = await getClient().rpc('group_members_for_display', {
          p_group_id: groupId,
        });
        if (error) return toApiError(error);
        const members = (rows ?? []) as Array<{
          user_id: string;
          group_id: string;
          joined_at: string;
        }>;
        if (members.length === 0) return [];
        const userIds = members.map((r) => r.user_id);
        const profileMap = await fetchProfileDisplayByUserIds(getClient, userIds);
        return members.map((r) => mapGroupMemberRow(r, profileMap.get(r.user_id) ?? null));
      } catch (e) {
        return toApiError(e);
      }
    },

    async joinGroup(groupId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('group_members')
          .insert({ group_id: groupId, user_id: userId });
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async leaveGroup(groupId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupsForUser(userId: string): Promise<Group[] | ApiError> {
      try {
        const { data: memberships, error: memError } = await getClient()
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);
        if (memError) return toApiError(memError);
        const groupIds = (memberships ?? []).map((m) => m.group_id);
        if (groupIds.length === 0) return [];
        const { data, error } = await getClient()
          .from('groups')
          .select(
            'id, type, name, description, banner_image_url, preferred_language, country, created_by_user_id, created_at, updated_at, group_members(count)'
          )
          .in('id', groupIds)
          .order('name');
        if (error) return toApiError(error);
        return (data ?? []).map(mapGroupRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getFriendIds(userId: string): Promise<string[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('friendships')
          .select('user_id, friend_id')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
        if (error) return toApiError(error);
        return (rows ?? []).map((r) => (r.user_id === userId ? r.friend_id : r.user_id));
      } catch (e) {
        return toApiError(e);
      }
    },

    async areFriends(userId: string, targetUserId: string): Promise<boolean | ApiError> {
      try {
        if (userId === targetUserId) return false;
        const u = userId < targetUserId ? userId : targetUserId;
        const f = userId < targetUserId ? targetUserId : userId;
        const { data, error } = await getClient()
          .from('friendships')
          .select('user_id')
          .eq('user_id', u)
          .eq('friend_id', f)
          .maybeSingle();
        if (error) return toApiError(error);
        return !!data;
      } catch (e) {
        return toApiError(e);
      }
    },

    async addFriend(userId: string, friendId: string): Promise<void | ApiError> {
      try {
        if (userId === friendId) {
          return { message: 'Cannot add yourself as a friend', code: 'VALIDATION_ERROR' };
        }
        const u = userId < friendId ? userId : friendId;
        const f = userId < friendId ? friendId : userId;
        const { error } = await getClient()
          .from('friendships')
          .insert({ user_id: u, friend_id: f });
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeFriend(userId: string, friendId: string): Promise<void | ApiError> {
      try {
        const u = userId < friendId ? userId : friendId;
        const f = userId < friendId ? friendId : userId;
        const { error } = await getClient()
          .from('friendships')
          .delete()
          .eq('user_id', u)
          .eq('friend_id', f);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupAdmins(groupId: string): Promise<GroupAdmin[] | ApiError> {
      try {
        const { data, error } = await getClient().rpc('group_admins_for_display', {
          p_group_id: groupId,
        });
        if (error) return toApiError(error);
        const admins = (data ?? []) as Array<{
          user_id: string;
          group_id: string;
          assigned_at: string;
        }>;
        if (admins.length === 0) return [];
        const userIds = admins.map((r) => r.user_id);
        const profileMap = await fetchProfileDisplayByUserIds(getClient, userIds);
        return admins.map((r) => mapGroupAdminRow(r, profileMap.get(r.user_id) ?? null));
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupAdminsAll(groupId: string): Promise<GroupAdmin[] | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('group_admins')
          .select('user_id, group_id, assigned_at')
          .eq('group_id', groupId)
          .order('assigned_at');
        if (error) return toApiError(error);
        const admins = data ?? [];
        if (admins.length === 0) return [];
        const userIds = admins.map((r) => r.user_id);
        const profileMap = await fetchProfileDisplayByUserIds(getClient, userIds);
        return admins.map((r) => mapGroupAdminRow(r, profileMap.get(r.user_id) ?? null));
      } catch (e) {
        return toApiError(e);
      }
    },

    async isUserGroupAdmin(groupId: string, userId: string): Promise<boolean | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('group_admins')
          .select('user_id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        if (data) return true;
        const { data: roleRow, error: roleError } = await getClient()
          .from('app_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (roleError) return toApiError(roleError);
        return roleRow?.role === 'super_admin';
      } catch (e) {
        return toApiError(e);
      }
    },

    async addGroupAdmin(groupId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('group_admins').insert({
          group_id: groupId,
          user_id: userId,
        });
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeGroupAdmin(groupId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('group_admins')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getAnnouncements(
      groupId: string,
      options?: { discover?: boolean; status?: 'published'; limit?: number }
    ): Promise<Announcement[] | ApiError> {
      try {
        const client = getClient();
        let list: AnnouncementRow[];
        if (options?.discover) {
          const { data: rows, error } = await client.rpc(
            'discovery_published_announcements_for_group',
            { p_group_id: groupId }
          );
          if (error) return toApiError(error);
          list = (rows ?? []) as AnnouncementRow[];
        } else {
          let q = client
            .from('announcements')
            .select(
              'id, group_id, created_by_user_id, title, body, meeting_link, status, published_at, cancelled_at, created_at'
            )
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });
          if (options?.status === 'published') {
            q = q.eq('status', 'published');
          }
          if (options?.limit != null) {
            q = q.limit(options.limit);
          }
          const { data: rows, error } = await q;
          if (error) return toApiError(error);
          list = (rows ?? []) as AnnouncementRow[];
        }
        if (list.length === 0) return [];
        const userIds = [...new Set(list.map((r) => r.created_by_user_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await client
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }
        return list.map((r) => mapAnnouncementRow(r, profileMap.get(r.created_by_user_id)));
      } catch (e) {
        return toApiError(e);
      }
    },

    async getAnnouncement(id: string): Promise<Announcement | ApiError> {
      try {
        const client = getClient();
        const { data: viewerRows, error } = await client.rpc('announcement_for_viewer', {
          p_announcement_id: id,
        });
        if (error) return toApiError(error);
        const row = Array.isArray(viewerRows) ? viewerRows[0] : viewerRows;
        if (!row) return { message: 'Announcement not found', code: 'NOT_FOUND' };
        const r = row as AnnouncementRow;
        const { data: p } = await client
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', r.created_by_user_id)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        return mapAnnouncementRow(r, profile);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createAnnouncement(
      groupId: string,
      userId: string,
      input: CreateAnnouncementInput
    ): Promise<Announcement | ApiError> {
      try {
        const client = getClient();
        const title = input.title.trim();
        const body = input.body.trim();
        if (!title || !body) {
          return { message: 'Title and message are required', code: 'VALIDATION_ERROR' };
        }
        const meetingLinkParsed = parseMeetingLinkInput(input.meetingLink ?? '');
        if (!meetingLinkParsed.ok) {
          return {
            message:
              meetingLinkParsed.reason === 'too_long'
                ? 'Meeting link is too long'
                : 'Enter a valid meeting link (http or https)',
            code: 'VALIDATION_ERROR',
          };
        }
        const now = new Date().toISOString();
        const { data: row, error } = await client
          .from('announcements')
          .insert({
            group_id: groupId,
            created_by_user_id: userId,
            title,
            body,
            meeting_link: meetingLinkParsed.value,
            status: 'published',
            published_at: now,
          })
          .select(
            'id, group_id, created_by_user_id, title, body, meeting_link, status, published_at, cancelled_at, created_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapAnnouncementRow(row as AnnouncementRow, null);
      } catch (e) {
        return toApiError(e);
      }
    },

    async listGlobalAnnouncements(options?: {
      limit?: number;
    }): Promise<GlobalAnnouncement[] | ApiError> {
      try {
        const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);
        const { data, error } = await getClient()
          .from('global_announcements')
          .select('id, title, description, created_by_user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) return toApiError(error);
        return (data ?? []).map((row) => mapGlobalAnnouncementRow(row as GlobalAnnouncementRow));
      } catch (e) {
        return toApiError(e);
      }
    },

    async createGlobalAnnouncement(
      userId: string,
      input: CreateGlobalAnnouncementInput
    ): Promise<GlobalAnnouncement | ApiError> {
      try {
        const title = input.title.trim();
        const description = input.description.trim();
        if (!title || !description) {
          return { message: 'Title and description are required', code: 'VALIDATION_ERROR' };
        }
        const { data: row, error } = await getClient()
          .from('global_announcements')
          .insert({
            title,
            description,
            created_by_user_id: userId,
          })
          .select('id, title, description, created_by_user_id, created_at')
          .single();
        if (error) return toApiError(error);
        return mapGlobalAnnouncementRow(row as GlobalAnnouncementRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async publishAnnouncement(announcementId: string): Promise<void | ApiError> {
      return invokePushEdgeFunctionWithUserJwt(getClient, 'send-announcement', {
        announcementId,
      });
    },

    async notifyGroupEventCreated(eventId: string): Promise<void | ApiError> {
      const r = await invokeEdgeWithUserJwt(getClient, 'send-group-event-created', {
        eventId,
      });
      if (!r.ok) return r.error;
      const remoteErr = interpretRemoteErrorPayload(r.data);
      if (remoteErr) return remoteErr;

      const payload = r.data as {
        ok?: boolean;
        eligibleMembers?: number;
        messagesQueued?: number;
        ticketsOk?: number;
        ticketErrors?: string[];
      } | null;

      if (payload?.ok && (payload.ticketsOk ?? 0) === 0 && (payload.messagesQueued ?? 0) > 0) {
        console.warn(
          '[notifyGroupEventCreated] Expo returned no ok tickets (check device / credentials)',
          payload.ticketErrors ?? [],
          { eventId }
        );
      }
      if (
        payload?.ok &&
        (payload.messagesQueued ?? 0) === 0 &&
        (payload.eligibleMembers ?? 0) > 0
      ) {
        console.warn(
          '[notifyGroupEventCreated] No push tokens for eligible members; open app on device to register',
          { eventId }
        );
      }
      return;
    },

    async getGroupEvents(
      groupId: string,
      options?: { discover?: boolean }
    ): Promise<GroupEvent[] | ApiError> {
      try {
        const client = getClient();
        type DiscoveryEventRow = GroupEventRow & { going_count?: number; maybe_count?: number };
        let list: DiscoveryEventRow[];
        if (options?.discover) {
          const { data: rows, error } = await client.rpc('discovery_group_events_for_group', {
            p_group_id: groupId,
          });
          if (error) return toApiError(error);
          list = (rows ?? []) as DiscoveryEventRow[];
        } else {
          const { data: rows, error } = await client
            .from('group_events')
            .select(
              'id, group_id, created_by_user_id, title, description, starts_at, requires_rsvp, status, cancelled_at, discussion_id, created_at, location, meeting_link'
            )
            .eq('group_id', groupId)
            .order('starts_at', { ascending: true })
            .order('created_at', { ascending: false });
          if (error) return toApiError(error);
          list = (rows ?? []) as DiscoveryEventRow[];
        }
        if (list.length === 0) return [];
        const userIds = [...new Set(list.map((r) => r.created_by_user_id))];
        const profileMap = await loadProfileMapForUserIds(getClient, userIds);
        const countsMap = options?.discover
          ? null
          : await loadEventRsvpCounts(
              client,
              list.map((r) => r.id)
            );
        return list.map((r) =>
          mapGroupEventRow(
            r,
            profileMap.get(r.created_by_user_id),
            options?.discover
              ? { going: r.going_count ?? 0, maybe: r.maybe_count ?? 0 }
              : countsMap?.get(r.id)
          )
        );
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupEvent(id: string): Promise<GroupEvent | ApiError> {
      try {
        const client = getClient();
        const { data: viewerRows, error } = await client.rpc('group_event_for_viewer', {
          p_event_id: id,
        });
        if (error) return toApiError(error);
        const row = Array.isArray(viewerRows) ? viewerRows[0] : viewerRows;
        if (!row) return { message: 'Event not found', code: 'NOT_FOUND' };
        const r = row as GroupEventRow & { going_count?: number; maybe_count?: number };
        const profileMap = await loadProfileMapForUserIds(getClient, [r.created_by_user_id]);
        return mapGroupEventRow(r, profileMap.get(r.created_by_user_id), {
          going: r.going_count ?? 0,
          maybe: r.maybe_count ?? 0,
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    async createGroupEvent(
      groupId: string,
      _userId: string,
      input: CreateGroupEventInput
    ): Promise<GroupEvent | ApiError> {
      try {
        const title = input.title.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const startsAt = input.startsAt;
        if (!startsAt) {
          return { message: 'Date and time are required', code: 'VALIDATION_ERROR' };
        }
        const meetingLinkParsed = parseMeetingLinkInput(input.meetingLink ?? '');
        if (!meetingLinkParsed.ok) {
          return {
            message:
              meetingLinkParsed.reason === 'too_long'
                ? 'Meeting link is too long'
                : 'Enter a valid meeting link (http or https)',
            code: 'VALIDATION_ERROR',
          };
        }
        const { data: eventId, error } = await getClient().rpc(
          'create_group_event_with_discussion',
          {
            p_group_id: groupId,
            p_title: title,
            p_description: input.description?.trim() ?? '',
            p_starts_at: startsAt,
            p_requires_rsvp: input.requiresRsvp,
            p_location: input.location?.trim() ?? '',
            p_meeting_link: meetingLinkParsed.value,
          }
        );
        if (error) return toApiError(error);
        if (!eventId || typeof eventId !== 'string') {
          return { message: 'Failed to create event', code: 'NOT_FOUND' };
        }
        const created = await this.getGroupEvent(eventId);
        if (isApiError(created)) return created;

        return created;
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateGroupEvent(
      eventId: string,
      _userId: string,
      input: UpdateGroupEventInput
    ): Promise<GroupEvent | ApiError> {
      try {
        const title = input.title.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const startsAt = input.startsAt;
        if (!startsAt) {
          return { message: 'Date and time are required', code: 'VALIDATION_ERROR' };
        }
        const meetingLinkParsed = parseMeetingLinkInput(input.meetingLink ?? '');
        if (!meetingLinkParsed.ok) {
          return {
            message:
              meetingLinkParsed.reason === 'too_long'
                ? 'Meeting link is too long'
                : 'Enter a valid meeting link (http or https)',
            code: 'VALIDATION_ERROR',
          };
        }
        const { error } = await getClient().rpc('update_group_event', {
          p_event_id: eventId,
          p_title: title,
          p_description: input.description?.trim() ?? '',
          p_starts_at: startsAt,
          p_requires_rsvp: input.requiresRsvp,
          p_location: input.location?.trim() ?? '',
          p_meeting_link: meetingLinkParsed.value,
        });
        if (error) return toApiError(error);
        const updated = await this.getGroupEvent(eventId);
        if (isApiError(updated)) return updated;
        return updated;
      } catch (e) {
        return toApiError(e);
      }
    },

    async cancelGroupEvent(eventId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().rpc('cancel_group_event', {
          p_event_id: eventId,
        });
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupRecurringMeetings(
      groupId: string,
      options?: { discover?: boolean }
    ): Promise<GroupRecurringMeeting[] | ApiError> {
      try {
        const client = getClient();
        let list: GroupRecurringMeetingRow[];
        if (options?.discover) {
          const { data: rows, error } = await client.rpc(
            'discovery_group_recurring_meetings_for_group',
            { p_group_id: groupId }
          );
          if (error) return toApiError(error);
          list = (rows ?? []) as GroupRecurringMeetingRow[];
        } else {
          const { data: rows, error } = await client
            .from('group_recurring_meetings')
            .select(
              'id, group_id, created_by_user_id, title, description, location, meeting_link, recurrence_frequency, weekday, time_local, timezone, month_week_ordinal, created_at, updated_at'
            )
            .eq('group_id', groupId)
            .order('created_at', { ascending: true });
          if (error) return toApiError(error);
          list = (rows ?? []) as GroupRecurringMeetingRow[];
        }
        return list.map(mapGroupRecurringMeetingRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createGroupRecurringMeeting(
      groupId: string,
      userId: string,
      input: CreateGroupRecurringMeetingInput
    ): Promise<GroupRecurringMeeting | ApiError> {
      try {
        const err = validateRecurringMeetingWrite(input);
        if (err) return err;
        const meetingLinkParsed = parseMeetingLinkInput(input.meetingLink ?? '');
        if (!meetingLinkParsed.ok) {
          return {
            message:
              meetingLinkParsed.reason === 'too_long'
                ? 'Meeting link is too long'
                : 'Enter a valid meeting link (http or https)',
            code: 'VALIDATION_ERROR',
          };
        }
        const timeDb = normalizeTimeLocalForDb(input.timeLocal);
        const rowPayload = {
          group_id: groupId,
          created_by_user_id: userId,
          title: input.title.trim(),
          description: input.description?.trim() ?? '',
          location: input.location?.trim() ?? '',
          meeting_link: meetingLinkParsed.value || null,
          recurrence_frequency: input.recurrenceFrequency,
          weekday: input.weekday,
          time_local: timeDb,
          timezone: input.timezone.trim(),
          month_week_ordinal:
            input.recurrenceFrequency === 'monthly_nth' ? input.monthWeekOrdinal! : null,
        };
        const { data: row, error } = await getClient()
          .from('group_recurring_meetings')
          .insert(rowPayload)
          .select(
            'id, group_id, created_by_user_id, title, description, location, meeting_link, recurrence_frequency, weekday, time_local, timezone, month_week_ordinal, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapGroupRecurringMeetingRow(row as GroupRecurringMeetingRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateGroupRecurringMeeting(
      meetingId: string,
      _userId: string,
      input: UpdateGroupRecurringMeetingInput
    ): Promise<GroupRecurringMeeting | ApiError> {
      try {
        const err = validateRecurringMeetingWrite(input);
        if (err) return err;
        const meetingLinkParsed = parseMeetingLinkInput(input.meetingLink ?? '');
        if (!meetingLinkParsed.ok) {
          return {
            message:
              meetingLinkParsed.reason === 'too_long'
                ? 'Meeting link is too long'
                : 'Enter a valid meeting link (http or https)',
            code: 'VALIDATION_ERROR',
          };
        }
        const timeDb = normalizeTimeLocalForDb(input.timeLocal);
        const { data: row, error } = await getClient()
          .from('group_recurring_meetings')
          .update({
            title: input.title.trim(),
            description: input.description?.trim() ?? '',
            location: input.location?.trim() ?? '',
            meeting_link: meetingLinkParsed.value || null,
            recurrence_frequency: input.recurrenceFrequency,
            weekday: input.weekday,
            time_local: timeDb,
            timezone: input.timezone.trim(),
            month_week_ordinal:
              input.recurrenceFrequency === 'monthly_nth' ? input.monthWeekOrdinal! : null,
          })
          .eq('id', meetingId)
          .select(
            'id, group_id, created_by_user_id, title, description, location, meeting_link, recurrence_frequency, weekday, time_local, timezone, month_week_ordinal, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapGroupRecurringMeetingRow(row as GroupRecurringMeetingRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteGroupRecurringMeeting(meetingId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('group_recurring_meetings')
          .delete()
          .eq('id', meetingId);
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getCoursesByGroup(groupId: string): Promise<Course[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('courses')
          .select(
            'id, group_id, title, description, cover_image_url, sort_order, created_at, updated_at'
          )
          .eq('group_id', groupId)
          .order('sort_order', { ascending: true });
        if (error) return toApiError(error);
        return ((rows ?? []) as CourseRow[]).map(mapCourseRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getCourse(courseId: string): Promise<Course | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('courses')
          .select(
            'id, group_id, title, description, cover_image_url, sort_order, created_at, updated_at'
          )
          .eq('id', courseId)
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Course not found', code: 'NOT_FOUND' };
        return mapCourseRow(data as CourseRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createCourse(groupId: string, input: CreateCourseInput): Promise<Course | ApiError> {
      try {
        const title = input.title?.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const { data: row, error } = await getClient()
          .from('courses')
          .insert({
            group_id: groupId,
            title,
            description: input.description?.trim() || null,
            cover_image_url: input.coverImageUrl || null,
            sort_order: input.sortOrder,
          })
          .select(
            'id, group_id, title, description, cover_image_url, sort_order, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapCourseRow(row as CourseRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateCourse(courseId: string, input: UpdateCourseInput): Promise<Course | ApiError> {
      try {
        const title = input.title?.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const { data: row, error } = await getClient()
          .from('courses')
          .update({
            title,
            description: input.description?.trim() || null,
            cover_image_url: input.coverImageUrl || null,
            sort_order: input.sortOrder,
          })
          .eq('id', courseId)
          .select(
            'id, group_id, title, description, cover_image_url, sort_order, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapCourseRow(row as CourseRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteCourse(courseId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('courses').delete().eq('id', courseId);
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getLessonsByCourse(courseId: string): Promise<Lesson[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('lessons')
          .select(
            'id, course_id, title, description, video_url, sort_order, created_at, updated_at'
          )
          .eq('course_id', courseId)
          .order('sort_order', { ascending: true });
        if (error) return toApiError(error);
        return ((rows ?? []) as LessonRow[]).map(mapLessonRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getLesson(lessonId: string): Promise<Lesson | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('lessons')
          .select(
            'id, course_id, title, description, video_url, sort_order, created_at, updated_at'
          )
          .eq('id', lessonId)
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Lesson not found', code: 'NOT_FOUND' };
        return mapLessonRow(data as LessonRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createLesson(courseId: string, input: CreateLessonInput): Promise<Lesson | ApiError> {
      try {
        const title = input.title?.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const videoUrl = input.videoUrl?.trim();
        if (!videoUrl) {
          return { message: 'Video URL is required', code: 'VALIDATION_ERROR' };
        }
        const { data: row, error } = await getClient()
          .from('lessons')
          .insert({
            course_id: courseId,
            title,
            description: input.description?.trim() || null,
            video_url: videoUrl,
            sort_order: input.sortOrder,
          })
          .select(
            'id, course_id, title, description, video_url, sort_order, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapLessonRow(row as LessonRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateLesson(lessonId: string, input: UpdateLessonInput): Promise<Lesson | ApiError> {
      try {
        const title = input.title?.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const videoUrl = input.videoUrl?.trim();
        if (!videoUrl) {
          return { message: 'Video URL is required', code: 'VALIDATION_ERROR' };
        }
        const { data: row, error } = await getClient()
          .from('lessons')
          .update({
            title,
            description: input.description?.trim() || null,
            video_url: videoUrl,
            sort_order: input.sortOrder,
          })
          .eq('id', lessonId)
          .select(
            'id, course_id, title, description, video_url, sort_order, created_at, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return mapLessonRow(row as LessonRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteLesson(lessonId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('lessons').delete().eq('id', lessonId);
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getAssignmentQuestions(assignmentId: string): Promise<QuizQuestion[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('assignment_questions')
          .select(QUIZ_QUESTION_ROW_COLUMNS)
          .eq('assignment_id', assignmentId)
          .order('sort_order', { ascending: true });
        if (error) return toApiError(error);

        // Students get zero key rows back (RLS), which is exactly the desired result: their
        // questions come through with correctOptionIds undefined. So this is not an
        // admin-only branch — the same query serves both, and the database decides.
        const { data: keyRows } = await getClient()
          .from('assignment_question_keys')
          .select('question_id, correct_option_ids')
          .eq('assignment_id', assignmentId);
        const keys = new Map<string, string[]>();
        for (const k of (keyRows ?? []) as {
          question_id: string;
          correct_option_ids: unknown;
        }[]) {
          keys.set(
            k.question_id,
            Array.isArray(k.correct_option_ids) ? k.correct_option_ids.map(String) : []
          );
        }

        return ((rows ?? []) as QuizQuestionRow[]).map((r) =>
          mapQuizQuestionRow(r, keys.get(r.id))
        );
      } catch (e) {
        return toApiError(e);
      }
    },

    async getAssignmentsByGroup(groupId: string): Promise<Assignment[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('assignments')
          .select(ASSIGNMENT_ROW_COLUMNS)
          .eq('group_id', groupId)
          .order('sort_order', { ascending: true });
        if (error) return toApiError(error);
        return ((rows ?? []) as AssignmentRow[]).map(mapAssignmentRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getAssignment(assignmentId: string): Promise<Assignment | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('assignments')
          .select(ASSIGNMENT_ROW_COLUMNS)
          .eq('id', assignmentId)
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Assignment not found', code: 'NOT_FOUND' };
        return mapAssignmentRow(data as AssignmentRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createAssignment(
      groupId: string,
      userId: string,
      input: CreateAssignmentInput
    ): Promise<Assignment | ApiError> {
      try {
        const title = input.title?.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const assignmentType = input.assignmentType ?? 'file';
        const { data: row, error } = await getClient()
          .from('assignments')
          .insert({
            group_id: groupId,
            title,
            description: input.description?.trim() || null,
            due_date: input.dueDate || null,
            created_by_user_id: userId,
            sort_order: input.sortOrder,
            materials: input.materials ?? [],
            assignment_type: assignmentType,
            allow_resubmission: input.allowResubmission ?? true,
          })
          .select(ASSIGNMENT_ROW_COLUMNS)
          .single();
        if (error) return toApiError(error);

        const created = mapAssignmentRow(row as AssignmentRow);
        if (assignmentType === 'quiz' && input.questions?.length) {
          const questionsError = await syncAssignmentQuestions(
            getClient,
            created.id,
            input.questions
          );
          if (questionsError) {
            // A quiz with no questions is not a usable assignment, so don't leave a
            // half-created one behind for the instructor to discover later.
            await getClient().from('assignments').delete().eq('id', created.id);
            return questionsError;
          }
        }
        return created;
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateAssignment(
      assignmentId: string,
      input: UpdateAssignmentInput
    ): Promise<Assignment | ApiError> {
      try {
        const title = input.title?.trim();
        if (!title) {
          return { message: 'Title is required', code: 'VALIDATION_ERROR' };
        }
        const payload: Record<string, unknown> = {
          title,
          description: input.description?.trim() || null,
          due_date: input.dueDate || null,
          sort_order: input.sortOrder,
        };
        if (input.materials !== undefined) payload.materials = input.materials;
        if (input.assignmentType !== undefined) payload.assignment_type = input.assignmentType;
        if (input.allowResubmission !== undefined)
          payload.allow_resubmission = input.allowResubmission;

        // Removing a material from the edit screen means it's no longer in input.materials;
        // clean up the now-orphaned storage objects the same way deleteAssignment does, so
        // storage doesn't accumulate files nothing references anymore.
        if (input.materials !== undefined) {
          const { data: existing } = await getClient()
            .from('assignments')
            .select('materials')
            .eq('id', assignmentId)
            .maybeSingle();
          const before = mapUploadedFileRows(existing?.materials);
          const afterPaths = new Set((input.materials ?? []).map((m) => m.path));
          const removed = before.filter((m) => !afterPaths.has(m.path)).map((m) => m.path);
          if (removed.length > 0) {
            await getClient().storage.from('assignment-materials').remove(removed);
          }
        }

        if (input.questions !== undefined) {
          const questionsError = await syncAssignmentQuestions(
            getClient,
            assignmentId,
            input.questions
          );
          if (questionsError) return questionsError;
        }

        const { data: row, error } = await getClient()
          .from('assignments')
          .update(payload)
          .eq('id', assignmentId)
          .select(ASSIGNMENT_ROW_COLUMNS)
          .single();
        if (error) return toApiError(error);
        return mapAssignmentRow(row as AssignmentRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteAssignment(assignmentId: string): Promise<void | ApiError> {
      try {
        // The submissions -> assignments FK cascade only removes DB rows; Storage objects
        // are a separate system with no cascade, so submission/material files must be removed
        // here first or they become orphaned. Requires the "Group admin can delete any
        // submission file for their assignment" storage policy (00070) — without it, deletes
        // for files that aren't the caller's own would be silently dropped by RLS.
        const { data: assignmentRow, error: assignmentError } = await getClient()
          .from('assignments')
          .select('materials')
          .eq('id', assignmentId)
          .maybeSingle();
        if (assignmentError) return toApiError(assignmentError);
        const materialPaths = mapUploadedFileRows(assignmentRow?.materials).map((m) => m.path);
        if (materialPaths.length > 0) {
          await getClient().storage.from('assignment-materials').remove(materialPaths);
        }

        const { data: subs, error: subsError } = await getClient()
          .from('submissions')
          .select('files')
          .eq('assignment_id', assignmentId);
        if (subsError) return toApiError(subsError);
        const submissionPaths = (subs ?? []).flatMap((s) =>
          mapUploadedFileRows(s.files).map((f) => f.path)
        );
        if (submissionPaths.length > 0) {
          await getClient().storage.from('assignment-submissions').remove(submissionPaths);
        }

        const { error } = await getClient().from('assignments').delete().eq('id', assignmentId);
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('submissions')
          .select(SUBMISSION_ROW_COLUMNS)
          .eq('assignment_id', assignmentId)
          .order('submitted_at', { ascending: false });
        if (error) return toApiError(error);
        const list = (rows ?? []) as SubmissionRow[];
        if (list.length === 0) return [];
        const userIds = [...new Set(list.map((r) => r.user_id))];
        const profileMap = await loadProfileMapForUserIds(getClient, userIds);
        return list.map((r) => mapSubmissionRow(r, profileMap.get(r.user_id)));
      } catch (e) {
        return toApiError(e);
      }
    },

    async getMySubmission(
      assignmentId: string,
      userId: string
    ): Promise<Submission | null | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('submissions')
          .select(SUBMISSION_ROW_COLUMNS)
          .eq('assignment_id', assignmentId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        if (!data) return null;
        return mapSubmissionRow(data as SubmissionRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async upsertSubmission(
      assignmentId: string,
      userId: string,
      input: UpsertSubmissionInput,
      onProgress?: OnUploadProgress
    ): Promise<Submission | ApiError> {
      try {
        // A quiz submission answers questions and uploads nothing; a file submission is the
        // reverse. Exactly one of the two shapes must be present.
        const isQuiz = input.answers !== undefined;
        const files = input.files ?? [];
        if (!isQuiz) {
          if (files.length === 0) {
            return { message: 'At least one file is required', code: 'VALIDATION_ERROR' };
          }
          if (files.length > MAX_SUBMISSION_FILES) {
            return { message: 'Too many files', code: 'VALIDATION_ERROR' };
          }
          for (const f of files) {
            if (!f.fileName?.trim()) {
              return { message: 'File name is required', code: 'VALIDATION_ERROR' };
            }
          }
        }

        const { data: existingRow, error: existingError } = await getClient()
          .from('submissions')
          .select('id, files')
          .eq('assignment_id', assignmentId)
          .eq('user_id', userId)
          .maybeSingle();
        if (existingError) return toApiError(existingError);

        if (isQuiz) {
          const payload = {
            assignment_id: assignmentId,
            user_id: userId,
            files: [],
            answers: input.answers ?? [],
            file_path: null,
            file_name: null,
            file_size: null,
            submitted_at: new Date().toISOString(),
          };
          const { data: row, error } = existingRow
            ? await getClient()
                .from('submissions')
                .update(payload)
                .eq('id', existingRow.id)
                .select(SUBMISSION_ROW_COLUMNS)
                .single()
            : await getClient()
                .from('submissions')
                .insert(payload)
                .select(SUBMISSION_ROW_COLUMNS)
                .single();
          if (error) return toApiError(error);
          return mapSubmissionRow(row as SubmissionRow);
        }

        const uploaded: UploadedFile[] = [];
        const total = files.length;
        for (let i = 0; i < total; i++) {
          const f = files[i];
          let body: ImageUploadBody['body'];
          let contentType: string;
          try {
            const read = await readBinaryFile(f.fileUri, f.mimeType, undefined, {
              isAllowed: isAllowedSubmissionMimeType,
              maxBytes: MAX_SUBMISSION_FILE_BYTES,
            });
            body = read.body;
            contentType = read.contentType;
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Upload failed';
            if (msg === 'File is too large' || msg === 'File type not allowed') {
              return { message: msg, code: 'VALIDATION_ERROR' };
            }
            return toApiError(e);
          }

          const safeFileName = sanitizeStorageFileSegment(f.fileName.trim());
          const path = `${assignmentId}/${userId}/${Date.now()}-${i}-${safeFileName}`;
          const err = await uploadToStorage(
            getClient,
            'assignment-submissions',
            path,
            body,
            contentType,
            false,
            onProgress ? (fraction: number) => onProgress((i + fraction) / total) : undefined
          );
          if (err) return err;
          uploaded.push({ path, name: f.fileName.trim(), size: f.fileSize });
        }

        // Only remove the old files once all new ones are safely uploaded, so a failed
        // upload never leaves the student with no files at all (no orphaned files either,
        // since the old paths are removed right after the new row/files are both in place).
        const oldPaths = mapUploadedFileRows(existingRow?.files).map((f) => f.path);
        if (oldPaths.length > 0) {
          await getClient().storage.from('assignment-submissions').remove(oldPaths);
        }

        const payload = {
          assignment_id: assignmentId,
          user_id: userId,
          files: uploaded,
          answers: [],
          file_path: uploaded[0].path,
          file_name: uploaded[0].name,
          file_size: uploaded[0].size ?? null,
          submitted_at: new Date().toISOString(),
        };

        const { data: row, error } = existingRow
          ? await getClient()
              .from('submissions')
              .update(payload)
              .eq('id', existingRow.id)
              .select(SUBMISSION_ROW_COLUMNS)
              .single()
          : await getClient()
              .from('submissions')
              .insert(payload)
              .select(SUBMISSION_ROW_COLUMNS)
              .single();
        if (error) return toApiError(error);
        return mapSubmissionRow(row as SubmissionRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateSubmissionFeedback(
      submissionId: string,
      reviewerUserId: string,
      input: UpdateSubmissionFeedbackInput
    ): Promise<Submission | ApiError> {
      try {
        const { data: row, error } = await getClient()
          .from('submissions')
          .update({
            feedback: input.feedback?.trim() || null,
            score: input.score ?? null,
            reviewed_by_user_id: reviewerUserId,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', submissionId)
          .select(SUBMISSION_ROW_COLUMNS)
          .single();
        if (error) return toApiError(error);
        if (!row) {
          return { message: 'Submission not found or not authorized', code: 'NOT_FOUND' };
        }
        return mapSubmissionRow(row as SubmissionRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteSubmission(submissionId: string): Promise<void | ApiError> {
      try {
        const { data: existing, error: fetchError } = await getClient()
          .from('submissions')
          .select('files')
          .eq('id', submissionId)
          .maybeSingle();
        if (fetchError) return toApiError(fetchError);
        const { error } = await getClient().from('submissions').delete().eq('id', submissionId);
        if (error) return toApiError(error);
        const paths = mapUploadedFileRows(existing?.files).map((f) => f.path);
        if (paths.length > 0) {
          await getClient().storage.from('assignment-submissions').remove(paths);
        }
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getSubmissionDownloadUrl(filePath: string): Promise<string | ApiError> {
      try {
        const { data, error } = await getClient()
          .storage.from('assignment-submissions')
          .createSignedUrl(filePath, 60 * 60);
        if (error) return toApiError(error);
        if (!data?.signedUrl) {
          return { message: 'Failed to create download link', code: 'NOT_FOUND' };
        }
        return data.signedUrl;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getEventRsvps(eventId: string): Promise<EventRsvpAttendee[] | ApiError> {
      try {
        const client = getClient();
        const { data: rows, error } = await client
          .from('event_rsvps')
          .select('event_id, user_id, response, updated_at')
          .eq('event_id', eventId)
          .order('updated_at', { ascending: false });
        if (error) return toApiError(error);
        const list = (rows ?? []) as {
          user_id: string;
          response: string;
          updated_at: string;
        }[];
        if (list.length === 0) return [];
        const userIds = [...new Set(list.map((r) => r.user_id))];
        const profileMap = await loadProfileMapForUserIds(getClient, userIds);
        return list.map((r) => {
          const prof = profileMap.get(r.user_id);
          return {
            userId: r.user_id,
            response: r.response as EventRsvpResponse,
            displayName: prof?.displayName,
            avatarUrl: prof?.avatarUrl,
            updatedAt: r.updated_at,
          };
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    async getMyEventRsvp(
      eventId: string,
      userId: string
    ): Promise<{ response: EventRsvpResponse; updatedAt: string } | null | ApiError> {
      try {
        const { data: row, error } = await getClient()
          .from('event_rsvps')
          .select('response, updated_at')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        if (!row) return null;
        return {
          response: row.response as EventRsvpResponse,
          updatedAt: row.updated_at,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async upsertEventRsvp(
      eventId: string,
      userId: string,
      response: EventRsvpResponse
    ): Promise<void | ApiError> {
      try {
        if (response !== 'going' && response !== 'maybe' && response !== 'not_going') {
          return { message: 'Invalid RSVP response', code: 'VALIDATION_ERROR' };
        }
        const { error } = await getClient().from('event_rsvps').upsert(
          {
            event_id: eventId,
            user_id: userId,
            response,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,user_id' }
        );
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeEventRsvp(eventId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupMemberSettings(
      groupId: string,
      userId: string
    ): Promise<GroupMemberSettings | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('group_member_settings')
          .select(
            'user_id, group_id, announcements_enabled, recurring_meetings_enabled, events_enabled, updated_at'
          )
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        if (!data) {
          return {
            userId,
            groupId,
            announcementsEnabled: true,
            recurringMeetingsEnabled: true,
            eventsEnabled: true,
          };
        }
        return {
          userId: data.user_id,
          groupId: data.group_id,
          announcementsEnabled: data.announcements_enabled,
          recurringMeetingsEnabled: data.recurring_meetings_enabled ?? true,
          eventsEnabled: data.events_enabled ?? true,
          updatedAt: data.updated_at ?? undefined,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateGroupMemberSettings(
      groupId: string,
      userId: string,
      updates: GroupMemberSettingsUpdates
    ): Promise<GroupMemberSettings | ApiError> {
      try {
        const hasChange =
          updates.announcementsEnabled !== undefined ||
          updates.recurringMeetingsEnabled !== undefined ||
          updates.eventsEnabled !== undefined;
        if (!hasChange) {
          return { message: 'No settings to update', code: 'VALIDATION_ERROR' };
        }
        const existing = await this.getGroupMemberSettings(groupId, userId);
        if (isApiError(existing)) return existing;
        const merged = {
          announcementsEnabled: updates.announcementsEnabled ?? existing.announcementsEnabled,
          recurringMeetingsEnabled:
            updates.recurringMeetingsEnabled ?? existing.recurringMeetingsEnabled,
          eventsEnabled: updates.eventsEnabled ?? existing.eventsEnabled,
        };
        const now = new Date().toISOString();
        const { data, error } = await getClient()
          .from('group_member_settings')
          .upsert(
            {
              user_id: userId,
              group_id: groupId,
              announcements_enabled: merged.announcementsEnabled,
              recurring_meetings_enabled: merged.recurringMeetingsEnabled,
              events_enabled: merged.eventsEnabled,
              updated_at: now,
            },
            { onConflict: 'user_id,group_id' }
          )
          .select(
            'user_id, group_id, announcements_enabled, recurring_meetings_enabled, events_enabled, updated_at'
          )
          .single();
        if (error) return toApiError(error);
        return {
          userId: data.user_id,
          groupId: data.group_id,
          announcementsEnabled: data.announcements_enabled,
          recurringMeetingsEnabled: data.recurring_meetings_enabled ?? true,
          eventsEnabled: data.events_enabled ?? true,
          updatedAt: data.updated_at ?? undefined,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async registerPushToken(
      userId: string,
      token: string,
      platform: 'ios' | 'android'
    ): Promise<PushToken | ApiError> {
      try {
        const now = new Date().toISOString();
        const { data, error } = await getClient()
          .from('push_tokens')
          .upsert(
            {
              user_id: userId,
              token,
              platform,
              updated_at: now,
            },
            { onConflict: 'token' }
          )
          .select('id, user_id, token, platform, created_at, updated_at')
          .single();
        if (error) return toApiError(error);
        return {
          id: data.id,
          userId: data.user_id,
          token: data.token,
          platform: data.platform as 'ios' | 'android',
          createdAt: data.created_at ?? undefined,
          updatedAt: data.updated_at ?? undefined,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async removePushToken(userId: string, token: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('push_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('token', token);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupDiscussions(groupId: string): Promise<GroupDiscussion[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('group_discussions')
          .select('id, group_id, user_id, body, created_at')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false });
        if (error) return toApiError(error);
        const discussions = rows ?? [];
        if (discussions.length === 0) return [];
        const userIds = [...new Set(discussions.map((r) => r.user_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }
        return discussions.map((r) => mapGroupDiscussionRow(r, profileMap.get(r.user_id) ?? null));
      } catch (e) {
        return toApiError(e);
      }
    },

    async createGroupDiscussion(
      groupId: string,
      userId: string,
      input: CreateGroupDiscussionInput
    ): Promise<GroupDiscussion | ApiError> {
      try {
        const body = input.body?.trim();
        if (!body) {
          return { message: 'Message body is required', code: 'VALIDATION_ERROR' };
        }
        const payload = {
          group_id: groupId,
          user_id: userId,
          body,
        };
        const { data: row, error } = await getClient()
          .from('group_discussions')
          .insert(payload)
          .select('id, group_id, user_id, body, created_at')
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Failed to create discussion', code: 'NOT_FOUND' };
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        return mapGroupDiscussionRow(row, profile);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getDiscussions(params?: {
      groupId?: string;
      courseId?: string;
      lessonId?: string;
    }): Promise<Discussion[] | ApiError> {
      try {
        const excludeIds = new Set<string>();
        if (params?.groupId && !params?.courseId && !params?.lessonId) {
          const { data: shadowIds, error: shadowErr } = await getClient().rpc(
            'discovery_group_event_discussion_ids',
            { p_group_id: params.groupId }
          );
          if (shadowErr) return toApiError(shadowErr);
          for (const did of (shadowIds ?? []) as string[]) {
            if (did) excludeIds.add(did);
          }
        }
        let query = getClient()
          .from('discussions')
          .select(
            'id, group_id, user_id, title, body, created_at, updated_at, course_id, lesson_id, groups(name), discussion_posts(count)'
          )
          .order('created_at', { ascending: false });
        if (params?.courseId) {
          query = query.eq('course_id', params.courseId);
          query = params.lessonId
            ? query.eq('lesson_id', params.lessonId)
            : query.is('lesson_id', null);
        } else if (params?.lessonId) {
          query = query.eq('lesson_id', params.lessonId);
        } else if (params?.groupId) {
          query = query.eq('group_id', params.groupId).is('course_id', null).is('lesson_id', null);
        }
        const { data: rows, error } = await query;
        if (error) return toApiError(error);
        const raw = rows ?? [];
        const discussions = raw.filter((r: { id: string }) => !excludeIds.has(r.id));
        if (discussions.length === 0) return [];
        const userIds = [...new Set(discussions.map((r: { user_id: string }) => r.user_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }
        return discussions.map(
          (
            r: DiscussionRow & {
              groups?: { name?: string } | { name?: string }[];
              discussion_posts?: { count: number }[] | { count: number };
            }
          ) => {
            const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
            const groupName = g?.name ?? null;
            const posts =
              Array.isArray(r.discussion_posts) &&
              r.discussion_posts.length > 0 &&
              'count' in r.discussion_posts[0]
                ? (r.discussion_posts[0] as { count: number }).count
                : typeof r.discussion_posts === 'object' &&
                    r.discussion_posts &&
                    'count' in r.discussion_posts
                  ? (r.discussion_posts as { count: number }).count
                  : 0;
            return mapDiscussionRow(r, profileMap.get(r.user_id) ?? null, groupName, posts);
          }
        );
      } catch (e) {
        return toApiError(e);
      }
    },

    async getDiscussion(id: string): Promise<Discussion | ApiError> {
      try {
        const { data: row, error } = await getClient()
          .from('discussions')
          .select(
            'id, group_id, user_id, title, body, created_at, updated_at, course_id, lesson_id, groups(name)'
          )
          .eq('id', id)
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Discussion not found', code: 'NOT_FOUND' };
        const r = row as DiscussionRow & { groups?: { name?: string } | { name?: string }[] };
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', r.user_id)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        const g = Array.isArray(r.groups) ? r.groups[0] : r.groups;
        let linkedGroupEvent: Discussion['linkedGroupEvent'] | undefined;
        const { data: geRow, error: geErr } = await getClient()
          .from('group_events')
          .select('id, status, starts_at')
          .eq('discussion_id', id)
          .maybeSingle();
        if (!geErr && geRow) {
          const ge = geRow as { id: string; status: string; starts_at: string };
          linkedGroupEvent = {
            id: ge.id,
            status: ge.status as GroupEvent['status'],
            startsAt: ge.starts_at,
          };
        }
        return mapDiscussionRow(r, profile, g?.name ?? null, undefined, linkedGroupEvent);
      } catch (e) {
        return toApiError(e);
      }
    },

    async createDiscussion(
      groupId: string,
      userId: string,
      input: CreateDiscussionInput
    ): Promise<Discussion | ApiError> {
      try {
        const title = input.title?.trim();
        const body = input.body?.trim() ?? '';
        if (!title) {
          return { message: 'Discussion topic is required', code: 'VALIDATION_ERROR' };
        }
        const payload = {
          group_id: groupId,
          user_id: userId,
          title,
          body: body || title,
          ...(input.courseId ? { course_id: input.courseId } : {}),
          ...(input.lessonId ? { lesson_id: input.lessonId } : {}),
        };
        const { data: row, error } = await getClient()
          .from('discussions')
          .insert(payload)
          .select(
            'id, group_id, user_id, title, body, created_at, updated_at, course_id, lesson_id'
          )
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Failed to create discussion', code: 'NOT_FOUND' };
        const r = row as DiscussionRow;
        const { data: g } = await getClient()
          .from('groups')
          .select('name')
          .eq('id', groupId)
          .single();
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        return mapDiscussionRow(r, profile, g?.name);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateDiscussion(
      id: string,
      params: UpdateDiscussionInput
    ): Promise<Discussion | ApiError> {
      try {
        const updates: Record<string, unknown> = {};
        if (params.title !== undefined) {
          const title = params.title?.trim();
          if (!title) return { message: 'Discussion topic is required', code: 'VALIDATION_ERROR' };
          updates.title = title;
        }
        if (params.body !== undefined) updates.body = params.body?.trim() ?? '';
        if (Object.keys(updates).length === 0) return this.getDiscussion(id);

        const { data: geLock } = await getClient()
          .from('group_events')
          .select('status, starts_at')
          .eq('discussion_id', id)
          .maybeSingle();
        if (geLock && isGroupEventDiscussionLockedRow(geLock as { status: string })) {
          return {
            message: 'This event discussion is closed',
            code: 'FORBIDDEN',
          };
        }

        const { data: row, error } = await getClient()
          .from('discussions')
          .update(updates)
          .eq('id', id)
          .select('id, group_id, user_id, title, body, created_at, updated_at')
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Discussion not found', code: 'NOT_FOUND' };
        const r = row as DiscussionRow;
        const { data: g } = await getClient()
          .from('groups')
          .select('name')
          .eq('id', r.group_id)
          .single();
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', r.user_id)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        return mapDiscussionRow(r, profile, g?.name);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteDiscussion(id: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('discussions').delete().eq('id', id);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getDiscussionPosts(
      discussionId: string,
      options?: { userId?: string }
    ): Promise<DiscussionPost[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('discussion_posts')
          .select(
            'id, discussion_id, user_id, body, created_at, updated_at, parent_post_id, image_urls, attachments'
          )
          .eq('discussion_id', discussionId)
          .order('created_at', { ascending: true });
        if (error) return toApiError(error);
        const posts = rows ?? [];
        if (posts.length === 0) return [];
        const postIds = posts.map((r) => r.id);
        const userIds = [...new Set(posts.map((r) => r.user_id))];

        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }

        const reactionCountMap = new Map<
          string,
          { prayer: number; laugh: number; thumbsUp: number }
        >();
        const userReactionMap = new Map<string, string[]>();
        const { data: reactionRows } = await getClient()
          .from('discussion_post_reactions')
          .select('post_id, user_id, reaction_type')
          .in('post_id', postIds);
        if (reactionRows && reactionRows.length > 0) {
          const uid = options?.userId;
          for (const row of reactionRows as {
            post_id: string;
            user_id: string;
            reaction_type: string;
          }[]) {
            const key = row.post_id;
            if (!reactionCountMap.has(key)) {
              reactionCountMap.set(key, { prayer: 0, laugh: 0, thumbsUp: 0 });
            }
            const counts = reactionCountMap.get(key)!;
            if (row.reaction_type === 'prayer') counts.prayer++;
            else if (row.reaction_type === 'laugh') counts.laugh++;
            else if (row.reaction_type === 'thumbs_up') counts.thumbsUp++;
            if (uid && row.user_id === uid) {
              const arr = userReactionMap.get(key) ?? [];
              if (!arr.includes(row.reaction_type)) arr.push(row.reaction_type);
              userReactionMap.set(key, arr);
            }
          }
        }

        return posts.map((r) =>
          mapDiscussionPostRow(
            r as DiscussionPostRow,
            profileMap.get(r.user_id) ?? null,
            reactionCountMap.get(r.id),
            options?.userId ? userReactionMap.get(r.id) : undefined
          )
        );
      } catch (e) {
        return toApiError(e);
      }
    },

    async createDiscussionPost(
      discussionId: string,
      userId: string,
      input: CreateDiscussionPostInput
    ): Promise<DiscussionPost | ApiError> {
      try {
        const body = input.body?.trim() ?? '';
        const merged = mergeAttachmentsForCreate(input.attachments, input.imageUrls);
        const hasAttachments = merged.length > 0;
        if (!body && !hasAttachments) {
          return {
            message: 'Reply must have text or at least one attachment',
            code: 'VALIDATION_ERROR',
          };
        }
        const { data: geLock } = await getClient()
          .from('group_events')
          .select('status, starts_at')
          .eq('discussion_id', discussionId)
          .maybeSingle();
        if (geLock && isGroupEventDiscussionLockedRow(geLock as { status: string })) {
          return {
            message: 'This event discussion is closed',
            code: 'FORBIDDEN',
          };
        }
        const imageUrlsDb = deriveImageUrlsForDb(merged);
        const payload = {
          discussion_id: discussionId,
          user_id: userId,
          body: body || '', // DB allows ''; empty for image-only replies
          parent_post_id:
            input.parentPostId && input.parentPostId.trim() ? input.parentPostId : null,
          image_urls: imageUrlsDb,
          attachments: merged,
        };
        const { data: row, error } = await getClient()
          .from('discussion_posts')
          .insert(payload)
          .select(
            'id, discussion_id, user_id, body, created_at, updated_at, parent_post_id, image_urls, attachments'
          )
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Failed to create post', code: 'NOT_FOUND' };
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        return mapDiscussionPostRow(row as DiscussionPostRow, profile);
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteDiscussionPost(
      postId: string,
      userId: string
    ): Promise<{ discussionId: string } | ApiError> {
      try {
        // Read the parent first: the caller needs it to invalidate the thread,
        // and it doubles as the ownership check before the delete round-trip.
        const { data: postMeta, error: metaErr } = await getClient()
          .from('discussion_posts')
          .select('discussion_id')
          .eq('id', postId)
          .eq('user_id', userId)
          .maybeSingle();
        if (metaErr) return toApiError(metaErr);
        if (!postMeta) {
          return { message: 'Post not found or not authorized to delete', code: 'NOT_FOUND' };
        }
        const { error } = await getClient()
          .from('discussion_posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
        return { discussionId: postMeta.discussion_id as string };
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateDiscussionPost(
      postId: string,
      userId: string,
      input: UpdateDiscussionPostInput
    ): Promise<DiscussionPost | ApiError> {
      try {
        const body = input.body !== undefined ? (input.body.trim() ?? '') : undefined;
        const payload: Record<string, unknown> = {};
        if (body !== undefined) payload.body = body;

        if (input.attachments !== undefined) {
          const merged = parseClientAttachments(input.attachments);
          payload.attachments = merged;
          payload.image_urls = deriveImageUrlsForDb(merged);
        } else if (input.imageUrls !== undefined) {
          const urls = input.imageUrls.filter((u) => typeof u === 'string' && u.length > 0);
          const merged = urls.map((url) => ({ kind: 'image' as const, url }));
          payload.attachments = merged;
          payload.image_urls = deriveImageUrlsForDb(merged);
        }

        if (Object.keys(payload).length === 0) {
          return { message: 'No updates provided', code: 'VALIDATION_ERROR' };
        }
        const { data: postMeta, error: metaErr } = await getClient()
          .from('discussion_posts')
          .select('discussion_id')
          .eq('id', postId)
          .eq('user_id', userId)
          .maybeSingle();
        if (metaErr) return toApiError(metaErr);
        if (!postMeta) {
          return { message: 'Post not found or not authorized to edit', code: 'NOT_FOUND' };
        }
        const { data: geLock } = await getClient()
          .from('group_events')
          .select('status, starts_at')
          .eq('discussion_id', postMeta.discussion_id)
          .maybeSingle();
        if (geLock && isGroupEventDiscussionLockedRow(geLock as { status: string })) {
          return {
            message: 'This event discussion is closed',
            code: 'FORBIDDEN',
          };
        }
        const { data: row, error } = await getClient()
          .from('discussion_posts')
          .update(payload)
          .eq('id', postId)
          .eq('user_id', userId)
          .select(
            'id, discussion_id, user_id, body, created_at, updated_at, parent_post_id, image_urls, attachments'
          )
          .maybeSingle();
        if (error) return toApiError(error);
        if (!row) return { message: 'Post not found or not authorized to edit', code: 'NOT_FOUND' };
        const post = row as DiscussionPostRow;
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', post.user_id)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        return mapDiscussionPostRow(post, profile);
      } catch (e) {
        return toApiError(e);
      }
    },

    async reactToDiscussionPost(
      postId: string,
      userId: string,
      reactionType: PostReactionType
    ): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('discussion_post_reactions').upsert(
          {
            post_id: postId,
            user_id: userId,
            reaction_type: reactionType,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'post_id,user_id' }
        );
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeDiscussionPostReaction(
      postId: string,
      userId: string,
      reactionType: PostReactionType
    ): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('discussion_post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getDiscussionPostReactions(postId: string): Promise<PostReactionDetail[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('discussion_post_reactions')
          .select('user_id, reaction_type')
          .eq('post_id', postId);
        if (error) return toApiError(error);
        const reactions = rows ?? [];
        if (reactions.length === 0) return [];
        const userIds = [...new Set(reactions.map((r) => r.user_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }
        return reactions.map((r) => {
          const profile = profileMap.get(r.user_id);
          return {
            userId: r.user_id,
            displayName: profile?.displayName,
            avatarUrl: profile?.avatarUrl,
            reactionType: r.reaction_type as PostReactionType,
          };
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    // Chats
    async getChatsForUser(
      userId: string,
      options?: { folderId?: string }
    ): Promise<Chat[] | ApiError> {
      try {
        let chatIds: string[];
        if (options?.folderId) {
          const [{ data: items, error }, { data: memberRows, error: memberErr }] =
            await Promise.all([
              getClient()
                .from('chat_folder_items')
                .select('chat_id')
                .eq('folder_id', options.folderId),
              getClient().from('chat_members').select('chat_id').eq('user_id', userId),
            ]);
          if (error) return toApiError(error);
          if (memberErr) return toApiError(memberErr);
          const folderChatIds = new Set((items ?? []).map((r) => r.chat_id));
          const myChatIds = new Set((memberRows ?? []).map((r) => r.chat_id));
          chatIds = [...folderChatIds].filter((id) => myChatIds.has(id));
          if (chatIds.length === 0) return [];
        } else {
          const { data: memberRows, error } = await getClient()
            .from('chat_members')
            .select('chat_id')
            .eq('user_id', userId);
          if (error) return toApiError(error);
          chatIds = (memberRows ?? []).map((r) => r.chat_id);
          if (chatIds.length === 0) return [];
        }

        const { data: chatRows, error } = await getClient()
          .from('chats')
          .select('id, created_by_user_id, name, description, image_url, created_at, updated_at')
          .in('id', chatIds)
          .order('updated_at', { ascending: false });
        if (error) return toApiError(error);
        const chats = chatRows ?? [];
        if (chats.length === 0) return [];

        const cids = chats.map((r) => r.id);

        const { data: lastMsg } = await getClient()
          .from('chat_messages')
          .select('chat_id, user_id, body, created_at')
          .in('chat_id', cids)
          .order('created_at', { ascending: false });
        const lastByChat = new Map<string, { body: string; created_at: string }>();
        if (lastMsg) {
          for (const m of lastMsg) {
            if (!lastByChat.has(m.chat_id)) {
              lastByChat.set(m.chat_id, { body: m.body, created_at: m.created_at });
            }
          }
        }

        const { data: memberRows } = await getClient()
          .from('chat_members')
          .select('chat_id, user_id, last_read_at')
          .in('chat_id', cids);

        const lastReadByChat = new Map<string, string>();
        const countMap = new Map<string, number>();
        const otherUserIdsByChat = new Map<string, string[]>();
        for (const r of memberRows ?? []) {
          countMap.set(r.chat_id, (countMap.get(r.chat_id) ?? 0) + 1);
          if (r.user_id === userId && r.last_read_at) {
            lastReadByChat.set(r.chat_id, r.last_read_at);
          }
          if (r.user_id !== userId) {
            const arr = otherUserIdsByChat.get(r.chat_id) ?? [];
            arr.push(r.user_id);
            otherUserIdsByChat.set(r.chat_id, arr);
          }
        }

        const unreadCountMap = new Map<string, number>();
        if (lastMsg) {
          for (const m of lastMsg) {
            if (m.user_id === userId) continue;
            const lastRead = lastReadByChat.get(m.chat_id);
            if (lastRead && new Date(m.created_at) > new Date(lastRead)) {
              unreadCountMap.set(m.chat_id, (unreadCountMap.get(m.chat_id) ?? 0) + 1);
            }
          }
        }

        const allMemberIds = [...new Set((memberRows ?? []).map((r) => r.user_id))];
        const profileMap = new Map<string, { displayName: string; avatarUrl?: string }>();
        if (allMemberIds.length > 0) {
          const { data: profiles } = await getClient()
            .from('profiles')
            .select('user_id, display_name, first_name, last_name, avatar_url')
            .in('user_id', allMemberIds);
          for (const p of profiles ?? []) {
            const derived = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derived || 'User';
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(p.user_id, { displayName, avatarUrl });
          }
        }

        return chats.map((r) => {
          const last = lastByChat.get(r.id);
          const chatMemberRows = (memberRows ?? []).filter((row) => row.chat_id === r.id);
          const members: ChatMember[] = chatMemberRows.map((row) => {
            const profile = profileMap.get(row.user_id);
            return {
              userId: row.user_id,
              chatId: r.id,
              joinedAt: undefined,
              displayName: profile?.displayName ?? 'User',
              avatarUrl: profile?.avatarUrl,
            };
          });
          const otherIds = otherUserIdsByChat.get(r.id) ?? [];
          const names = otherIds
            .map((uid) => profileMap.get(uid)?.displayName || 'User')
            .filter(Boolean);
          const participantDisplayNames = names.length > 0 ? names.join(', ') : undefined;
          return {
            id: r.id,
            createdByUserId: r.created_by_user_id,
            name: r.name ?? undefined,
            description: r.description ?? undefined,
            imageUrl: r.image_url ?? undefined,
            createdAt: r.created_at,
            updatedAt: r.updated_at ?? undefined,
            lastMessagePreview: last?.body ?? undefined,
            lastMessageAt: last?.created_at ?? undefined,
            memberCount: countMap.get(r.id) ?? 0,
            participantDisplayNames,
            members,
            unreadCount: unreadCountMap.get(r.id) ?? 0,
          };
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    async markChatRead(chatId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('chat_members')
          .update({ last_read_at: new Date().toISOString() })
          .eq('chat_id', chatId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getChat(id: string): Promise<Chat | ApiError> {
      try {
        const { data: row, error } = await getClient()
          .from('chats')
          .select('id, created_by_user_id, name, description, image_url, created_at, updated_at')
          .eq('id', id)
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Chat not found', code: 'NOT_FOUND' };

        const { data: memberRows } = await getClient()
          .from('chat_members')
          .select('user_id, chat_id, joined_at')
          .eq('chat_id', id);

        const memberUserIds = (memberRows ?? []).map((r) => r.user_id);
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of memberUserIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }

        const members: ChatMember[] = (memberRows ?? []).map((r) => {
          const profile = profileMap.get(r.user_id);
          return {
            userId: r.user_id,
            chatId: r.chat_id,
            joinedAt: r.joined_at,
            displayName: profile?.displayName,
            avatarUrl: profile?.avatarUrl,
          };
        });

        return {
          id: row.id,
          createdByUserId: row.created_by_user_id,
          name: row.name ?? undefined,
          description: row.description ?? undefined,
          imageUrl: row.image_url ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at ?? undefined,
          memberCount: members.length,
          members,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async findExisting1on1Chat(
      userId: string,
      otherUserId: string
    ): Promise<Chat | null | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('chat_members')
          .select('chat_id, user_id')
          .in('user_id', [userId, otherUserId]);
        if (error) return toApiError(error);
        const byChat = new Map<string, Set<string>>();
        for (const r of rows ?? []) {
          const set = byChat.get(r.chat_id) ?? new Set();
          set.add(r.user_id);
          byChat.set(r.chat_id, set);
        }
        // Collect candidate chat IDs where both users appear
        const candidateChatIds: string[] = [];
        for (const [chatId, members] of byChat) {
          if (members.has(userId) && members.has(otherUserId)) {
            candidateChatIds.push(chatId);
          }
        }
        if (candidateChatIds.length === 0) return null;

        // Fetch ALL members for candidate chats to verify total member count is exactly 2
        const { data: allMemberRows, error: allErr } = await getClient()
          .from('chat_members')
          .select('chat_id, user_id')
          .in('chat_id', candidateChatIds);
        if (allErr) return toApiError(allErr);

        const totalByChat = new Map<string, number>();
        for (const r of allMemberRows ?? []) {
          totalByChat.set(r.chat_id, (totalByChat.get(r.chat_id) ?? 0) + 1);
        }
        for (const chatId of candidateChatIds) {
          if (totalByChat.get(chatId) === 2) {
            const chat = await this.getChat(chatId);
            return chat && !('message' in chat) ? chat : null;
          }
        }
        return null;
      } catch (e) {
        return toApiError(e);
      }
    },

    async findExistingChatByMembers(
      userId: string,
      memberUserIds: string[]
    ): Promise<Chat | null | ApiError> {
      try {
        const otherIds = memberUserIds.filter((id) => id && id !== userId);
        const targetSet = new Set([userId, ...otherIds]);
        if (targetSet.size < 2) return null;

        const { data: userChatRows, error: userErr } = await getClient()
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', userId);
        if (userErr) return toApiError(userErr);
        const chatIds = [...new Set((userChatRows ?? []).map((r) => r.chat_id))];
        if (chatIds.length === 0) return null;

        const { data: allRows, error } = await getClient()
          .from('chat_members')
          .select('chat_id, user_id')
          .in('chat_id', chatIds);
        if (error) return toApiError(error);

        const byChat = new Map<string, Set<string>>();
        const rows = (allRows ?? []) as Array<{ chat_id: string; user_id: string }>;
        for (const r of rows) {
          const set = byChat.get(r.chat_id) ?? new Set();
          set.add(r.user_id);
          byChat.set(r.chat_id, set);
        }
        for (const [chatId, members] of byChat) {
          if (members.size === targetSet.size && [...targetSet].every((id) => members.has(id))) {
            const chat = await this.getChat(chatId);
            return chat && !('message' in chat) ? chat : null;
          }
        }
        return null;
      } catch (e) {
        return toApiError(e);
      }
    },

    async createChat(userId: string, input: CreateChatInput): Promise<Chat | ApiError> {
      try {
        const memberUserIds = input.memberUserIds?.filter((id) => id && id !== userId) ?? [];

        // Return existing chat if one already exists with these exact members
        const existing = await this.findExistingChatByMembers(userId, memberUserIds);
        if (existing && !('message' in existing)) {
          return existing;
        }

        const allMemberIds = [userId, ...memberUserIds];

        for (const mid of memberUserIds) {
          const friends = await this.areFriends(userId, mid);
          if (friends !== true) {
            return {
              message: 'You can only add friends to a chat',
              code: 'VALIDATION_ERROR',
            };
          }
        }

        const { data: chatRow, error } = await getClient()
          .from('chats')
          .insert({
            created_by_user_id: userId,
            name: input.name?.trim() || null,
            description: input.description?.trim() || null,
            image_url: input.imageUrl?.trim() || null,
          })
          .select('id, created_by_user_id, name, description, image_url, created_at, updated_at')
          .single();
        if (error) return toApiError(error);
        if (!chatRow) return { message: 'Failed to create chat', code: 'NOT_FOUND' };

        const memberInserts = allMemberIds.map((uid) => ({
          chat_id: chatRow.id,
          user_id: uid,
        }));
        const { error: memberErr } = await getClient().from('chat_members').insert(memberInserts);
        if (memberErr) return toApiError(memberErr);

        return this.getChat(chatRow.id);
      } catch (e) {
        return toApiError(e);
      }
    },

    async addChatMembers(
      chatId: string,
      addedByUserId: string,
      memberUserIds: string[]
    ): Promise<void | ApiError> {
      try {
        const { data: memberRows } = await getClient()
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chatId);
        const existingIds = new Set((memberRows ?? []).map((r) => r.user_id));
        if (!existingIds.has(addedByUserId)) {
          return { message: 'You must be a member to add others', code: 'FORBIDDEN' };
        }
        const toAdd = memberUserIds.filter(
          (id) => id && id !== addedByUserId && !existingIds.has(id)
        );
        if (toAdd.length === 0) return;
        for (const mid of toAdd) {
          const friends = await this.areFriends(addedByUserId, mid);
          if (friends !== true) {
            return {
              message: 'You can only add friends to a chat',
              code: 'VALIDATION_ERROR',
            };
          }
        }
        const inserts = toAdd.map((uid) => ({ chat_id: chatId, user_id: uid }));
        const { error } = await getClient().from('chat_members').insert(inserts);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeChatMember(
      chatId: string,
      memberUserId: string,
      removedByUserId: string
    ): Promise<void | ApiError> {
      try {
        if (!memberUserId || memberUserId === removedByUserId) {
          return { message: 'Invalid member', code: 'VALIDATION_ERROR' };
        }
        const { data: chatRow, error: chatErr } = await getClient()
          .from('chats')
          .select('created_by_user_id')
          .eq('id', chatId)
          .single();
        if (chatErr) return toApiError(chatErr);
        if (!chatRow) return { message: 'Chat not found', code: 'NOT_FOUND' };
        if (chatRow.created_by_user_id !== removedByUserId) {
          return {
            message: 'Only the person who created the chat can remove members',
            code: 'FORBIDDEN',
          };
        }
        const { error } = await getClient()
          .from('chat_members')
          .delete()
          .eq('chat_id', chatId)
          .eq('user_id', memberUserId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateChat(id: string, input: UpdateChatInput): Promise<Chat | ApiError> {
      try {
        const payload: Record<string, unknown> = {};
        if (input.name !== undefined) payload.name = input.name?.trim() || null;
        if (input.description !== undefined)
          payload.description = input.description?.trim() || null;
        if (input.imageUrl !== undefined) payload.image_url = input.imageUrl?.trim() || null;
        if (Object.keys(payload).length === 0) {
          return this.getChat(id);
        }

        const { error } = await getClient().from('chats').update(payload).eq('id', id);
        if (error) return toApiError(error);
        return this.getChat(id);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getChatMessages(
      chatId: string,
      options?: { userId?: string }
    ): Promise<ChatMessage[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('chat_messages')
          .select(
            'id, chat_id, user_id, body, created_at, updated_at, deleted_at, parent_message_id, image_urls, attachments'
          )
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true });
        if (error) return toApiError(error);
        const posts = rows ?? [];
        if (posts.length === 0) return [];

        const userIds = [...new Set(posts.map((r) => r.user_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }

        const postIds = posts.map((r) => r.id);
        const reactionCountMap = new Map<
          string,
          { prayer: number; laugh: number; thumbsUp: number }
        >();
        const userReactionMap = new Map<string, string[]>();
        const { data: reactionRows } = await getClient()
          .from('chat_message_reactions')
          .select('message_id, user_id, reaction_type')
          .in('message_id', postIds);
        if (reactionRows && reactionRows.length > 0) {
          const uid = options?.userId;
          for (const row of reactionRows as {
            message_id: string;
            user_id: string;
            reaction_type: string;
          }[]) {
            const key = row.message_id;
            if (!reactionCountMap.has(key)) {
              reactionCountMap.set(key, { prayer: 0, laugh: 0, thumbsUp: 0 });
            }
            const counts = reactionCountMap.get(key)!;
            if (row.reaction_type === 'prayer') counts.prayer++;
            else if (row.reaction_type === 'laugh') counts.laugh++;
            else if (row.reaction_type === 'thumbs_up') counts.thumbsUp++;
            if (uid && row.user_id === uid) {
              const arr = userReactionMap.get(key) ?? [];
              if (!arr.includes(row.reaction_type)) arr.push(row.reaction_type);
              userReactionMap.set(key, arr);
            }
          }
        }

        return posts.map((r) => {
          const profile = profileMap.get(r.user_id);
          const row = r as {
            image_urls?: string[];
            attachments?: unknown;
            parent_message_id?: string;
            updated_at?: string;
            deleted_at?: string;
          };
          const attachments = attachmentsForApiRow(row.attachments, row.image_urls);
          const imageUrls = deriveLegacyImageUrls(attachments);
          return {
            id: r.id,
            chatId: r.chat_id,
            userId: r.user_id,
            body: r.body,
            createdAt: r.created_at,
            updatedAt: row.updated_at ?? undefined,
            deletedAt: row.deleted_at ?? undefined,
            authorDisplayName: profile?.displayName,
            authorAvatarUrl: profile?.avatarUrl,
            parentMessageId: row.parent_message_id ?? undefined,
            imageUrls,
            attachments: attachments && attachments.length > 0 ? attachments : undefined,
            reactionCounts: reactionCountMap.get(r.id),
            userReactionTypes: options?.userId
              ? (userReactionMap.get(r.id) as PostReactionType[] | undefined)
              : undefined,
          };
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    async getChatSharedContent(chatId: string): Promise<ChatSharedContentMessage[] | ApiError> {
      try {
        const { data: rows, error } = await getClient().rpc('get_chat_shared_content', {
          p_chat_id: chatId,
        });
        if (error) return toApiError(error);
        const list = (rows ?? []) as Array<{
          id: string;
          created_at: string;
          body: string;
          attachments?: unknown;
          image_urls?: string[] | null;
        }>;
        return list.map((r) => {
          const attachments = attachmentsForApiRow(r.attachments, r.image_urls ?? undefined);
          const imageUrls = deriveLegacyImageUrls(attachments);
          return {
            id: r.id,
            createdAt: r.created_at,
            body: r.body ?? '',
            imageUrls,
            attachments: attachments && attachments.length > 0 ? attachments : undefined,
          };
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    async createChatMessage(
      chatId: string,
      userId: string,
      input: CreateChatMessageInput
    ): Promise<ChatMessage | ApiError> {
      try {
        const body = input.body?.trim() ?? '';
        const merged = mergeAttachmentsForCreate(input.attachments, input.imageUrls);
        const hasAttachments = merged.length > 0;
        if (!body && !hasAttachments) {
          return {
            message: 'Message must have text or at least one attachment',
            code: 'VALIDATION_ERROR',
          };
        }
        const imageUrlsDb = deriveImageUrlsForDb(merged);
        const payload = {
          chat_id: chatId,
          user_id: userId,
          body: body || '',
          parent_message_id: input.parentMessageId?.trim() || null,
          image_urls: imageUrlsDb,
          attachments: merged,
        };
        const { data: row, error } = await getClient()
          .from('chat_messages')
          .insert(payload)
          .select(
            'id, chat_id, user_id, body, created_at, updated_at, deleted_at, parent_message_id, image_urls, attachments'
          )
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Failed to create message', code: 'NOT_FOUND' };

        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        const r = row as {
          id: string;
          chat_id: string;
          user_id: string;
          body: string;
          created_at: string;
          updated_at?: string;
          deleted_at?: string;
          parent_message_id?: string;
          image_urls?: string[];
          attachments?: unknown;
        };
        const attachmentsOut = attachmentsForApiRow(r.attachments, r.image_urls);
        const imageUrlsOut = deriveLegacyImageUrls(attachmentsOut);
        return {
          id: r.id,
          chatId: r.chat_id,
          userId: r.user_id,
          body: r.body,
          createdAt: r.created_at,
          updatedAt: r.updated_at ?? undefined,
          deletedAt: r.deleted_at ?? undefined,
          authorDisplayName: profile?.displayName,
          authorAvatarUrl: profile?.avatarUrl,
          parentMessageId: r.parent_message_id ?? undefined,
          imageUrls: imageUrlsOut,
          attachments: attachmentsOut && attachmentsOut.length > 0 ? attachmentsOut : undefined,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateChatMessage(
      messageId: string,
      userId: string,
      input: UpdateChatMessageInput
    ): Promise<ChatMessage | ApiError> {
      try {
        const body = input.body !== undefined ? (input.body.trim() ?? '') : undefined;
        const payload: Record<string, unknown> = {};
        if (body !== undefined) payload.body = body;

        if (input.attachments !== undefined) {
          const merged = parseClientAttachments(input.attachments);
          payload.attachments = merged;
          payload.image_urls = deriveImageUrlsForDb(merged);
        } else if (input.imageUrls !== undefined) {
          const urls = input.imageUrls.filter((u) => typeof u === 'string' && u.length > 0);
          const merged = urls.map((url) => ({ kind: 'image' as const, url }));
          payload.attachments = merged;
          payload.image_urls = deriveImageUrlsForDb(merged);
        }

        if (Object.keys(payload).length === 0) {
          return { message: 'No updates provided', code: 'VALIDATION_ERROR' };
        }
        const { data: row, error } = await getClient()
          .from('chat_messages')
          .update(payload)
          .eq('id', messageId)
          .eq('user_id', userId)
          .select(
            'id, chat_id, user_id, body, created_at, updated_at, deleted_at, parent_message_id, image_urls, attachments'
          )
          .maybeSingle();
        if (error) return toApiError(error);
        if (!row)
          return { message: 'Message not found or not authorized to edit', code: 'NOT_FOUND' };
        const r = row as {
          id: string;
          chat_id: string;
          user_id: string;
          body: string;
          created_at: string;
          updated_at?: string;
          parent_message_id?: string;
          image_urls?: string[];
          attachments?: unknown;
        };
        const { data: p } = await getClient()
          .from('profiles')
          .select('display_name, first_name, last_name, avatar_url')
          .eq('user_id', r.user_id)
          .maybeSingle();
        let profile: { displayName?: string; avatarUrl?: string } | null = null;
        if (p) {
          const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
          let avatarUrl = p.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          profile = { displayName, avatarUrl };
        }
        const attachmentsOut = attachmentsForApiRow(r.attachments, r.image_urls);
        const imageUrlsOut = deriveLegacyImageUrls(attachmentsOut);
        return {
          id: r.id,
          chatId: r.chat_id,
          userId: r.user_id,
          body: r.body,
          createdAt: r.created_at,
          updatedAt: r.updated_at ?? undefined,
          authorDisplayName: profile?.displayName,
          authorAvatarUrl: profile?.avatarUrl,
          parentMessageId: r.parent_message_id ?? undefined,
          imageUrls: imageUrlsOut,
          attachments: attachmentsOut && attachmentsOut.length > 0 ? attachmentsOut : undefined,
        };
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteChatMessage(messageId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('chat_messages')
          .update({
            deleted_at: new Date().toISOString(),
            body: '',
            attachments: [],
            image_urls: null,
          })
          .eq('id', messageId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
        // Best-effort: clear reactions on the now-deleted message too. RLS lets any chat
        // member delete their own reaction row, not arbitrary rows, so this only succeeds
        // for the caller's own reactions; any left by others are harmless orphaned rows
        // that the (now content-free) tombstone never renders.
        await getClient()
          .from('chat_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async reactToChatMessage(
      messageId: string,
      chatId: string,
      userId: string,
      reactionType: PostReactionType
    ): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('chat_message_reactions').upsert(
          {
            message_id: messageId,
            user_id: userId,
            reaction_type: reactionType,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'message_id,user_id' }
        );
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeChatMessageReaction(
      messageId: string,
      chatId: string,
      userId: string,
      reactionType: PostReactionType
    ): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('chat_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getChatMessageReactions(messageId: string): Promise<PostReactionDetail[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('chat_message_reactions')
          .select('user_id, reaction_type')
          .eq('message_id', messageId);
        if (error) return toApiError(error);
        const reactions = rows ?? [];
        if (reactions.length === 0) return [];
        const userIds = [...new Set(reactions.map((r) => r.user_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of userIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }
        return reactions.map((r) => {
          const profile = profileMap.get(r.user_id);
          return {
            userId: r.user_id,
            displayName: profile?.displayName,
            avatarUrl: profile?.avatarUrl,
            reactionType: r.reaction_type as PostReactionType,
          };
        });
      } catch (e) {
        return toApiError(e);
      }
    },

    async getChatFolders(userId: string): Promise<ChatFolder[] | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('chat_folders')
          .select('id, user_id, name, created_at')
          .eq('user_id', userId)
          .order('name');
        if (error) return toApiError(error);
        return (data ?? []).map((r) => ({
          id: r.id,
          userId: r.user_id,
          name: r.name,
          createdAt: r.created_at,
        }));
      } catch (e) {
        return toApiError(e);
      }
    },

    async createChatFolder(userId: string, name: string): Promise<ChatFolder | ApiError> {
      try {
        const n = name?.trim();
        if (!n) return { message: 'Folder name is required', code: 'VALIDATION_ERROR' };
        const { data, error } = await getClient()
          .from('chat_folders')
          .insert({ user_id: userId, name: n })
          .select('id, user_id, name, created_at')
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Failed to create folder', code: 'NOT_FOUND' };
        return { id: data.id, userId: data.user_id, name: data.name, createdAt: data.created_at };
      } catch (e) {
        return toApiError(e);
      }
    },

    async updateChatFolder(
      folderId: string,
      userId: string,
      name: string
    ): Promise<ChatFolder | ApiError> {
      try {
        const n = name?.trim();
        if (!n) return { message: 'Folder name is required', code: 'VALIDATION_ERROR' };
        const { data, error } = await getClient()
          .from('chat_folders')
          .update({ name: n })
          .eq('id', folderId)
          .eq('user_id', userId)
          .select('id, user_id, name, created_at')
          .maybeSingle();
        if (error) return toApiError(error);
        if (!data) return { message: 'Folder not found', code: 'NOT_FOUND' };
        return { id: data.id, userId: data.user_id, name: data.name, createdAt: data.created_at };
      } catch (e) {
        return toApiError(e);
      }
    },

    async deleteChatFolder(folderId: string, userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('chat_folders')
          .delete()
          .eq('id', folderId)
          .eq('user_id', userId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getChatFolderItems(folderId: string): Promise<ChatFolderItem[] | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('chat_folder_items')
          .select('folder_id, chat_id, created_at')
          .eq('folder_id', folderId);
        if (error) return toApiError(error);
        return (data ?? []).map((r) => ({
          folderId: r.folder_id,
          chatId: r.chat_id,
          createdAt: r.created_at,
        }));
      } catch (e) {
        return toApiError(e);
      }
    },

    async addChatToFolder(
      folderId: string,
      chatId: string,
      userId: string
    ): Promise<ChatFolderItem | ApiError> {
      try {
        const { data: memberRow } = await getClient()
          .from('chat_members')
          .select('chat_id')
          .eq('chat_id', chatId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!memberRow) {
          return {
            message: 'You must be a member of the chat to add it to a folder',
            code: 'FORBIDDEN',
          };
        }
        const { data, error } = await getClient()
          .from('chat_folder_items')
          .insert({ folder_id: folderId, chat_id: chatId })
          .select('folder_id, chat_id, created_at')
          .single();
        if (error) return toApiError(error);
        if (!data) return { message: 'Failed to add chat to folder', code: 'NOT_FOUND' };
        return { folderId: data.folder_id, chatId: data.chat_id, createdAt: data.created_at };
      } catch (e) {
        return toApiError(e);
      }
    },

    async removeChatFromFolder(
      folderId: string,
      chatId: string,
      userId: string
    ): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('chat_folder_items')
          .delete()
          .eq('folder_id', folderId)
          .eq('chat_id', chatId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getProfiles(userIds: string[]): Promise<Profile[] | ApiError> {
      try {
        const unique = [...new Set(userIds.filter((id) => id && id.length > 0))];
        if (unique.length === 0) return [];
        const { data, error } = await getClient()
          .from('profiles')
          .select(
            'user_id, email, display_name, first_name, last_name, birth_date, country, preferred_language, avatar_url, bio, updated_at'
          )
          .in('user_id', unique);
        if (error) return toApiError(error);
        const rows = data ?? [];
        const result: Profile[] = [];
        for (const r of rows) {
          let avatarUrl = r.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          const derivedDisplayName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
          const displayName = r.display_name?.trim() || derivedDisplayName || undefined;
          result.push({
            userId: r.user_id,
            email: r.email ?? undefined,
            displayName,
            firstName: r.first_name ?? undefined,
            lastName: r.last_name ?? undefined,
            birthDate: r.birth_date ?? undefined,
            country: r.country ?? undefined,
            preferredLanguage: r.preferred_language ?? undefined,
            avatarUrl,
            bio: r.bio ?? undefined,
            updatedAt: r.updated_at ?? undefined,
          });
        }
        return result;
      } catch (e) {
        return toApiError(e);
      }
    },

    async searchProfiles(search: string, excludeUserId: string): Promise<Profile[] | ApiError> {
      try {
        const term = search.trim();
        if (!term) return [];
        const pattern = `%${term}%`;
        let query = getClient()
          .from('profiles')
          .select(
            'user_id, email, display_name, first_name, last_name, birth_date, country, preferred_language, avatar_url, bio, updated_at'
          )
          .neq('user_id', excludeUserId)
          .or(
            `display_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`
          )
          .limit(30);
        const { data, error } = await query;
        if (error) return toApiError(error);
        const rows = data ?? [];
        const result: Profile[] = [];
        for (const r of rows) {
          let avatarUrl = r.avatar_url ?? undefined;
          if (avatarUrl) {
            avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
          }
          const derivedDisplayName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
          const displayName = r.display_name?.trim() || derivedDisplayName || undefined;
          result.push({
            userId: r.user_id,
            email: r.email ?? undefined,
            displayName,
            firstName: r.first_name ?? undefined,
            lastName: r.last_name ?? undefined,
            birthDate: r.birth_date ?? undefined,
            country: r.country ?? undefined,
            preferredLanguage: r.preferred_language ?? undefined,
            avatarUrl,
            bio: r.bio ?? undefined,
            updatedAt: r.updated_at ?? undefined,
          });
        }
        return result;
      } catch (e) {
        return toApiError(e);
      }
    },

    async isSuperAdmin(userId: string): Promise<boolean | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('app_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        return data?.role === 'super_admin';
      } catch (e) {
        return toApiError(e);
      }
    },

    async isAdmin(userId: string): Promise<boolean | ApiError> {
      try {
        const { data, error } = await getClient()
          .from('app_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) return toApiError(error);
        return data?.role === 'super_admin' || data?.role === 'admin';
      } catch (e) {
        return toApiError(e);
      }
    },

    async getGroupsWhereUserIsAdmin(userId: string): Promise<Group[] | ApiError> {
      try {
        const { data: adminRows, error: adminError } = await getClient()
          .from('group_admins')
          .select('group_id')
          .eq('user_id', userId);
        if (adminError) return toApiError(adminError);
        const groupIds = (adminRows ?? []).map((r) => r.group_id);
        if (groupIds.length === 0) return [];
        const { data, error } = await getClient()
          .from('groups')
          .select(
            'id, type, name, description, banner_image_url, preferred_language, country, created_by_user_id, created_at, updated_at, group_members(count)'
          )
          .in('id', groupIds)
          .order('name');
        if (error) return toApiError(error);
        return (data ?? []).map(mapGroupRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async assignAdmin(userId: string, assignedByUserId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('app_roles').insert({
          user_id: userId,
          role: 'admin',
          assigned_by_user_id: assignedByUserId,
        });
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async revokeAdmin(userId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient()
          .from('app_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getUserIdByEmail(email: string): Promise<string | null | ApiError> {
      try {
        const { data, error } = await getClient().rpc('get_user_id_by_email', {
          lookup_email: email,
        });
        if (error) return toApiError(error);
        return (data as string | null) ?? null;
      } catch (e) {
        return toApiError(e);
      }
    },

    // --- Friend requests ---

    async sendFriendRequest(
      senderId: string,
      receiverId: string
    ): Promise<FriendRequest | ApiError> {
      try {
        if (senderId === receiverId) {
          return { message: 'Cannot send a friend request to yourself', code: 'VALIDATION_ERROR' };
        }

        const { data: existing, error: existErr } = await getClient()
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at, updated_at')
          .eq('sender_id', senderId)
          .eq('receiver_id', receiverId)
          .maybeSingle();
        if (existErr) return toApiError(existErr);

        if (existing) {
          if (existing.status === 'pending') {
            return { message: 'Friend request already sent', code: 'ALREADY_EXISTS' };
          }
          if (existing.status === 'accepted') {
            const friends = await this.areFriends(senderId, receiverId);
            if (friends === true) {
              return { message: 'Already friends with this user', code: 'ALREADY_EXISTS' };
            }
          }
          // Previously declined or accepted-without-friendship — re-send by updating back to pending
          const { data: row, error } = await getClient()
            .from('friend_requests')
            .update({ status: 'pending' })
            .eq('id', existing.id)
            .select('id, sender_id, receiver_id, status, created_at, updated_at')
            .single();
          if (error) return toApiError(error);
          if (!row) return { message: 'Failed to re-send friend request', code: 'NOT_FOUND' };
          return mapFriendRequestRow(row as FriendRequestRow);
        }

        const { data: row, error } = await getClient()
          .from('friend_requests')
          .insert({ sender_id: senderId, receiver_id: receiverId })
          .select('id, sender_id, receiver_id, status, created_at, updated_at')
          .single();
        if (error) return toApiError(error);
        if (!row) return { message: 'Failed to send friend request', code: 'NOT_FOUND' };
        return mapFriendRequestRow(row as FriendRequestRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async cancelFriendRequest(requestId: string): Promise<void | ApiError> {
      try {
        const { error } = await getClient().from('friend_requests').delete().eq('id', requestId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async acceptFriendRequest(requestId: string, receiverId: string): Promise<void | ApiError> {
      try {
        const { data: req, error: fetchErr } = await getClient()
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status')
          .eq('id', requestId)
          .single();
        if (fetchErr) return toApiError(fetchErr);
        if (!req) return { message: 'Friend request not found', code: 'NOT_FOUND' };
        if (req.receiver_id !== receiverId) {
          return { message: 'Not authorized to accept this request', code: 'FORBIDDEN' };
        }
        if (req.status !== 'pending') {
          return { message: 'Friend request is no longer pending', code: 'VALIDATION_ERROR' };
        }

        const { error: updateErr } = await getClient()
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);
        if (updateErr) return toApiError(updateErr);

        const u = req.sender_id < req.receiver_id ? req.sender_id : req.receiver_id;
        const f = req.sender_id < req.receiver_id ? req.receiver_id : req.sender_id;
        const { error: friendErr } = await getClient()
          .from('friendships')
          .insert({ user_id: u, friend_id: f });
        if (friendErr) return toApiError(friendErr);
      } catch (e) {
        return toApiError(e);
      }
    },

    async declineFriendRequest(requestId: string, receiverId: string): Promise<void | ApiError> {
      try {
        const { data: req, error: fetchErr } = await getClient()
          .from('friend_requests')
          .select('id, receiver_id, status')
          .eq('id', requestId)
          .single();
        if (fetchErr) return toApiError(fetchErr);
        if (!req) return { message: 'Friend request not found', code: 'NOT_FOUND' };
        if (req.receiver_id !== receiverId) {
          return { message: 'Not authorized to decline this request', code: 'FORBIDDEN' };
        }

        const { error } = await getClient()
          .from('friend_requests')
          .update({ status: 'declined' })
          .eq('id', requestId);
        if (error) return toApiError(error);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getReceivedFriendRequests(userId: string): Promise<FriendRequest[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at, updated_at')
          .eq('receiver_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) return toApiError(error);
        const requests = (rows ?? []) as FriendRequestRow[];
        if (requests.length === 0) return [];

        const senderIds = [...new Set(requests.map((r) => r.sender_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of senderIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }

        return requests.map((r) => mapFriendRequestRow(r, profileMap.get(r.sender_id) ?? null));
      } catch (e) {
        return toApiError(e);
      }
    },

    async getSentFriendRequests(userId: string): Promise<FriendRequest[] | ApiError> {
      try {
        const { data: rows, error } = await getClient()
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at, updated_at')
          .eq('sender_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) return toApiError(error);
        const requests = (rows ?? []) as FriendRequestRow[];
        if (requests.length === 0) return [];

        const receiverIds = [...new Set(requests.map((r) => r.receiver_id))];
        const profileMap = new Map<string, { displayName?: string; avatarUrl?: string }>();
        for (const uid of receiverIds) {
          const { data: p } = await getClient()
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', uid)
            .maybeSingle();
          if (p) {
            const derivedDisplayName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            const displayName = p.display_name?.trim() || derivedDisplayName || undefined;
            let avatarUrl = p.avatar_url ?? undefined;
            if (avatarUrl) {
              avatarUrl = await resolveAvatarDisplayUrl(getClient, avatarUrl);
            }
            profileMap.set(uid, { displayName, avatarUrl });
          }
        }

        return requests.map((r) =>
          mapFriendRequestRow(r, undefined, profileMap.get(r.receiver_id) ?? null)
        );
      } catch (e) {
        return toApiError(e);
      }
    },

    async getFriendRequestBetween(
      userId: string,
      targetUserId: string
    ): Promise<FriendRequest | null | ApiError> {
      try {
        if (userId === targetUserId) return null;
        const { data, error } = await getClient()
          .from('friend_requests')
          .select('id, sender_id, receiver_id, status, created_at, updated_at')
          .eq('status', 'pending')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`
          )
          .maybeSingle();
        if (error) return toApiError(error);
        if (!data) return null;
        return mapFriendRequestRow(data as FriendRequestRow);
      } catch (e) {
        return toApiError(e);
      }
    },

    async getPendingFriendRequestCount(userId: string): Promise<number | ApiError> {
      try {
        const { count, error } = await getClient()
          .from('friend_requests')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', userId)
          .eq('status', 'pending');
        if (error) return toApiError(error);
        return count ?? 0;
      } catch (e) {
        return toApiError(e);
      }
    },

    async listInAppNotifications(
      userId: string,
      options?: { limit?: number }
    ): Promise<InAppNotification[] | ApiError> {
      try {
        const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
        const { data: rows, error } = await getClient()
          .from('in_app_notifications')
          .select(
            'id, user_id, group_id, group_name, kind, announcement_id, group_event_id, title, summary, created_at, read_at'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) return toApiError(error);
        return (rows ?? []).map((r) => mapInAppNotificationRow(r as InAppNotificationRow));
      } catch (e) {
        return toApiError(e);
      }
    },

    async getUnreadInAppNotificationCount(
      userId: string,
      options?: { createdAfter?: string }
    ): Promise<number | ApiError> {
      try {
        let q = getClient()
          .from('in_app_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('read_at', null);
        const after = options?.createdAfter?.trim();
        if (after) {
          q = q.gt('created_at', after);
        }
        const { count, error } = await q;
        if (error) return toApiError(error);
        return count ?? 0;
      } catch (e) {
        return toApiError(e);
      }
    },

    async markInAppNotificationsRead(
      input: MarkInAppNotificationsReadInput
    ): Promise<void | ApiError> {
      try {
        const { notificationIds, announcementId, groupEventId } = input;
        const hasIds = notificationIds != null && notificationIds.length > 0;
        const hasAnn = announcementId != null && announcementId.length > 0;
        const hasEv = groupEventId != null && groupEventId.length > 0;
        const targets = (hasIds ? 1 : 0) + (hasAnn ? 1 : 0) + (hasEv ? 1 : 0);
        if (targets > 1) {
          return { message: 'Invalid mark notification request', code: 'VALIDATION_ERROR' };
        }
        const { error } = await getClient().rpc('mark_in_app_notifications_read', {
          p_notification_ids: hasIds ? notificationIds : null,
          p_announcement_id: hasAnn ? announcementId : null,
          p_group_event_id: hasEv ? groupEventId : null,
        });
        if (error) return toApiError(error);
        return;
      } catch (e) {
        return toApiError(e);
      }
    },

    async getAppBadgeCount(userId: string): Promise<number | ApiError> {
      try {
        const { data, error } = await getClient().rpc('get_app_badge_count', {
          p_user_id: userId,
        });
        if (error) return toApiError(error);
        if (typeof data === 'number' && Number.isFinite(data)) {
          return Math.max(0, data);
        }
        if (typeof data === 'string') {
          const n = parseInt(data, 10);
          return Number.isFinite(n)
            ? Math.max(0, n)
            : { message: 'Invalid badge count response', code: 'INVALID_RESPONSE' };
        }
        return { message: 'Invalid badge count response', code: 'INVALID_RESPONSE' };
      } catch (e) {
        return toApiError(e);
      }
    },
  };
}
