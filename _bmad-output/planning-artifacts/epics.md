---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
---

> **As-built (2026-03-24):** Story completion and epic scope have drifted; use `_bmad-output/implementation-artifacts/sprint-status.yaml` and `docs/as-built-snapshot.md` for delivery truth. This file remains the historical epic/story breakdown.

# p28-v2 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for p28-v2, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Admin can create and configure an organization (church) with a name and basic settings.
FR2: Admin can create ministries within an organization and assign ministry leads.
FR3: Ministry leads can create and configure groups within their ministry.
FR4: The system supports multiple organizations, each with multiple ministries and groups.
FR5: Admin can invite or assign users as ministry leads for specific ministries.
FR6: A user can create an account and sign in.
FR7: A user can set and update a profile picture and personal information visible to others in their org/ministry/group context.
FR8: A user can join as a guest (explorer) with limited visibility and control over what they see and receive.
FR9: A user can control which notifications they receive (e.g. by type, ministry, or group).
FR10: A user can choose their preferred app language (English, Korean, or Khmer) for UI and content.
FR11: A user can discover and join an organization (e.g. via link or app store and then org selection).
FR12: A user can browse ministries and groups within an organization and join those they choose.
FR13: A user can leave a group or ministry and remain in the organization where allowed.
FR14: A guest can explore ministries and groups with controlled visibility and notification settings.
FR15: The system can send push notifications to users on iOS and Android for events, announcements, and messaging as configured.
FR16: Leaders can target push notifications (or in-app notifications) to members of a specific ministry or group.
FR17: A user can manage notification preferences (e.g. which types and from which ministries/groups they receive push).
FR18: A member can send and receive direct (1:1) messages with other members within the same organization or permitted context.
FR19: A member can participate in group or forum-style discussions within a group they have joined.
FR20: A member can participate in small-group discussions (e.g. within a ministry or group) as configured.
FR21: The system surfaces recent or relevant messages (e.g. preview) so users can see activity and navigate to conversations.
FR22: A user can view a home or feed that shows upcoming events, announcements, and a preview of recent messages (and optional daily moment where implemented).
FR23: A user can view announcements and events for organizations, ministries, and groups they have joined.
FR24: Leaders can create and publish announcements to a chosen audience (org, ministry, or group).
FR25: Leaders can create and publish events (e.g. services, meetings) and target them to a chosen audience.
FR26: A user can view event details and indicate interest or RSVP where the product supports it.
FR27: A ministry lead can create and manage groups within their ministry.
FR28: A ministry lead can post announcements and events and choose the audience (ministry or specific groups).
FR29: A ministry lead can see basic visibility into engagement (e.g. who is active or participating) for their ministry or groups.
FR30: A ministry lead can collaborate or coordinate with other leaders in the same organization (e.g. shared context or visibility as defined by product).
FR31: An admin can set up and edit the organization structure (org, ministries, groups).
FR32: An admin can invite users and assign them as ministry leads.
FR33: An admin can perform oversight actions (e.g. view structure, access needed for support) without necessarily managing day-to-day content.
FR34: (Deferred) A user can understand or control who can see their profile or activity within the bounds of the product (e.g. org/ministry/group visibility). Profile visibility preference removed from project scope for MVP.
FR35: The product supports clear expectations for conduct (e.g. through in-app guidelines or code of conduct where implemented).
FR36: The system stores and displays content in the user's chosen language (English, Korean, or Khmer) where multi-language content is available.

### NonFunctional Requirements

