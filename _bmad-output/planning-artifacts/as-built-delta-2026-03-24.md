# As-built delta (2026-03-24)

This file records how the **running codebase** has moved ahead of the **frozen** planning artifacts (`prd.md`, `architecture.md`, `epics.md`, `ux-design-specification.md`) without rewriting those documents end-to-end.

## Scope

- **Source of truth for “what ships today”:** `docs/as-built-snapshot.md` and `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated same date).
- **Historical / contractual context:** Original PRD and architecture remain useful for intent and NFRs; where they conflict with simplified MVP decisions, prefer **`sprint-change-proposal-2026-03-05.md`** and later change proposals plus the as-built snapshot.

## Confirmed divergences

1. **Messaging (FR18–FR21):** Direct messaging, chat folders, and realtime channels are implemented; **message attachments** (images, video, files) were added for **chat and discussions** (not fully anticipated in original story text).
2. **Home / feed (FR22–FR23):** Home aggregates groups, events, and announcements.
3. **Push (FR15–FR16):** Client registration and server-side push pipeline exist (DB + Edge Functions); operational tuning may continue; planning docs may under-spec current implementation.
4. **Faith Assistant (epic 8):** Described in planning and story files; **no dedicated verse/topic feature** in app tree at snapshot date.
5. **Design system narrative:** UX spec references “Warm & Soft” and specific hex values; product implementation aligns with token-driven **Calm & Glass** direction documented in `CLAUDE.md` / implementation tech specs.

**Out of scope (not tracked):** Message preview on Home / standalone message-preview list stories; full org → ministry → nested-group **admin hierarchy** (forums/ministries + group admins only — see `sprint-change-proposal-2026-03-05.md`).

## Recommended follow-up (optional)

- If you need a single updated PRD: run **`/bmad-bmm-create-prd`** in **Edit** or brownfield mode using `docs/as-built-snapshot.md` as input, or maintain PRD deltas only via this file.
- For deep module docs: **`/bmad-bmm-document-project`** (full rescan) can extend `docs/` beyond this snapshot.
