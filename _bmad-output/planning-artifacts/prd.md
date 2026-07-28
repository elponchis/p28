---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-p28-v2-2026-02-11.md
  - _bmad-output/brainstorming/brainstorming-session-2026-02-11-pm.md
briefCount: 1
researchCount: 0
brainstormingCount: 1
projectDocsCount: 0
workflowType: 'prd'
classification:
  projectType: mobile app (mobile-first with web potential)
  domain: faith communities / ministry
  complexity: medium
  projectContext: greenfield
---

> **As-built (2026-03-24):** The codebase reflects forums/ministries and group-scoped features (not a multi-level org/ministry admin tree). **Not in scope:** Home message preview strip, dedicated message-preview list story. For current behavior see `docs/as-built-snapshot.md` and `_bmad-output/planning-artifacts/as-built-delta-2026-03-24.md`.

# Product Requirements Document - p28-v2

**Author:** Billy  
**Date:** 2026-02-11

## Executive Summary

p28-v2 is an online-first, connection-first app that serves as the primary digital home for church life: one place for members, ministry leads, and admins to connect, receive events and announcements, and participate in groups and messaging. Target users are members (e.g. one app for church life), ministry leads (e.g. manage ministries and reach the right people), admins (org structure and operations), and seekers/guests (low-barrier exploration). Success means the church network uses it as the main app for church life and administration—not a side channel.

## Success Criteria

### User Success

- **One place for church life:** Members and leaders use p28-v2 as their primary app for church—no juggling Bible app, Zoom, and Discord. Success = "I don't need other apps for church."
- **Engagement and participation:** Users stay in the loop, join conversations, and are encouraged to participate. Measured by time in app per week, check-ins (events/services/groups), and engagement with content (announcements, events, messages).
- **"Can't live without it":** Success looks like users and leaders saying they can't live without the tool. Measured by: **NPS**, **retention** (e.g. % still active after 30/90 days), and **in-app signals** (messages sent/received, group participation, event attendance, qualitative feedback).
- **Member connection:** Meaningful connection within ministries—groups, circles, discovery/matching. Measured by active group participation, 1:1/small-circle usage, and discovery/match completion where applicable.
- **Relevant communication:** Events and announcements reach the right people; users get fewer irrelevant notifications. Measured by open/click rates by audience, event RSVP conversion, and user feedback on relevance.

### Business Success

- **3 months:** Product is showcase-ready; members and leaders are genuinely excited to use it; early proof that one app can replace multiple tools for church life.
- **12 months:** Support ministries from across the world and connect them to each other; product on the path to being an essential tool for church members.
- **Optimization focus:** Engagement and church/ministry adoption (not just downloads).
- **"This is working" signal:** Leaders and members say they can't live without it, backed by feedback and retention.

### Technical Success

- **Solid MVP that gets users excited:** Reliability and quality sufficient for the app to feel dependable and enjoyable—no major bugs or outages that undermine trust or excitement. Performance and stability support the core value (connection, events, messaging) so users want to open the app regularly.

### Measurable Outcomes

- **Engagement:** Time in app per week (avg or median); check-ins per user per week/month; content engagement (views, RSVPs, replies).
- **Adoption:** Churches/ministries onboarded; active members; retention (e.g. % active after 30/90 days).
- **Leading indicators:** Messages sent/received, group/conversation participation, event attendance (in-app or linked), qualitative feedback ("can't live without it," "don't use other apps for church anymore").

## Product Scope

### MVP – Minimum Viable Product

- **Connection and ministry first:** Multiple churches/ministries/organizations onboarded; users join and stay connected to the groups they join; users connect with each other (messaging within groups); leaders broadcast events and announcements and reach the right people.
- **Success criterion:** Our church network uses the app as the **main app for church life and administration** (primary channel, not a side tool).
- **Ship order:** Connection and ministry first; then add features that leaders and administrators value.

### Growth Features (Post-MVP)

- Admin dashboard and status view of groups/ministry.
- Multi-lingual communication (e.g. Korean and English).
- Advanced roles and permissions; minister-specific features (e.g. share verses, messages, encouragement to specific groups; tools to foster members).

### Vision (Future)

- **2–3 years:** Essential tool for church life with a full admin/leader toolkit to foster and administer within groups, plus multi-language, minister features, and advanced roles. Scale decision: when current features are not enough (user/leader demand and usage drive the roadmap).

## User Journeys

### 1. Member (Billy) – Success Path

**Opening scene**  
Billy lives in Surrey, BC and is part of a church and several ministries with members in different countries. He's juggling the Bible app for devotionals, Zoom for services, and Discord to stay connected—and there's no single place that feels like "church life." He misses things, checks three apps, and still feels slightly out of the loop.