NFR-P1: Core user actions (open feed, open a conversation, view event/announcement) complete and show content within 3 seconds under normal conditions so the app feels responsive and users open it regularly.
NFR-P2: Push notifications are delivered within 1 minute of the trigger (e.g. new announcement or message) under normal conditions so reminders and updates feel timely.
NFR-P3: Messaging and group discussions support real-time or near-real-time delivery (e.g. new messages visible within seconds) so conversations feel live.
NFR-S1: User data (profiles, messages, membership) is encrypted in transit (e.g. TLS) and at rest where stored to protect personal and spiritual content.
NFR-S2: Access to data is scoped by role and context (org/ministry/group) so users and leaders only see what they are permitted to see.
NFR-S3: Authentication and session handling follow current mobile best practices (e.g. secure tokens, session expiry) so accounts are not easily compromised.
NFR-R1: The app and its backend are available for normal use with target 99% uptime during active hours (or equivalent) so it is dependable as the main app for church life.
NFR-R2: No unplanned data loss for user-generated content (messages, profiles, announcements, events); backups and recovery procedures support recovery from failures.
NFR-A1: The app meets WCAG 2.1 Level AA (or equivalent) for core flows (onboarding, feed, messaging, events) so it is usable by people with common accessibility needs.
NFR-A2: Supported languages (English, Korean, Khmer) are correctly displayed and navigable with system accessibility features (e.g. screen reader, text scaling).
NFR-SC1: The system supports multiple organizations and hundreds of concurrent users per org at MVP without degrading performance below NFR-P1/P2/P3.
NFR-SC2: Architecture and operations allow scaling to more orgs and users (e.g. 10x) without a full redesign; specific targets can be set as usage grows.

### Additional Requirements

**From Architecture — starter and setup:**
- Project initialization is the first implementation story: run `npx create-expo-app@latest --template tabs` (app name e.g. p28-v2, TypeScript). Add Supabase after creation per Supabase + Expo React Native guide.
- Backend: All server access via contracts (Auth, Data, Realtime) and adapters; app must not import backend SDKs outside `lib/api/adapters/`. Single facade (e.g. `lib/api/index.ts`) exposes auth, data, realtime.
- Define contracts in `lib/api/contracts/` (Auth, Data, Realtime, ApiError, DTOs); implement Supabase adapter in `lib/api/adapters/supabase/`.
- Migrations: Supabase migrations SQL, versioned in repo; applied via CLI or CI.
- Push: Expo Notifications (FCM/APNs); device tokens stored via data contract; delivery triggered by backend (Supabase Edge Function or webhook—TBD in implementation).
- Realtime: Subscribe/unsubscribe via contract; channel naming e.g. `messages:group:{id}`; adapters map to Supabase Realtime.
- Naming: DB/Postgres snake_case; contract DTOs camelCase; components PascalCase; Realtime channel IDs kebab-case with scope.
- Project structure: `app/` (Expo Router, tabs + stacks), `components/primitives/`, `components/patterns/`, `lib/api/` (contracts, adapters, facade), `hooks/`, `contexts/`, `theme/`, `supabase/migrations/`. No backend SDK in app or components.

**From Architecture — integration and security:**
- Auth: Supabase Auth; session persisted (e.g. AsyncStorage); RLS for authorization. Contract exposes signIn, signOut, getSession, getCurrentUser, onAuthStateChange.
- All backend errors normalized to ApiError; one getUserFacingError helper for UI. No raw backend errors or stack traces to user.
- Loading: Single convention (e.g. isLoading, isSubmitting); skeletons/spinners per UX spec; no full-app blocking for single request.

**From UX — design system and UI:**
- Custom design system: design tokens first (colors, typography, spacing, radius), then primitives (Button, Card, Input, List item, Avatar, Badge), then pattern components (EventCard, GroupRow, etc.). No third-party component library as base.
- Design direction: Warm & Soft baseline. Tokens: background #faf8f5, primary #2C7CB5, complementary accent #C77B38, radius 12px cards / 8px buttons, contrast WCAG 2.1 AA.
- Bottom navigation: Home, Groups, Messages, Profile; 44pt min touch targets; labels always visible.
- Components to implement (from UX): EventCard, DailyMomentCard, AnnouncementCard, MessagePreviewRow, GroupRow, MinistryNav, AudienceSelector, ComposeCard, OrgStructureRow.
- Feedback: Success (toast/confirmation), error (inline/banner + retry), loading (skeleton/spinner on component), validation (inline, semantic error color).
- Forms: Labels always visible; audience selector required for leaders before Publish; guest preferences as toggles/checkboxes.
- Empty states: Short copy + one suggested action; pull-to-refresh on Home and lists.

