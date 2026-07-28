import {
  includeGroupAdminInCommunityDisplay,
  includeGroupMemberInCommunityDisplay,
} from '@/lib/groupCommunityDisplay';

describe('groupCommunityDisplay', () => {
  describe('includeGroupMemberInCommunityDisplay', () => {
    it('includes non–super_admin subjects regardless of leader flags', () => {
      expect(
        includeGroupMemberInCommunityDisplay({
          subjectIsAppSuperAdmin: false,
          subjectIsGroupAdmin: true,
          subjectIsGroupCreator: true,
        })
      ).toBe(true);
    });

    it('excludes app super_admin who is already a group admin', () => {
      expect(
        includeGroupMemberInCommunityDisplay({
          subjectIsAppSuperAdmin: true,
          subjectIsGroupAdmin: true,
          subjectIsGroupCreator: false,
        })
      ).toBe(false);
    });

    it('excludes app super_admin who is the group creator', () => {
      expect(
        includeGroupMemberInCommunityDisplay({
          subjectIsAppSuperAdmin: true,
          subjectIsGroupAdmin: false,
          subjectIsGroupCreator: true,
        })
      ).toBe(false);
    });

    it('includes app super_admin who is member-only (not leader / creator)', () => {
      expect(
        includeGroupMemberInCommunityDisplay({
          subjectIsAppSuperAdmin: true,
          subjectIsGroupAdmin: false,
          subjectIsGroupCreator: false,
        })
      ).toBe(true);
    });
  });

  describe('includeGroupAdminInCommunityDisplay', () => {
    it('includes non–super_admin subjects', () => {
      expect(
        includeGroupAdminInCommunityDisplay({
          subjectIsAppSuperAdmin: false,
          subjectIsGroupCreator: false,
          subjectIsGroupMember: false,
        })
      ).toBe(true);
    });

    it('excludes app super_admin with only ops admin row (not creator, not member)', () => {
      expect(
        includeGroupAdminInCommunityDisplay({
          subjectIsAppSuperAdmin: true,
          subjectIsGroupCreator: false,
          subjectIsGroupMember: false,
        })
      ).toBe(false);
    });

    it('includes app super_admin who is group creator', () => {
      expect(
        includeGroupAdminInCommunityDisplay({
          subjectIsAppSuperAdmin: true,
          subjectIsGroupCreator: true,
          subjectIsGroupMember: false,
        })
      ).toBe(true);
    });

    it('includes app super_admin who is also a group member', () => {
      expect(
        includeGroupAdminInCommunityDisplay({
          subjectIsAppSuperAdmin: true,
          subjectIsGroupCreator: false,
          subjectIsGroupMember: true,
        })
      ).toBe(true);
    });
  });
});
