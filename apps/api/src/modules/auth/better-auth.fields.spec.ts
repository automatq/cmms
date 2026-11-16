import { ORGANIZATION_ADDITIONAL_FIELDS, USER_ADDITIONAL_FIELDS } from './better-auth-fields';

// Privileged columns must never be client-writable through Better Auth's
// sign-up / update-user / organization.update endpoints.
describe('Better Auth privileged fields', () => {
  it.each(['role', 'banned', 'banReason', 'banExpires', 'status'] as const)('user.%s is input:false', (f) => {
    expect((USER_ADDITIONAL_FIELDS[f] as any).input).toBe(false);
  });

  it.each([
    'status', 'plan', 'modules', 'polarCustomerId', 'polarSubscriptionId',
    'userCount', 'assetCount', 'storageBytesUsed',
  ] as const)('organization.%s is input:false', (f) => {
    expect((ORGANIZATION_ADDITIONAL_FIELDS[f] as any).input).toBe(false);
  });
});