**From UX — accessibility and responsive:**
- WCAG 2.1 Level AA for core flows (onboarding, Home, messaging, events). Contrast 4.5:1 body, 3:1 large text.
- Touch targets minimum 44×44pt; accessibilityLabel (and accessibilityHint where helpful) for interactive elements; support system font scaling (EN/KR/KH).
- MVP: mobile-only (phones), portrait-optimized; landscape same content. Tablets: same layout with larger targets/spacing.
- Respect reduced motion preference where applicable.

### FR Coverage Map

FR1: Epic 2 - Admin creates organization with name and settings
FR2: Epic 2 - Admin creates ministries and assigns leads
FR3: Epic 2 - Ministry leads create and configure groups
FR4: Epic 2 - System supports multiple orgs, ministries, groups
FR5: Epic 2 - Admin invites/assigns ministry leads
FR6: Epic 1 - User creates account and signs in
FR7: Epic 1 - User sets profile picture and personal info
FR8: Epic 3 - User joins as guest (explorer) with limited visibility
FR9: Epic 1 - User controls notification preferences
FR10: Epic 1 - User chooses app language (EN/KR/KH)
FR11: Epic 3 - User discovers and joins organization
FR12: Epic 3 - User browses and joins ministries and groups
FR13: Epic 3 - User leaves group or ministry
FR14: Epic 3 - Guest explores with visibility and notification control
FR15: Epic 6 - System sends push notifications (iOS/Android)
FR16: Epic 6 - Leaders target push by ministry/group
FR17: Epic 1 - User manages notification preferences (same as FR9)
FR18: Epic 5 - Member sends/receives 1:1 messages
FR19: Epic 5 - Member participates in group/forum discussions
FR20: Epic 5 - Member participates in small-group discussions
FR21: Epic 5 - System surfaces message previews
FR22: Epic 4 - User views home/feed (events, announcements, message preview)
FR23: Epic 4 - User views announcements and events for joined orgs/ministries/groups
FR24: Epic 4 - Leaders create and publish announcements to audience
FR25: Epic 4 - Leaders create and publish events to audience
FR26: Epic 4 - User views event details and RSVPs
FR27: Epic 7 - Ministry lead creates and manages groups
FR28: Epic 7 - Ministry lead posts announcements/events and chooses audience
FR29: Epic 7 - Ministry lead sees engagement visibility
FR30: Epic 7 - Ministry lead collaborates with other leaders
FR31: Epic 2 - Admin sets up and edits org structure
FR32: Epic 2 - Admin invites and assigns ministry leads
FR33: Epic 2 - Admin performs oversight actions
FR34: Deferred - Profile/activity visibility (out of scope for MVP)
FR35: Epic 1 - Product supports conduct expectations (guidelines/code of conduct)
FR36: Epic 1 - System stores and displays content in user's chosen language

## Epic List

### Epic 1: App foundation and user identity
Users can open the app, create an account, sign in, set their profile (picture and info), manage notification preferences, choose app language (EN/KR/KH), and see in-app conduct expectations. The app has a runnable foundation (Expo + design system + backend contracts and Supabase adapter) so all future features share one base.
**FRs covered:** FR6, FR7, FR9, FR10, FR17, FR35, FR36.

### Epic 2: Organization structure and leadership
Admins can create and configure organizations (churches), create ministries and groups, assign ministry leads, and perform oversight. The system supports multiple organizations with clear org → ministry → group hierarchy.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR31, FR32, FR33.

### Epic 3: Discovery and onboarding
Users can discover and join an organization, browse ministries and groups, join or leave groups/ministries, and remain in the org where allowed. Guests can explore with controlled visibility and notification settings.
**FRs covered:** FR8, FR11, FR12, FR13, FR14.

