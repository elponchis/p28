# Sprint Change Proposal — Discussion Navigation and Placement

**Date:** 2026-03-06  
**Project:** p28-v2  
**Change Scope:** Minor — Direct implementation by development team  
**Mode:** Incremental

---

## 1. Issue Summary

### Problem Statement

The groups tab screen currently allows creating discussions and includes a "Discussions" filter that shows a global list of discussions across all groups. Users expect discussions to be created and viewed **within a specific group context**. The current UX is confusing because:

- Creating a discussion from the groups tab requires selecting a group in a modal (or navigating from group detail) — the primary entry point is misplaced.
- The "Discussions" filter on the groups tab shows a cross-group feed, which is irrelevant to the groups tab's purpose (browsing/searching groups).
- The group detail screen only offers a "View Discussions" button that routes back to the groups tab with a filter — discussions should be visible directly on the group detail screen.

### Trigger

User feedback: discussions should be scoped to the group detail screen. Users should only create discussions when viewing a specific group, and they should immediately see all discussions for that group on load.

### Evidence

- `app/(tabs)/groups.tsx`: Has add-discussion header button, discussions filter chip, and `useDiscussionsQuery` for global discussions feed.
- `app/group/[id].tsx`: Has "View Discussions" button that navigates to `/(tabs)/groups?filter=discussions` instead of showing discussions inline.
- `useDiscussionsQuery` supports `groupId` param; `useCreateDiscussionMutation` exists; discussion create screen accepts `groupId` query param.

---

## 2. Impact Analysis

### Epic Impact

- **Epic 2 (Groups)**: Stories 2-5 (discussions within groups) and 2-6 (Reddit-style discussions) — behavior change, no new stories.
- **Epic 5**: No impact; messaging flows unchanged.

### Story Impact

- No new stories required. Direct adjustment to existing implementation.
- Stories 2-5 and 2-6: Refine navigation/placement; acceptance criteria implicitly expect discussions within group context.

### Artifact Conflicts

- PRD, Architecture, Epics: No conflicts; this aligns implementation with intended UX.
- UX: Reinforces "discussions within a group" mental model.

### Technical Impact

- **groups.tsx**: Remove discussion-related UI and filter; simplify header.
- **group/[id].tsx**: Add inline discussions list, add Create Discussion button; remove "View Discussions" navigation.
- **app/group/discussion/create.tsx**: No change; already supports `groupId` param for pre-selecting group.
- **i18n**: `groups.viewDiscussions` / `groups.viewDiscussionsHint` can remain for potential future use or be removed if unused.

---

## 3. Recommended Approach

**Direct Adjustment** — Modify existing screens and flows without rollback or MVP scope change.

- **Effort:** Low  
- **Risk:** Low  
- **Timeline impact:** Minimal  

---

## 4. Detailed Change Proposals

### Change 1: groups.tsx — Remove create discussion and discussions filter

**File:** `app/(tabs)/groups.tsx`

| Section | Action |
|--------|--------|
| FilterType | Remove `'discussions'` |
| useDiscussionsQuery | Remove hook and all usages |
| showAddDiscussion | Remove; remove add-discussion header button |
| filter chips | Remove `'discussions'` from filter options |
| Content when filter === 'discussions' | Remove branch; only show groups (all/joined) and type filters (forum/ministry) |
| params.filter validation | Remove `'discussions'` from allowed values |

### Change 2: group/[id].tsx — Inline discussions list and create button

**File:** `app/group/[id].tsx`

| Section | Action |
|--------|--------|
| Imports | Add `useDiscussionsQuery`, `Pressable`, `EmptyState` (if not present) |
| handleViewDiscussions | Remove; replace with inline discussions list |
| Members section | Replace "View Discussions" button with: (a) `useDiscussionsQuery({ groupId: id })` when isMember, (b) "Create Discussion" button linking to `/group/discussion/create?groupId={id}`, (c) inline list of discussions with links to `/group/discussion/[id]` |
| Empty state | When no discussions, show EmptyState with Create Discussion CTA |

---

## 5. Implementation Handoff

- **Scope:** Minor  
- **Handoff:** Development team — direct implementation  
- **Success criteria:**  
  - No create discussion option on groups tab  
  - No discussions filter on groups tab  
  - Group detail screen shows discussions inline for members  
  - Create Discussion button on group detail navigates to create with groupId pre-filled  