**Rising action**  
He finds p28-v2 because his church has adopted it (or he discovers it in the app store). He onboard as a guest: picks his church/org and ministries, sets which notifications he wants, and explores other groups that "speak" to him. He lands on a clear home: what's next (service/event), a daily moment (verse/devotional), announcements, and a preview of recent messages. He joins a ministry group and starts reading and replying. He gets a timely reminder for the next service and taps through to the event.

**Climax**  
One evening he realizes he hasn't opened Zoom or Discord for church in days. Everything he needs—events, announcements, and conversations—lives in one app. He's in the loop and connected without the old juggle.

**Resolution**  
The app becomes part of his daily routine alongside his other social apps. He feels: "Without this app I would never have learned about Christianity and would have never been this involved in my faith life."

---

### 2. Member – Edge Case: Seeker / Guest

**Opening scene**  
Someone is curious about faith or a specific church. They're not ready to "join" fully and don't want to be overwhelmed with notifications or visibility.

**Rising action**  
They discover the app (church link or app store), open it, and join as a guest. They choose what they see and which notifications they get. They browse ministries and groups, find one that resonates, and join that group. They can read announcements and see upcoming events without committing to everything. If something feels off, they adjust preferences or leave a group.

**Climax**  
They attend an event or join a conversation because they chose it—no spam, no pressure. The low barrier and control make it feel safe to explore.

**Resolution**  
They stay as a guest with clear boundaries, or gradually deepen involvement. The product supports both without forcing a single path.

---

### 3. Ministry Lead (Annie)

**Opening scene**  
Annie leads young adult and youth at All Nations Church (Surrey, BC). She uses Discord, Zoom, and the Bible app to cultivate church life and collaborate with other leaders. Coordination is messy; she's not sure who's engaged and who's drifting.

**Rising action**  
Her church adopts p28-v2. She (or an admin) sets up her ministries and groups in the hierarchy. She posts announcements and creates events, targeting the right ministry or group so only relevant people get them. She sees who's engaging—messages, event interest—and uses that to follow up. She has one place to communicate and coordinate with other leaders instead of scattered channels.

**Climax**  
She sends a targeted event reminder to the young adult group; RSVPs and messages pick up. She thinks: "I can't live without this as a church leader." Reach and visibility are in one place.

**Resolution**  
She runs discussion and care through the app, spends less time herding people across tools, and feels more confident about who's engaged and who needs a nudge.

---

### 4. Admin

**Opening scene**  
A church leader is responsible for day-to-day operations and planning. The church needs a clear structure (org → ministries → groups), the right people in the right places, and a way to keep things running without chaos.

**Rising action**  
They onboard the church/org in p28-v2 and define the hierarchy: org, then ministries (e.g. Young Adult, Youth), then optional groups per ministry. They add or invite ministry leads and give them the right scope. They don't need to run every message or event—ministry leads do that—but they can see that the structure is in place and that key leaders are using the app. If needed, they adjust structure (e.g. add a ministry or group) or help a leader with access.

**Climax**  
The church runs its main communication and event flow through the app. The admin sees that the org is structured, leaders are active, and the app is the primary channel for church life and administration.

**Resolution**  
Day-to-day operations and planning are easier: one system, clear hierarchy, and leaders who can own their ministries. The admin can focus on direction and support instead of being the bottleneck for every message and event.

---

### Journey Requirements Summary

| Journey | Capabilities revealed |
|--------|------------------------|
| **Member (Billy)** | Discovery & onboarding (join org/ministry/group, set notification preferences); Home experience (upcoming event, daily moment, announcements, message preview); Notifications (service/event reminders); Messaging (ministry groups, stay connected); Navigation (Ministries, Messages, Home). |
| **Seeker / guest** | Guest mode and low barrier; Control over visibility and notifications; Browse and join ministries/groups; Optional, gradual deepening; Privacy and opt-in. |
| **Ministry lead (Annie)** | Ministry/group setup (within org hierarchy); Targeted broadcasts (announcements and events by ministry/group); Visibility into engagement (who's active, who's drifting); Collaboration with other leaders; One place for discussion and care. |
| **Admin** | Org/ministry/group hierarchy (Org → Ministry → Group); Onboarding org and configuring structure; Inviting/assigning ministry leads; Optional oversight without running every message/event; Flexibility to add/change ministries and groups. |

## Domain-Specific Requirements

### Trust & Safety
- The product should support safe, respectful spaces for prayer, sharing, and pastoral care. Design and policies should reduce risk of abuse, spam, or misuse of spiritual/relational authority (e.g. clear roles, reporting, and escalation paths as we scale).

