# Sprint Change Proposal — 2026-03-04

**Project:** p28-v2  
**Workflow:** Correct Course  
**Date:** 2026-03-04

---

## 1. Issue Summary

**Problem:** Organization settings (admin org structure setup and editing) were placed under the Profile tab. This is not ideal or intuitive; users expect all group-related settings and operations to live on the Groups tab.

**Context:** The change was identified during sprint execution (Epic 2 in progress). Story 2.3 delivered admin screens for org → ministry → group structure, with entry via an "Organization settings" button on Profile.

**Evidence:** User feedback: "The current implementation has organization settings under the profile tab which is not ideal or intuitive. All group settings and operations should be on the Groups tab."

---

## 2. Impact Analysis

| Area | Impact |
|------|--------|
| **Epic 2** | Entry point only: admin flows move from Profile to Groups. No change to org/ministry/group CRUD or backend. |
| **Story 2.3** | Acceptance criteria updated to require admin entry from Groups tab. |
| **Epic 3 (future)** | Browse/join flows will live on Groups; this change aligns admin entry with that model. |
| **Epic 7 (future)** | Ministry-lead group management will also live under Groups; consistent. |
| **PRD** | No conflict; FR31–FR33 describe capabilities, not tab placement. |
| **Architecture** | No change to contracts or adapters. |
| **UX spec** | Navigation pattern updated: Admin entry from Groups tab (not Profile). |

---

## 3. Recommended Approach

**Selected:** Direct Adjustment — modify entry point and documentation only.

**Rationale:** Small, low-risk navigation change. Effort: Low. Risk: Low. No rollback or MVP scope change needed.

---

## 4. Detailed Change Proposals (Implemented)

### Code

1. **`app/(tabs)/profile.tsx`**  
   - Removed Organization settings button and all related state/logic (`adminOrgCount`, `fetchAdminOrgs`).  
   - Profile now only shows profile info, edit, notification preferences, app language, conduct, and sign out.

2. **`app/(tabs)/groups.tsx`**  
   - Added admin entry: when user is admin of at least one org, show "Organization admin" section with "Organization settings" button linking to `/admin`.  
   - Retained placeholder content: "Groups" / "Browse and join ministries and groups."

### Documentation

3. **`_bmad-output/planning-artifacts/ux-design-specification.md`**  
   - Navigation Patterns: Admin entry from "Profile or dedicated admin entry" → "Entry to org structure from Groups tab (when user is admin)."

4. **`_bmad-output/planning-artifacts/epics.md`**  
   - Story 2.3 acceptance criteria: added "with entry from the Groups tab (when user is admin)" in When; added "admin reaches these screens from the Groups tab, not Profile" in And.

---

## 5. Implementation Handoff

| Scope | Classification | Handoff |
|-------|----------------|--------|
| **Change scope** | Minor | Direct implementation by dev team |
| **Deliverables** | All four edit proposals applied (profile, groups, UX spec, epics) | Done in this session |
| **Success criteria** | Admins reach org structure from Groups tab; Profile no longer shows org settings | Ready for verification |
| **sprint-status.yaml** | No epic/story structure changes | No update required |

---

*Correct Course workflow — change approved for implementation.*