### Epic 4: Home, events, and announcements
Users see a home/feed with upcoming events, announcements, and message preview (and optional daily moment). They can view announcements and events for joined orgs/ministries/groups, view event details, and RSVP. Leaders can create and publish announcements and events to a chosen audience.
**FRs covered:** FR22, FR23, FR24, FR25, FR26.

### Epic 5: Messaging and discussions
Members can send and receive 1:1 messages, participate in group/forum and small-group discussions, and see recent/relevant message previews so they can stay in the loop and navigate to conversations.
**FRs covered:** FR18, FR19, FR20, FR21.

### Epic 6: Push notifications
The system sends push notifications on iOS and Android for events, announcements, and messaging. Leaders can target push (or in-app notifications) by ministry or group. User notification preferences from Epic 1 are respected.
**FRs covered:** FR15, FR16.

### Epic 7: Leader tools
Ministry leads can create and manage groups within their ministry, post announcements and events and choose audience (ministry or groups), see basic engagement (who is active or participating), and collaborate with other leaders in the same organization.
**FRs covered:** FR27, FR28, FR29, FR30.

---

## Epic 1: App foundation and user identity

Users can open the app, create an account, sign in, set their profile (picture and info), manage notification preferences, choose app language (EN/KR/KH), and see in-app conduct expectations. The app has a runnable foundation (Expo + design system + backend contracts and Supabase adapter) so all future features share one base.

### Story 1.1: Initialize Expo app with tabs template

As a developer,
I want the project initialized with Expo (tabs template) and TypeScript,
So that the app runs with a tab shell (Home, Groups, Messages, Profile) and matches the architecture.

**Acceptance Criteria:**

**Given** a clean repo or project root,
**When** I run `npx create-expo-app@latest --template tabs` (app name e.g. p28-v2, TypeScript),
**Then** the app runs with Expo Router and tab layout (Home, Groups, Messages, Profile),
**And** project structure includes `app/`, `components/`, and no backend SDK in app or components.

### Story 1.2: Design tokens and core primitives

As a user,
I want the app to use a consistent, warm visual system (Warm & Soft),
So that the experience feels cohesive and on-brand.

**Acceptance Criteria:**