### Privacy
- Personal and spiritual data are sensitive. The product must make it clear who can see what (e.g. members vs leaders vs org), and align with user expectations and consent (e.g. visibility of profile, activity, and messages).

### Content & Conduct
- Expectations for conduct in groups and DMs should be clear (e.g. in-app guidelines or code of conduct). MVP can rely on org/ministry norms; growth may add in-app reporting or moderation tools.

### Youth / Minors
- If youth ministries use the app, consider age handling, parental consent where appropriate, and safeguards for minors (e.g. visibility, messaging, and who can contact them).

### Data Handling
- Define where data lives, how long it's retained, and who can access or export it (members, leaders, org admins), so the product meets trust and privacy expectations.

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Online-first, connection-first as primary:** Treating the app as the main place for church life and ministry rather than a side channel to in-person. Most tools are hybrid and in-person-first; p28-v2 bets that a single, engaging, connection-first experience can become "the modern Christian's essential tool."
- **Single coherent platform:** One product for members, ministers, and churches (belonging, communication, ministry) instead of stitching together Bible app, Zoom, Discord, etc. The innovation is integration and coherence, not a new category.
- **Note:** AI is used to speed up development only; there are no user-facing "AI features" in scope.

### Market Context & Competitive Landscape

- Incumbents are mostly **hybrid and physical-first** (streaming + basic digital touchpoints). Few are built for **online as the primary experience** or for sustained connection at a distance.
- The bet: churches and members will adopt one **primary** digital home if the experience is clear, engaging, and ministry-aware. The main uncertainty is whether that shift will happen at the scale and speed you need.

### Validation Approach

- **Core bet to validate:** "Rethinking church connection"—will churches and members actually use one app as their **main** channel for church life (not just a supplement)?
- **How to validate:** Use your own church network as first proof: adoption, retention, and "can't live without it" feedback. Track whether the app becomes the primary channel (e.g. share of communication/events in-app vs elsewhere). Early pilots with a few ministries/churches to test willingness to shift behavior.
- **Leading indicator:** Leaders and members saying they've stopped using other apps for church, plus usage/engagement metrics that support that.

### Risk Mitigation

- **If "church connection" doesn't shift as hoped:** Position as the **best hybrid tool** (clear events, targeted broadcasts, groups) while continuing to improve the connection experience. Use feedback to iterate (e.g. more in-person cues, different onboarding) rather than abandoning the bet.
- **If single-platform adoption is slow:** Focus on one ministry or one church as the lighthouse; prove value there before scaling the "one app for everything" story.
- **Scope:** MVP stays connection- and ministry-first; avoid scope creep so you can learn from real usage before adding more differentiators.

## Mobile App Specific Requirements

### Project-Type Overview

p28-v2 is a **mobile-first** app built on a **single codebase** with **React Native**, using **Expo** to build and ship to both **iOS** and **Android**. Web is a possible future surface; MVP is mobile only. The stack keeps one codebase for both app stores and simplifies deployment.

### Technical Architecture Considerations

- **Platform support:** iOS and Android via Expo/React Native. Same codebase; Expo handles native builds and submission to the App Store and Google Play.
- **Deployment:** Use Expo's tooling to build and push builds to both marketplaces (EAS Build / Submit or equivalent).
- **Web:** Out of scope for MVP; architecture should not block adding a web client later (e.g. React Native for Web or separate web app) if desired.

### Platform Requirements

- **Target platforms:** iOS and Android.
- **Tooling:** React Native + Expo (EAS for build/deploy).
- **Store distribution:** Both App Store and Google Play; no other stores required for MVP.

### Device Permissions

- **MVP:** No use of camera, microphone, location, or other device capabilities. No extra permission prompts beyond what's required for push (e.g. notification permission).
- **Future:** Device features can be scoped in a later phase.

### Offline Mode

- **MVP:** Not required. The app assumes an **internet connection** for all features (feed, events, messaging, notifications). Offline support can be considered post-MVP if needed.

### Push Strategy

- **Push notifications:** Required for **iOS** and **Android**.
- **Use cases:** Service/event reminders, announcements, and messaging (e.g. new message or @mention) as implied by success criteria and journeys.
- **Implementation:** Use Expo's push notification APIs (and/or a provider like FCM/APNs behind them) so one implementation works on both platforms. Respect user notification preferences (e.g. in-app settings) where implemented.

### Store Compliance

- **MVP:** No special compliance requirements beyond standard **App Store** and **Google Play** policies (e.g. privacy, data use, content). No extra church/org policies specified. Revisit if you later add payments, age gates, or sensitive data.

