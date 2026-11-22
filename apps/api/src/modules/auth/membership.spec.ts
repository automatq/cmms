import { isUserBanned, resolveMembership } from './membership';

const q = (rows: any[]) => jest.fn().mockResolvedValue({ rows });

describe('resolveMembership', () => {
  it('denies users with no member row (removed from the org)', async () => {
    await expect(resolveMembership('u', 't', q([]))).resolves.toMatchObject({ ok: false });
  });

  it('denies deactivated memberships', async () => {
    await expect(resolveMembership('u', 't', q([{ role: 'admin', status: 'inactive' }]))).resolves.toMatchObject({
      ok: false,
    });
  });

  it('returns the member role for active members', async () => {
    await expect(resolveMembership('u', 't', q([{ role: 'admin', status: 'active' }]))).resolves.toEqual({
      ok: true,
      role: 'admin',
    });
  });

  it('scopes the lookup to the user AND the organization', async () => {
    const query = q([]);
    await resolveMembership('user-1', 'org-1', query);
    expect(query.mock.calls[0][1]).toEqual(['user-1', 'org-1']);
  });
});

describe('isUserBanned', () => {
  it('is false for users that are not banned', () => {
    expect(isUserBanned({ banned: false })).toBe(false);
    expect(isUserBanned(null)).toBe(false);
  });

  it('is true for permanent bans and unexpired bans', () => {
    expect(isUserBanned({ banned: true })).toBe(true);
    expect(isUserBanned({ banned: true, banExpires: new Date(Date.now() + 60_000) })).toBe(true);
  });

  it('is false once the ban has expired', () => {
    expect(isUserBanned({ banned: true, banExpires: new Date(Date.now() - 60_000) })).toBe(false);
  });
});
