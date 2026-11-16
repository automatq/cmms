import { resolveMembership } from './membership';

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