### Implementation Considerations

- **Single codebase:** All feature work happens in the React Native/Expo app; shared logic for API calls, state, and navigation.
- **Expo:** Use managed workflow or prebuild as appropriate; plan for push (Expo Notifications), OTA updates if desired, and EAS for builds and store submission.
- **Native modules:** MVP does not require custom native modules beyond what Expo provides (push, etc.). If you add device features later, assess Expo modules or custom native code.
- **Testing:** Test on both iOS and Android (simulators and real devices) for layout, push, and store readiness.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP—the minimum that delivers "one place" for church life: multiple ministries and groups, push notifications, profiles, chat/discussions, and leader management. Success = church network uses it as the main channel and finds it useful.

**MVP Must-Haves (from stakeholder input):**
- Support **multiple ministries and groups** (org → ministry → group hierarchy).
- **Push notifications** to members (events, announcements, messaging as needed).
- **Profiles:** Upload profile picture and other personal information.
- **Chat & discussion:** Chat with other members; participate in forums, group discussions, and small groups.
- **Leader tools:** Leaders can **manage ministries** (create/configure groups, post announcements/events, target notifications).
- **Multiple languages:** Support English, Korean, and Khmer in the MVP. App UI and content available in these languages; users can use the app in their preferred language.

**Riskiest assumption to validate:** **Targeted notifications will get opened.** MVP should support targeting (e.g. by ministry/group) and measure open/engagement so we can learn quickly.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** Member (Billy), Seeker/guest, Ministry lead (Annie), Admin.

