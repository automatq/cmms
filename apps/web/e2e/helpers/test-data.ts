// Helpers for generating unique-per-run test data so parallel runs and
// repeated invocations don't collide on email/slug uniqueness.

const TEST_EMAIL_DOMAIN =
  process.env.E2E_EMAIL_DOMAIN || 'chrisdbender.com'

export function uniqueId(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1e4)}`
}

export function uniqueEmail(prefix = 'pwtest'): string {
  return `${prefix}+${uniqueId()}@${TEST_EMAIL_DOMAIN}`
}

export function uniquePassword(): string {
  // Has upper, lower, digit, and symbol — clears Better Auth's defaults.
  return `Pw!${uniqueId()}aB`
}

export function uniqueOrgName(prefix = 'PwTest'): string {
  return `${prefix} ${uniqueId()}`
}

// Account fixture: name + creds + org name. Tests use this to spin up a
// fresh tenant per scenario.
export interface TestAccount {
  name: string
  email: string
  password: string
  orgName: string
}

export function newAccount(prefix = 'pwtest'): TestAccount {
  return {
    name: `Playwright ${prefix}`,
    email: uniqueEmail(prefix),
    password: uniquePassword(),
    orgName: uniqueOrgName(prefix.charAt(0).toUpperCase() + prefix.slice(1)),
  }
}
