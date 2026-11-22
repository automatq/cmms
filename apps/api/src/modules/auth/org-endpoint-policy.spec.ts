import {
  evaluateOrganizationRequest,
  OrgPolicyDeps,
  OrgPolicyRequest,
  PolicyMember,
} from './org-endpoint-policy';

const ORG = 'org-1';

function member(userId: string, role: string, status = 'active', id = `m-${userId}`): PolicyMember {
  return { id, userId, organizationId: ORG, role, status };
}

function makeDeps(members: PolicyMember[], extra: Partial<OrgPolicyDeps> = {}): OrgPolicyDeps {
  return {
    getMember: jest.fn(async (userId: string, orgId: string) =>
      members.find((m) => m.userId === userId && m.organizationId === orgId) ?? null,
    ),
    getMemberById: jest.fn(async (id: string) => members.find((m) => m.id === id) ?? null),
    getMemberByEmail: jest.fn(async (email: string) =>
      members.find((m) => `${m.userId}@x.com` === email) ?? null,
    ),
    getOrgIdBySlug: jest.fn(async (slug: string) => (slug === 'acme' ? ORG : null)),
    getInvitationOrgId: jest.fn(async (id: string) => (id === 'inv-1' ? ORG : null)),
    countActiveOwners: jest.fn(async () =>
      members.filter((m) => m.role === 'owner' && m.status !== 'inactive').length,
    ),
    ...extra,
  };
}

const req = (path: string, userId: string, body: any = {}, extra: Partial<OrgPolicyRequest> = {}): OrgPolicyRequest => ({
  path,
  body,
  query: {},
  user: { id: userId },
  activeOrganizationId: ORG,
  ...extra,
});

const members = [
  member('owner', 'owner'),
  member('admin', 'admin'),
  member('admin2', 'admin'),
  member('tech', 'member'),
  member('gone', 'admin', 'inactive'),
];

describe('evaluateOrganizationRequest: membership status', () => {
  it('ignores non-organization paths', async () => {
    const deps = makeDeps(members);
    await expect(evaluateOrganizationRequest(req('/get-session', 'gone'), deps)).resolves.toEqual({ ok: true });
    expect(deps.getMember).not.toHaveBeenCalled();
  });

  it.each([
    '/organization/invite-member',
    '/organization/update-member-role',
    '/organization/remove-member',
    '/organization/update',
    '/organization/cancel-invitation',
    '/organization/list-members',
    '/organization/get-full-organization',
    '/organization/list-invitations',
  ])('refuses %s for a deactivated member', async (path) => {
    const d = await evaluateOrganizationRequest(req(path, 'gone'), makeDeps(members));
    expect(d.ok).toBe(false);
  });

  it('refuses callers with no member row', async () => {
    const d = await evaluateOrganizationRequest(req('/organization/list-members', 'stranger'), makeDeps(members));
    expect(d).toEqual({ ok: false, message: 'You are not a member of this organization' });
  });

  it('refuses banned users', async () => {
    const d = await evaluateOrganizationRequest(
      { ...req('/organization/list-members', 'admin'), user: { id: 'admin', banned: true } },
      makeDeps(members),
    );
    expect(d.ok).toBe(false);
  });

  it('allows active members', async () => {
    const d = await evaluateOrganizationRequest(req('/organization/list-members', 'tech'), makeDeps(members));
    expect(d.ok).toBe(true);
  });

  it('refuses set-active into an org where the membership is inactive (by id and slug)', async () => {
    const deps = makeDeps(members);
    expect(
      (await evaluateOrganizationRequest(req('/organization/set-active', 'gone', { organizationId: ORG }, { activeOrganizationId: null }), deps)).ok,
    ).toBe(false);
    expect(
      (await evaluateOrganizationRequest(req('/organization/set-active', 'gone', { organizationSlug: 'acme' }, { activeOrganizationId: null }), deps)).ok,
    ).toBe(false);
  });

  it('allows clearing the active org', async () => {
    const d = await evaluateOrganizationRequest(req('/organization/set-active', 'gone', { organizationId: null }), makeDeps(members));
    expect(d.ok).toBe(true);
  });

  it.each(['/organization/list', '/organization/create', '/organization/accept-invitation', '/organization/leave'])(
    'does not require membership for %s',
    async (path) => {
      const d = await evaluateOrganizationRequest(req(path, 'gone'), makeDeps(members));
      expect(d.ok).toBe(true);
    },
  );

  it('checks the body organizationId over the active org', async () => {
    const deps = makeDeps(members);
    const d = await evaluateOrganizationRequest(
      req('/organization/update', 'admin', { organizationId: 'other-org', data: {} }),
      deps,
    );
    expect(d.ok).toBe(false);
    expect(deps.getMember).toHaveBeenCalledWith('admin', 'other-org');
  });

  it('resolves cancel-invitation against the invitation org, not the active org', async () => {
    const deps = makeDeps(members);
    const d = await evaluateOrganizationRequest(
      req('/organization/cancel-invitation', 'gone', { invitationId: 'inv-1' }, { activeOrganizationId: 'elsewhere' }),
      deps,
    );
    expect(d.ok).toBe(false);
    expect(deps.getMember).toHaveBeenCalledWith('gone', ORG);
  });
});