**Given** Epic 1.1 is complete,
**When** I implement design tokens (colors #faf8f5, #2C7CB5, #C77B38; spacing; radius 12px/8px; typography) and core primitives (Button, Card, Input, List item, Avatar, Badge),
**Then** all tokens live in a single theme source and primitives use them with 44pt minimum touch targets,
**And** primitives have no backend or router dependencies; contrast meets WCAG 2.1 AA where applicable.

### Story 1.3: Backend contracts and Supabase project

As a developer,
I want backend access defined by contracts and a Supabase project provisioned,
So that the app can talk to a backend in a stable, backend-agnostic way.

**Acceptance Criteria:**

**Given** Epic 1.1 is complete,
**When** I add `lib/api/contracts/` (Auth, Data, Realtime, ApiError, DTOs) and create a Supabase project with initial config,
**Then** contracts define the stable API (auth: signIn, signOut, getSession, getCurrentUser, onAuthStateChange; data and realtime interfaces; ApiError shape),
**And** no app code outside `lib/api/adapters/` imports the backend SDK; project structure follows architecture.

### Story 1.4: Supabase auth adapter and sign-in/sign-up

As a user,
I want to create an account and sign in,
So that I have a persistent identity in the app.

**Acceptance Criteria:**

**Given** Epics 1.2 and 1.3 are complete,
**When** I implement the Supabase auth adapter (implementing the auth contract), wire the facade (`lib/api/index.ts`), and add sign-in and sign-up screens that use only the facade,
**Then** a user can create an account and sign in; session is persisted (e.g. AsyncStorage) and survives app restart,
**And** all backend errors are normalized to ApiError; UI uses a single getUserFacingError helper; auth follows NFR-S3 (secure tokens, session expiry).

### Story 1.5: Profile

As a user,
I want to set my profile picture and personal information,
So that others in my org/ministry/group context can see the right information.

**Acceptance Criteria:**

**Given** Epic 1.4 is complete and profile data is available via the data contract,
**When** I add profile screen(s) for setting/updating profile picture and personal info,
**Then** profile data is stored and displayed,
**And** FR7 is satisfied (profile picture and personal info).

### Story 1.6: Notification preferences

As a user,
I want to control which notifications I receive (by type and by ministry/group),
So that I am not overwhelmed and get only relevant updates.

**Acceptance Criteria:**

**Given** Epic 1.4 is complete,
**When** I add a way for the user to set notification preferences (which types and from which ministries/groups they receive push),
**Then** preferences are stored (via data contract) and available for the push system to respect later,
**And** FR9 and FR17 are satisfied.

### Story 1.7: App language (i18n)

As a user,
I want to choose my preferred app language (English, Korean, or Khmer),
So that the UI and content are in a language I understand.

**Acceptance Criteria:**

**Given** Epic 1.2 is complete,
**When** I implement i18n (e.g. `lib/i18n.ts`) and language selector and ensure UI and content use the selected locale,
**Then** the user can choose EN, KR, or KH and see the app in that language; content is stored/displayed in the chosen language where available,
**And** FR10 and FR36 are satisfied; supported languages work with system accessibility (NFR-A2).

### Story 1.8: In-app conduct guidelines

As a user,
I want to see clear expectations for conduct (e.g. guidelines or code of conduct),
So that I know how to participate respectfully.

**Acceptance Criteria:**

**Given** Epic 1.4 is complete,
**When** I add a way to display in-app conduct guidelines or code of conduct (e.g. in settings or onboarding),
**Then** the user can view expectations for conduct in the product,
**And** FR35 is satisfied.

---

## Epic 2: Organization structure and leadership

Admins can create and configure organizations (churches), create ministries and groups, assign ministry leads, and perform oversight. The system supports multiple organizations with clear org → ministry → group hierarchy.

### Story 2.1: Data model and migrations for org, ministry, group

As a developer,
I want the database to support organizations, ministries, and groups with proper hierarchy,
So that the app can store and query org structure.

**Acceptance Criteria:**

**Given** Epic 1 is complete (Supabase and contracts exist),
**When** I add Supabase migrations for `organizations`, `ministries`, `groups` (and any membership/role tables needed for hierarchy and leads),
**Then** tables use snake_case, FKs enforce org → ministry → group; RLS placeholders or policies scope access by role/context,
**And** FR4 is supported; migrations are versioned and applied via CLI or CI.

### Story 2.2: Data contract and adapter for org structure

As an admin,
I want the app to load and save organization structure through one API,
So that I can manage orgs, ministries, and groups without touching the database directly.

**Acceptance Criteria:**

**Given** Story 2.1 is complete,
**When** I add to the data contract and Supabase adapter: operations for organizations (e.g. getOrganizations, createOrganization, updateOrganization), ministries (getMinistriesForOrg, createMinistry, etc.), groups (getGroupsForMinistry, createGroup, etc.),
**Then** the app uses only the facade to read/write org structure; DTOs are camelCase; adapter maps to/from backend,
**And** FR1, FR2, FR3, and FR31 are addressable by the contract.

### Story 2.3: Admin: set up and edit organization structure

As an admin,
I want to create and edit the organization structure (org, ministries, groups),
So that my church has a clear hierarchy for ministries and groups.

**Acceptance Criteria:**

**Given** Stories 2.2 and Epic 1 (auth) are complete and the user has admin role,
**When** I add admin screens to create/edit organizations (name, basic settings), add ministries to an org, and add groups to a ministry, with entry from the Groups tab (when user is admin),
**Then** an admin can set up and edit the full org → ministry → group structure; changes are persisted via the data contract,
**And** FR31 is satisfied; UX follows architecture (e.g. OrgStructureRow pattern where specified); admin reaches these screens from the Groups tab, not Profile.

### Story 2.4: Invite and assign ministry leads

As an admin,
I want to invite users and assign them as ministry leads for specific ministries,
So that those users can lead and manage their ministries.

**Acceptance Criteria:**

**Given** Story 2.3 is complete,
**When** I add flows to invite users (e.g. by email or link) and assign them as ministry leads for specific ministries,
**Then** invited users receive access and have ministry-lead role for the assigned ministry(ies),
**And** FR5 and FR32 are satisfied.

### Story 2.5: Admin oversight view

As an admin,
I want to view the organization structure and access what I need for support,
So that I can oversee operations without managing day-to-day content.

**Acceptance Criteria:**

**Given** Story 2.4 is complete,
**When** I add an admin oversight view (e.g. structure view, access for support),
**Then** the admin can see the org structure and perform oversight actions as defined by the product,
**And** FR33 is satisfied; admin is not required to manage every message or event.

---

## Epic 3: Discovery and onboarding

Users can discover and join an organization, browse ministries and groups, join or leave groups/ministries, and remain in the org where allowed. Guests can explore with controlled visibility and notification settings.

### Story 3.1: Discover and join organization

As a user,
I want to discover and join an organization (e.g. via link or app store, then org selection),
So that I can be part of a church or ministry on the app.

**Acceptance Criteria:**

**Given** Epic 1 and Epic 2 are complete,
**When** I add discovery and join flow (e.g. org selection, join org),
**Then** a user can find an organization and join it; membership is recorded via the data contract,
**And** FR11 is satisfied.

### Story 3.2: Browse and join ministries and groups

As a user,
I want to browse ministries and groups within an organization and join the ones I choose,
So that I can participate in the right communities.

**Acceptance Criteria:**

**Given** Story 3.1 is complete,
**When** I add browse and join flows for ministries and groups (e.g. list, join action),
**Then** the user can see ministries and groups and join them; membership is persisted,
**And** FR12 is satisfied; UX uses patterns such as GroupRow, MinistryNav where specified.

### Story 3.3: Leave group or ministry

As a user,
I want to leave a group or ministry and remain in the organization where allowed,
So that I can adjust my involvement without losing org membership.

**Acceptance Criteria:**

**Given** Story 3.2 is complete,
**When** I add the ability to leave a group or ministry (with confirmation where appropriate),
**Then** the user leaves the group/ministry and remains in the organization where product rules allow,
**And** FR13 is satisfied.

### Story 3.4: Guest mode and exploration

As a guest,
I want to explore ministries and groups with controlled visibility and notification settings,
So that I can explore without full commitment and control what I see and receive.

**Acceptance Criteria:**

**Given** Story 3.1 (and optionally 3.2) is complete,
**When** I add guest (explorer) mode with limited visibility and notification controls and the ability to browse and join with those controls,
**Then** a guest can explore and join with clear boundaries; visibility and notification settings are respected,
**And** FR8 and FR14 are satisfied.

---

## Epic 4: Home, events, and announcements

Users see a home/feed with upcoming events, announcements, and message preview (and optional daily moment). They can view announcements and events for joined orgs/ministries/groups, view event details, and RSVP. Leaders can create and publish announcements and events to a chosen audience.

### Story 4.1: Home feed layout and event/announcement list

As a user,
I want to see a home screen with upcoming events and announcements for my joined orgs/ministries/groups,
So that I know what’s next and what’s new.

**Acceptance Criteria:**

**Given** Epic 1–3 are complete and events/announcements data is available via the contract,
**When** I add the Home tab with layout showing upcoming events and announcements (and optional daily moment placeholder),
**Then** the user sees a scannable feed; content loads within 3 seconds under normal conditions (NFR-P1); empty state has short copy and one action,
**And** FR22 and FR23 are satisfied; pull-to-refresh where specified.

### Story 4.2: Event detail and RSVP

As a user,
I want to open an event, see its details, and indicate interest or RSVP,
So that I can participate in events.

**Acceptance Criteria:**

**Given** Story 4.1 is complete,
**When** I add event detail screen (e.g. `app/event/[id].tsx`) with RSVP or “Add reminder” action,
**Then** the user can view event details and RSVP (or equivalent); success feedback is shown,
**And** FR26 is satisfied.

### Story 4.3: Leaders create and publish announcements

As a ministry lead,
I want to create and publish announcements to a chosen audience (org, ministry, or group),
So that the right people get the message.

**Acceptance Criteria:**

**Given** Epic 3 and Story 4.1 are complete and the user has ministry-lead role,
**When** I add compose flow for announcements with audience selector (ministry or group) and publish,
**Then** the leader composes, selects audience (required before publish), and publishes; announcement is stored and shown to the chosen audience,
**And** FR24 is satisfied; UX uses ComposeCard and AudienceSelector patterns; draft/validation per UX spec.

### Story 4.4: Leaders create and publish events

As a ministry lead,
I want to create and publish events (e.g. services, meetings) and target them to a chosen audience,
So that the right people see and can attend.

**Acceptance Criteria:**

**Given** Story 4.3 is complete,
**When** I add create-event flow (date/time/place, audience selection) and publish,
**Then** the leader can create events and target them to org, ministry, or group; events appear in Home and event list for that audience,
**And** FR25 is satisfied.

### Story 4.5: Message preview on Home

As a user,
I want to see a preview of recent or relevant messages on Home,
So that I can see activity and tap through to conversations.

**Acceptance Criteria:**

**Given** Epic 5 (messaging) is in progress or complete and Home exists,
**When** I add a message preview section or block on Home that shows recent/relevant messages,
**Then** the user sees message previews and can navigate to the conversation,
**And** FR22 (message preview on home) is satisfied.

### Story 4.6: Daily moment (optional)

As a user,
I want an optional daily moment (e.g. verse or devotional) on Home,
So that I have a simple, optional spiritual touchpoint.

**Acceptance Criteria:**

**Given** Story 4.1 is complete,
**When** I add an optional daily moment component (e.g. DailyMomentCard) to Home with collapse/expand if specified,
**Then** the user can see the daily moment when available; it is optional and not blocking,
**And** FR22 optional daily moment is satisfied; design follows Warm & Soft and UX spec.

---

## Epic 5: Messaging and discussions

Members can send and receive 1:1 messages, participate in group/forum and small-group discussions, and see recent/relevant message previews.

### Story 5.1: 1:1 messaging

As a member,
I want to send and receive direct (1:1) messages with other members in my organization or permitted context,
So that I can connect with others privately.

**Acceptance Criteria:**

**Given** Epic 1–3 are complete,
**When** I add data contract and adapter support for 1:1 messages (and Realtime subscription for new messages), plus message list and thread UI that use only the facade,
**Then** a member can send and receive 1:1 messages; new messages appear in near-real-time (NFR-P3),
**And** FR18 is satisfied; channel naming follows contract (e.g. kebab-case with scope).

### Story 5.2: Group and forum discussions

As a member,
I want to participate in group or forum-style discussions within a group I have joined,
So that I can be part of group conversations.

**Acceptance Criteria:**

**Given** Story 5.1 is complete,
**When** I add support for group/forum channels (and small-group discussions as configured), with Realtime subscription and thread UI,
**Then** a member can participate in group discussions; messages are delivered in near-real-time,
**And** FR19 and FR20 are satisfied.

### Story 5.3: Message preview (list and Home)

As a user,
I want to see recent or relevant message previews in the Messages tab and on Home,
So that I can see activity and open conversations quickly.

**Acceptance Criteria:**

**Given** Story 5.2 is complete,
**When** I add message list (Messages tab) and message preview on Home (if not already in 4.5),
**Then** the user sees recent/relevant message previews and can navigate to the thread,
**And** FR21 is satisfied; MessagePreviewRow or equivalent pattern per UX.

---

## Epic 6: Push notifications

The system sends push notifications on iOS and Android for events, announcements, and messaging. Leaders can target push by ministry or group. User notification preferences from Epic 1 are respected.

### Story 6.1: Push registration and token storage

As a user,
I want the app to register for push notifications and store my device token securely,
So that I can receive timely notifications on iOS and Android.

**Acceptance Criteria:**

**Given** Epic 1 is complete,
**When** I implement Expo Notifications registration and store the device token via the data contract (adapter persists to backend),
**Then** the app has a valid push token on iOS and Android; token is stored and available for the backend to use,
**And** FR15 (system can send push) is partially satisfied; no delivery trigger yet.

### Story 6.2: Backend trigger and delivery

As a user,
I want to receive push notifications when events, announcements, or messages are triggered,
So that I get reminders and updates in a timely way.

**Acceptance Criteria:**

**Given** Story 6.1 is complete and backend can trigger push (e.g. Supabase Edge Function or webhook),
**When** an event reminder, new announcement, or new message triggers a push,
**Then** the notification is delivered to the user’s device; user notification preferences (Epic 1) are respected,
**And** FR15 is satisfied; delivery within 1 minute under normal conditions (NFR-P2) where feasible.

### Story 6.3: Leader targeting by ministry or group

As a ministry lead,
I want to send push (or in-app notifications) to members of a specific ministry or group,
So that the right people get the notification.

**Acceptance Criteria:**

**Given** Story 6.2 is complete,
**When** a leader sends a targeted notification (e.g. for an announcement or event) and selects ministry or group,
**Then** only members of the selected ministry or group receive the notification (subject to their preferences),
**And** FR16 is satisfied.

---

## Epic 7: Leader tools

Ministry leads can create and manage groups within their ministry, post announcements and events and choose audience (ministry or groups), see basic engagement (who is active or participating), and collaborate with other leaders in the same organization.

### Story 7.1: Create and manage groups (ministry lead)

As a ministry lead,
I want to create and configure groups within my ministry,
So that members can join and participate in those groups.

**Acceptance Criteria:**

**Given** Epic 2–3 are complete and the user is a ministry lead,
**When** I add flows for a ministry lead to create and configure groups within their ministry (name, settings as needed),
**Then** the lead can create and manage groups; groups appear in browse/join and in leader views,
**And** FR27 is satisfied; FR3 is reinforced.

### Story 7.2: Post announcements and events and choose audience

As a ministry lead,
I want to post announcements and events and choose the audience (ministry or specific groups),
So that only the right people see the content.

**Acceptance Criteria:**

**Given** Stories 4.3, 4.4, and 7.1 are complete,
**When** the lead composes an announcement or event and selects audience (ministry or specific groups),
**Then** the content is published to the chosen audience; audience selector is required before publish,
**And** FR28 is satisfied; UX uses AudienceSelector and ComposeCard patterns.

### Story 7.3: Engagement visibility

As a ministry lead,
I want to see basic visibility into who is active or participating in my ministry or groups,
So that I can follow up and nurture engagement.

**Acceptance Criteria:**

**Given** Story 7.2 is complete and engagement data (e.g. views, RSVPs, recent activity) is available via the contract,
**When** I add a leader view of engagement for their ministry or groups,
**Then** the lead can see who is active or participating (as defined by the product),
**And** FR29 is satisfied.

### Story 7.4: Collaborate with other leaders

As a ministry lead,
I want to collaborate or coordinate with other leaders in the same organization,
So that we can share context and support each other.

**Acceptance Criteria:**

**Given** Story 7.3 is complete,
**When** I add shared context or visibility for leaders in the same org (e.g. shared view, coordination entry point as defined by product),
**Then** ministry leads can collaborate or coordinate with other leaders in the same organization,
**And** FR30 is satisfied.
