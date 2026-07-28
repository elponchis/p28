# Sprint Change Proposal — MVP Simplification

**Date:** 2026-03-05  
**Project:** p28-v2  
**Change Scope:** Major — Fundamental replan required

---

## 1. Issue Summary

### Problem Statement

The current MVP assumes a three-level hierarchy (Organization → Ministry → Group) with admin flows for org setup, ministry lead assignment, and oversight. This adds complexity that delays core value: users discovering and participating in communities.

### Trigger

Product decision to simplify the MVP to focus on:
- Two group types (Forums and Ministries) as top-level concepts
- Self-service join/leave and discussions
- Minimal admin model (Super Admin + Admin roles)
- Removal of org/ministry hierarchy and ministry lead flows

### Evidence

- Story 2-4 (invite and assign ministry leads) is in review
- Admin routes (`app/admin/`) implement org → ministry → group structure
- Data model: `organizations`, `ministries`, `groups`, `org_members`, `ministry_leads`

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact |
|------|--------|
| Epic 2 (Org structure and leadership) | **Major** — Remove org/ministry hierarchy; replace with Super Admin + Admin roles and flat groups |
| Epic 3 (Discovery and onboarding) | **Moderate** — Simplify to browse/search groups (Forums + Ministries) in Groups tab |
| Epic 4 (Home, events, announcements) | **Moderate** — Announcements/events scoped to group; group admins (creator) can post |
| Epic 5 (Messaging and discussions) | **Moderate** — Discussions within groups; same patterns |
| Epic 6 (Push notifications) | **Low** — Target by group membership |
| Epic 7 (Leader tools) | **Major** — Replaced by group admin (creator) capabilities |

### Story Impact

- **Remove:** 2-1 (data model), 2-2 (data contract), 2-3 (admin org structure), 2-4 (ministry leads), 2-5 (admin oversight)
- **Replace with:** New stories for simplified groups, Super Admin/Admin roles, group creation, group membership, discussions
- **Modify:** 3-1, 3-2, 3-3 (discovery/join/leave) — now group-centric
- **Modify:** 4-x, 5-x, 7-x — scope to groups instead of org/ministry/group

### Artifact Conflicts

- **PRD:** FR1–5, FR27–33 need rewrite for new model
- **Architecture:** Data model section; RLS and role patterns
- **UX:** Admin flows removed; Groups tab redesigned; group detail (banner, description, language, location)

### Technical Impact

- **Database:** New schema; drop `organizations`, `ministries`, `org_members`, `ministry_leads`; replace `groups` with new `groups` table (type, banner, description, preferred_language, country, created_by)
- **New tables:** `app_roles` (super_admin, admin), `group_members`, `group_admins`
- **API contracts:** Replace org/ministry/group operations with group-centric operations
- **App routes:** Remove `app/admin/[orgId]/...`; add group creation, group detail, browse/search

---

## 3. Recommended Approach

**Selected approach:** Direct Adjustment with schema replacement

**Rationale:**
- No production data; greenfield migration
- Clean break: new migration drops old tables, creates new schema
- Effort: Medium–High (migrations, contracts, adapter, UI)
- Risk: Low (no data migration)
- Timeline: 1–2 sprints for full implementation

---

## 4. Detailed Change Proposals

### 4.1 New Data Model

**Groups (replaces org/ministry/group hierarchy):**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| type | text | 'forum' \| 'ministry' |
| name | text | Group name |
| description | text | Optional |
| banner_image_url | text | Optional; Supabase Storage |
| preferred_language | text | Group communication language (en, km, ko, etc.) |
| country | text | Static country code or 'Online' |
| created_by_user_id | uuid | Creator (Super Admin or Admin) |
| created_at, updated_at | timestamptz | |

**App roles:**
- `app_roles` table: `user_id`, `role` ('super_admin' \| 'admin'), `assigned_by_user_id` (for admin), `assigned_at`
- Seed: billyhdev@gmail.com as super_admin

**Group membership:**
- `group_members`: `user_id`, `group_id`, `joined_at`
- Users join/leave groups; members receive announcements/events

**Group admins:**
- `group_admins`: `user_id`, `group_id`, `assigned_at`
- Creator is auto-assigned; Super Admin can assign additional admins
- Admins can create announcements/events for their group

### 4.2 Contract Changes

**Remove:** `Organization`, `Ministry`, `MinistryLead`, `CreateOrganizationInput`, `UpdateOrganizationInput`, `CreateMinistryInput`, `UpdateMinistryInput`, `CreateGroupInput`, `UpdateGroupInput` (old shape)

**Add:** `Group` (new shape with type, description, bannerImageUrl, preferredLanguage, country, createdByUserId), `CreateGroupInput`, `UpdateGroupInput`, `GroupMember`, `GroupAdmin`

**Data contract operations:**
- Remove: `getOrganizations`, `createOrganization`, `updateOrganization`, `getMinistriesForOrg`, `createMinistry`, `updateMinistry`, `getGroupsForMinistry`, `createGroup`, `updateGroup`, `getOrganizationsWhereUserIsAdmin`, `getMinistryLeads`, `assignMinistryLead`, `removeMinistryLead`, `getUserIdByEmail`
- Add: `getGroups`, `getGroup`, `createGroup`, `updateGroup`, `getGroupMembers`, `joinGroup`, `leaveGroup`, `getGroupsWhereUserIsAdmin`, `isSuperAdmin`, `assignAdmin`, `revokeAdmin`, `getGroupAdmins`

### 4.3 UI Changes

- **Remove:** `app/admin/` (entire directory)
- **Groups tab:** Browse/search all groups (Forums + Ministries); filter by type; search by name
- **Group detail:** Banner, description, language, location; Join/Leave; announcements, events, discussions
- **Group creation:** Super Admin + Admin only; form with name, type, description, banner, language, country
- **Country list:** Static list (ISO 3166-1 alpha-2 or similar)

---

## 5. Implementation Handoff

**Scope classification:** Major — Fundamental replan

**Handoff to:** Development team (with PM/Architect sign-off on this proposal)

**Deliverables:**
1. Supabase migration `00011_simplified_groups_schema.sql`
2. Updated contracts and DTOs
3. Updated Supabase data adapter
4. Removed admin routes; new Groups tab and group detail
5. Updated sprint-status.yaml and epic/story artifacts

**Success criteria:**
- New schema applied; old tables dropped
- Groups tab shows Forums and Ministries; users can browse, search, join, leave
- Super Admin (billyhdev@gmail.com) and Admins can create groups
- Group admins can create announcements and events (future stories)
- Discussions within groups (future stories)

---

## 6. Appendix: User Clarifications

1. **Forums vs Ministries:** Forums = Reddit-style discussions (questions/topics). Ministries = organized groups with recurring services; admins push announcements/events; future video integration.
2. **Roles:** Super Admin (billyhdev@gmail.com) can assign Admins. Admins can create Forums and Ministries and manage groups they created. Only Super Admin can revoke Admin.
3. **Groups:** Top-level; type = forum \| ministry; both appear in Groups tab.
4. **Announcements/Events:** Super Admin and group creator (Admin) can post.
5. **Discovery:** Groups tab — search and browse all groups.
6. **Data:** No migration of existing data; greenfield.
7. **Location:** Static country list. Group preferred language = communication language (separate from app UI language from user profile).
