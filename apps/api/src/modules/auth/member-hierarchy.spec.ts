import {
  checkInvitationRole,
  checkMemberChange,
  HIERARCHY_MESSAGES as M,
  MemberAction,
  parseRoles,
  roleRank,
} from './member-hierarchy';

describe('roleRank / parseRoles', () => {
  it('ranks owner > admin > other roles > none', () => {
    expect(roleRank('owner')).toBe(3);
    expect(roleRank('admin')).toBe(2);
    expect(roleRank('member')).toBe(1);
    expect(roleRank('technician')).toBe(1);
    expect(roleRank(null)).toBe(0);
  });

  it('handles comma-separated and array roles using the highest one', () => {
    expect(parseRoles(' member, Admin ')).toEqual(['member', 'admin']);
    expect(roleRank('member,admin')).toBe(2);
    expect(roleRank(['member', 'owner'])).toBe(3);
  });
});

describe('checkMemberChange matrix (other members)', () => {
  const statusActions: MemberAction[] = ['deactivate', 'activate', 'remove', 'update_profile'];

  // [actor, target, allowed]
  const matrix: Array<[string, string, boolean]> = [
    ['owner', 'owner', false],
    ['owner', 'admin', true],
    ['owner', 'member', true],
    ['admin', 'owner', false],
    ['admin', 'admin', false],
    ['admin', 'member', true],
    ['member', 'owner', false],
    ['member', 'admin', false],
    ['member', 'member', false],
  ];

  for (const action of statusActions) {
    it.each(matrix)(`${action}: %s acting on %s -> allowed=%s`, (actor, target, allowed) => {
      const d = checkMemberChange({ actorRole: actor, targetRole: target, isSelf: false, action });
      expect(d.ok).toBe(allowed);
    });
  }

  it('protects owners with a clear message', () => {
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'owner', isSelf: false, action: 'deactivate' }),
    ).toEqual({ ok: false, reason: M.OWNER_PROTECTED });
  });

  it('rejects peers of equal rank', () => {
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'admin', isSelf: false, action: 'deactivate' }),
    ).toEqual({ ok: false, reason: M.RANK });
  });
});

describe('checkMemberChange role changes', () => {
  it('never grants owner, even when the owner asks', () => {
    for (const actorRole of ['owner', 'admin']) {
      expect(
        checkMemberChange({ actorRole, targetRole: 'member', isSelf: false, action: 'change_role', newRole: 'owner' }),
      ).toEqual({ ok: false, reason: M.OWNER_GRANT });
    }
  });

  it('only owners grant admin', () => {
    expect(
      checkMemberChange({ actorRole: 'owner', targetRole: 'member', isSelf: false, action: 'change_role', newRole: 'admin' }).ok,
    ).toBe(true);
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'member', isSelf: false, action: 'change_role', newRole: 'admin' }),
    ).toEqual({ ok: false, reason: M.ADMIN_GRANT });
  });

  it('only owners revoke admin', () => {
    expect(
      checkMemberChange({ actorRole: 'owner', targetRole: 'admin', isSelf: false, action: 'change_role', newRole: 'member' }).ok,
    ).toBe(true);
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'admin', isSelf: false, action: 'change_role', newRole: 'member' }).ok,
    ).toBe(false);
  });

  it('nobody demotes an owner', () => {
    expect(
      checkMemberChange({ actorRole: 'owner', targetRole: 'owner', isSelf: false, action: 'change_role', newRole: 'member' }),
    ).toEqual({ ok: false, reason: M.OWNER_PROTECTED });
  });

  it('applies the admin rule to fine-grained role names too', () => {
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'member', isSelf: false, action: 'assign_roles', grantRoles: ['admin'] }).ok,
    ).toBe(false);
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'member', isSelf: false, action: 'assign_roles', grantRoles: ['technician'] }).ok,
    ).toBe(true);
    expect(
      checkMemberChange({ actorRole: 'owner', targetRole: 'member', isSelf: false, action: 'assign_roles', grantRoles: ['admin'] }).ok,
    ).toBe(true);
  });
});

describe('checkMemberChange self-service', () => {
  it.each(['owner', 'admin', 'member'])('a %s cannot deactivate, remove or re-activate themselves', (role) => {
    for (const action of ['deactivate', 'remove', 'activate'] as MemberAction[]) {
      expect(checkMemberChange({ actorRole: role, targetRole: role, isSelf: true, action })).toEqual({
        ok: false,
        reason: M.SELF_STATUS,
      });
    }
  });

  it('anyone can edit their own profile', () => {
    expect(checkMemberChange({ actorRole: 'member', targetRole: 'member', isSelf: true, action: 'update_profile' }).ok).toBe(true);
  });

  it('the last active owner cannot demote themselves', () => {
    expect(
      checkMemberChange({
        actorRole: 'owner', targetRole: 'owner', isSelf: true, action: 'change_role', newRole: 'admin', activeOwnerCount: 1,
      }),
    ).toEqual({ ok: false, reason: M.LAST_OWNER });
  });

  it('an owner may step down while another active owner remains', () => {
    expect(
      checkMemberChange({
        actorRole: 'owner', targetRole: 'owner', isSelf: true, action: 'change_role', newRole: 'admin', activeOwnerCount: 2,
      }).ok,
    ).toBe(true);
  });

  it('an admin cannot change their own admin role', () => {
    expect(
      checkMemberChange({ actorRole: 'admin', targetRole: 'admin', isSelf: true, action: 'change_role', newRole: 'member' }).ok,
    ).toBe(false);
  });

  it('a member cannot promote themselves', () => {
    expect(
      checkMemberChange({ actorRole: 'member', targetRole: 'member', isSelf: true, action: 'change_role', newRole: 'admin' }).ok,
    ).toBe(false);
    expect(
      checkMemberChange({ actorRole: 'member', targetRole: 'member', isSelf: true, action: 'change_role', newRole: 'owner' }).ok,
    ).toBe(false);
  });
});

describe('checkInvitationRole', () => {
  it('never invites as owner', () => {
    expect(checkInvitationRole('owner', 'owner')).toEqual({ ok: false, reason: M.OWNER_GRANT });
    expect(checkInvitationRole('owner', ['member', 'owner']).ok).toBe(false);
  });

  it('requires owner to invite an admin', () => {
    expect(checkInvitationRole('owner', 'admin').ok).toBe(true);
    expect(checkInvitationRole('admin', 'admin')).toEqual({ ok: false, reason: M.ADMIN_GRANT });
  });

  it('lets admins invite members', () => {
    expect(checkInvitationRole('admin', 'member').ok).toBe(true);
  });
});
