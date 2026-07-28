/**
 * Rules for who appears in community-facing group **member** and **leader** lists (Postgres
 * `group_members_for_display` / `group_admins_for_display`). Platform `app_roles.super_admin`
 * users are omitted when they would only appear due to elevated access; they stay visible when
 * they participate as creator, member, or both.
 *
 * Display RPCs apply for **all** viewers (including platform super_admins). For “am I a group
 * admin?” and super-admin assign flows, use `isUserGroupAdmin` (true for `group_admins` **or**
 * platform `super_admin`) and `getGroupAdminsAll` instead of inferring from the filtered list.
 */

export interface GroupMemberDisplayInput {
  subjectIsAppSuperAdmin: boolean;
  subjectIsGroupAdmin: boolean;
  subjectIsGroupCreator: boolean;
}

export interface GroupAdminDisplayInput {
  subjectIsAppSuperAdmin: boolean;
  subjectIsGroupCreator: boolean;
  subjectIsGroupMember: boolean;
}

export function includeGroupMemberInCommunityDisplay(input: GroupMemberDisplayInput): boolean {
  if (!input.subjectIsAppSuperAdmin) return true;
  return !input.subjectIsGroupAdmin && !input.subjectIsGroupCreator;
}

export function includeGroupAdminInCommunityDisplay(input: GroupAdminDisplayInput): boolean {
  if (!input.subjectIsAppSuperAdmin) return true;
  return input.subjectIsGroupCreator || input.subjectIsGroupMember;
}