**Must-Have Capabilities:**
- Org/ministry/group hierarchy and onboarding (multiple orgs/ministries/groups).
- User profiles (photo, personal info); guest/explorer mode with control over visibility and notifications.
- Push notifications (iOS + Android) with targeting by ministry/group; user preferences.
- Messaging: member-to-member chat and group/forum/small-group discussions.
- Leader management: create and manage ministries and groups; post announcements and events; send targeted broadcasts; basic visibility into engagement (who's active).
- Admin: set up org structure, invite/assign ministry leads, optional oversight.
- **Multi-language support (MVP):** English, Korean, Khmer for app UI and content; user can choose preferred language.

**Out of Scope for MVP:** **Cross-language communication** (e.g. translate messages on the fly). Admin dashboard/analytics, advanced roles/minister-specific features, payments, device features (camera, location), offline mode.

### Post-MVP Features

**Phase 2 (Growth):**
- Admin dashboard and status view of groups/ministry.
- Cross-language communication (e.g. in-app translation of messages).
- Advanced roles and permissions; minister-specific features (e.g. share verses, messages, encouragement to specific groups; tools to foster members).

**Phase 3 (Expansion):**
- Full admin/leader toolkit; essential-tool positioning; scale when current features are not enough (demand and usage drive roadmap).

### Risk Mitigation Strategy

**Market risk — "Targeted notifications will get opened":** Design targeting and preferences in MVP; instrument open rates and engagement by audience. Use early adopters and one church/ministry as lighthouse to validate. If opens are low, iterate on content, timing, and segmentation before scaling.

**Technical risks:** Single codebase (React Native + Expo), online-only, push on both platforms—already scoped. Biggest technical stretch is real-time messaging and reliable push; mitigate with proven stacks and phased rollout (e.g. one ministry first).

**Resource risks:** MVP is medium scope (hierarchy, profiles, push, chat, leader tools, multi-language). Absolute minimum: small full-stack team (mobile + backend + push). If resources are tight, trim to one org, 2–3 ministries, and core flows (profiles, one group per ministry, announcements + push, basic chat) and add forums/broader groups in Phase 2.

## Functional Requirements

*This section is the capability contract: UX designs for these, architecture supports these, and implementation delivers these. Any capability not listed here is out of scope unless explicitly added later.*

### Organization & Hierarchy

- FR1: Admin can create and configure an organization (church) with a name and basic settings.
- FR2: Admin can create ministries within an organization and assign ministry leads.
- FR3: Ministry leads can create and configure groups within their ministry.
- FR4: The system supports multiple organizations, each with multiple ministries and groups.
- FR5: Admin can invite or assign users as ministry leads for specific ministries.

### User Identity & Profiles

- FR6: A user can create an account and sign in.
- FR7: A user can set and update a profile picture and personal information visible to others in their org/ministry/group context.
- FR8: A user can join as a guest (explorer) with limited visibility and control over what they see and receive.
- FR9: A user can control which notifications they receive (e.g. by type, ministry, or group).
- FR10: A user can choose their preferred app language (English, Korean, or Khmer) for UI and content.

### Discovery & Onboarding

- FR11: A user can discover and join an organization (e.g. via link or app store and then org selection).
- FR12: A user can browse ministries and groups within an organization and join those they choose.
- FR13: A user can leave a group or ministry and remain in the organization where allowed.
- FR14: A guest can explore ministries and groups with controlled visibility and notification settings.

### Notifications & Push

- FR15: The system can send push notifications to users on iOS and Android for events, announcements, and messaging as configured.
- FR16: Leaders can target push notifications (or in-app notifications) to members of a specific ministry or group.
- FR17: A user can manage notification preferences (e.g. which types and from which ministries/groups they receive push).

### Messaging & Discussion

- FR18: A member can send and receive direct (1:1) messages with other members within the same organization or permitted context.
- FR19: A member can participate in group or forum-style discussions within a group they have joined.
- FR20: A member can participate in small-group discussions (e.g. within a ministry or group) as configured.
- FR21: The system surfaces recent or relevant messages (e.g. preview) so users can see activity and navigate to conversations.

### Content & Broadcasts

- FR22: A user can view a home or feed that shows upcoming events, announcements, and a preview of recent messages (and optional daily moment where implemented).
- FR23: A user can view announcements and events for organizations, ministries, and groups they have joined.
- FR24: Leaders can create and publish announcements to a chosen audience (org, ministry, or group).
- FR25: Leaders can create and publish events (e.g. services, meetings) and target them to a chosen audience.
- FR26: A user can view event details and indicate interest or RSVP where the product supports it.

### Leader & Ministry Management

- FR27: A ministry lead can create and manage groups within their ministry.
- FR28: A ministry lead can post announcements and events and choose the audience (ministry or specific groups).
- FR29: A ministry lead can see basic visibility into engagement (e.g. who is active or participating) for their ministry or groups.
- FR30: A ministry lead can collaborate or coordinate with other leaders in the same organization (e.g. shared context or visibility as defined by product).

### Admin & Oversight

- FR31: An admin can set up and edit the organization structure (org, ministries, groups).
- FR32: An admin can invite users and assign them as ministry leads.
- FR33: An admin can perform oversight actions (e.g. view structure, access needed for support) without necessarily managing day-to-day content.

### Trust, Privacy & Conduct

- FR34: A user can understand or control who can see their profile or activity within the bounds of the product (e.g. org/ministry/group visibility).
- FR35: The product supports clear expectations for conduct (e.g. through in-app guidelines or code of conduct where implemented).
- FR36: The system stores and displays content in the user's chosen language (English, Korean, or Khmer) where multi-language content is available.

## Non-Functional Requirements

### Performance

- **NFR-P1:** Core user actions (open feed, open a conversation, view event/announcement) complete and show content within **3 seconds** under normal conditions so the app feels responsive and users open it regularly.
- **NFR-P2:** Push notifications are delivered within **1 minute** of the trigger (e.g. new announcement or message) under normal conditions so reminders and updates feel timely.
- **NFR-P3:** Messaging and group discussions support **real-time or near-real-time** delivery (e.g. new messages visible within seconds) so conversations feel live.

### Security

- **NFR-S1:** User data (profiles, messages, membership) is **encrypted in transit** (e.g. TLS) and **at rest** where stored to protect personal and spiritual content.
- **NFR-S2:** Access to data is **scoped by role and context** (org/ministry/group) so users and leaders only see what they are permitted to see.
- **NFR-S3:** Authentication and session handling follow **current mobile best practices** (e.g. secure tokens, session expiry) so accounts are not easily compromised.

### Reliability

- **NFR-R1:** The app and its backend are **available for normal use** with target **99% uptime** during active hours (or equivalent) so it is dependable as the main app for church life.
- **NFR-R2:** **No unplanned data loss** for user-generated content (messages, profiles, announcements, events); backups and recovery procedures support recovery from failures.

### Accessibility

- **NFR-A1:** The app meets **WCAG 2.1 Level AA** (or equivalent) for core flows (onboarding, feed, messaging, events) so it is usable by people with common accessibility needs.
- **NFR-A2:** Supported languages (English, Korean, Khmer) are **correctly displayed and navigable** with system accessibility features (e.g. screen reader, text scaling).

### Scalability

- **NFR-SC1:** The system supports **multiple organizations** and **hundreds of concurrent users per org** at MVP without degrading performance below NFR-P1/P2/P3.
- **NFR-SC2:** Architecture and operations allow **scaling to more orgs and users** (e.g. 10x) without a full redesign; specific targets can be set as usage grows.