describe('evaluateOrganizationRequest: role hierarchy', () => {
  it('invite-member: only owners invite admins, nobody invites owners', async () => {
    const deps = makeDeps(members);
    expect((await evaluateOrganizationRequest(req('/organization/invite-member', 'admin', { role: 'admin' }), deps)).ok).toBe(false);
    expect((await evaluateOrganizationRequest(req('/organization/invite-member', 'owner', { role: 'admin' }), deps)).ok).toBe(true);
    expect((await evaluateOrganizationRequest(req('/organization/invite-member', 'owner', { role: 'owner' }), deps)).ok).toBe(false);
    expect((await evaluateOrganizationRequest(req('/organization/invite-member', 'admin', { role: 'member' }), deps)).ok).toBe(true);
  });

  it('update-member-role: admin cannot demote the owner or another admin, or promote to admin', async () => {
    const deps = makeDeps(members);
    const call = (actor: string, memberId: string, role: string) =>
      evaluateOrganizationRequest(req('/organization/update-member-role', actor, { memberId, role }), deps);
    expect((await call('admin', 'm-owner', 'member')).ok).toBe(false);
    expect((await call('admin', 'm-admin2', 'member')).ok).toBe(false);
    expect((await call('admin', 'm-tech', 'admin')).ok).toBe(false);
    expect((await call('owner', 'm-tech', 'admin')).ok).toBe(true);
    expect((await call('owner', 'm-tech', 'owner')).ok).toBe(false);
  });

  it('update-member-role: the last active owner cannot demote themselves', async () => {
    const d = await evaluateOrganizationRequest(
      req('/organization/update-member-role', 'owner', { memberId: 'm-owner', role: 'admin' }),
      makeDeps(members),
    );
    expect(d.ok).toBe(false);
  });

  it('remove-member: enforces rank by id and by email, and blocks self-removal', async () => {
    const deps = makeDeps(members);
    const call = (actor: string, memberIdOrEmail: string) =>
      evaluateOrganizationRequest(req('/organization/remove-member', actor, { memberIdOrEmail }), deps);
    expect((await call('admin', 'm-owner')).ok).toBe(false);
    expect((await call('admin', 'admin2@x.com')).ok).toBe(false);
    expect((await call('admin', 'm-tech')).ok).toBe(true);
    expect((await call('owner', 'm-admin')).ok).toBe(true);
    expect((await call('admin', 'm-admin')).ok).toBe(false);
  });

  it('leaves members of other orgs to Better Auth', async () => {
    const foreign = { ...member('x', 'owner'), organizationId: 'other', id: 'm-foreign' };
    const d = await evaluateOrganizationRequest(
      req('/organization/remove-member', 'admin', { memberIdOrEmail: 'm-foreign' }),
      makeDeps([...members, foreign]),
    );
    expect(d.ok).toBe(true);
  });
});
