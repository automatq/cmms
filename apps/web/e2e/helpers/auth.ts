// Auth flow helpers for e2e tests.
//
// All flows assume a Better Auth bearer-token setup: the client stores the
// token in localStorage under 'maintek_auth_token'. Sign-out is performed
// programmatically (POST /api/auth/sign-out + clear localStorage) since
// the dashboard's sign-out UI lives in a header dropdown that's awkward
// to drive in headless.

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { TestAccount } from './test-data'

export const AUTH_TOKEN_KEY = 'maintek_auth_token'

function authBaseURL(_webBaseURL: string): string {
  // /api/auth/* lives on the API service. Hardcoded here because the web
  // app reads NEXT_PUBLIC_API_URL at build time, not runtime — we can't
  // ask the page for it.
  return process.env.E2E_API_BASE_URL || 'https://api.maintek.app'
}

/** Sign up a brand-new user via the /sign-up form. */
export async function signUp(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/sign-up', { waitUntil: 'networkidle' })
  await page.locator('#name').waitFor({ state: 'visible' })
  await page.fill('#name', account.name)
  await page.fill('#email', account.email)
  await page.fill('#password', account.password)

  // Fire the click and wait for the resulting nav OR an inline error.
  // The signup endpoint can be slow under parallel load; bump timeout.
  await Promise.all([
    page.waitForURL(
      (url) =>
        url.pathname.startsWith('/onboarding/create-org') ||
        url.pathname.startsWith('/dashboard'),
      { timeout: 45_000 },
    ),
    page.getByRole('button', { name: /create account/i }).click(),
  ]).catch(async (err) => {
    // If the form rendered an error message, surface it instead of the
    // generic timeout — much more useful when debugging flakes.
    const errorText = await page
      .locator('p.text-destructive, [role="alert"]')
      .first()
      .textContent({ timeout: 1_000 })
      .catch(() => null)
    if (errorText) {
      throw new Error(`Sign-up failed with inline error: "${errorText.trim()}"`)
    }
    throw err
  })
}

/** Create the org for a freshly signed-up user. Must be on /onboarding/create-org. */
export async function createOrg(
  page: Page,
  orgName: string,
): Promise<void> {
  await expect(page).toHaveURL(/\/onboarding\/create-org/)
  await page.locator('#name').waitFor({ state: 'visible' })
  await page.fill('#name', orgName)
  // Slug auto-derives from name; leave it.
  await page.getByRole('button', { name: /continue to dashboard/i }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/dashboard'), {
    timeout: 30_000,
  })
}

/** End-to-end "I'm a fresh user with a fresh org" — leaves the page on /dashboard. */
export async function signUpAndCreateOrg(
  page: Page,
  account: TestAccount,
): Promise<void> {
  await signUp(page, account)
  await createOrg(page, account.orgName)
}

/** Sign in an existing user via the /sign-in form. */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/sign-in', { waitUntil: 'load' })
  await page.locator('#email').waitFor({ state: 'visible' })
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.getByRole('button', { name: /^sign in$/i }).click()
}

/**
 * Sign out programmatically (POST sign-out + clear local storage).
 * The dashboard sign-out UI lives in a header dropdown that doesn't open
 * reliably in headless mode, so we bypass it.
 */
export async function signOut(page: Page): Promise<void> {
  const baseURL = page.url()
  const authBase = authBaseURL(new URL(baseURL).origin)

  const token = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTH_TOKEN_KEY,
  )

  if (token) {
    await page.request
      .post(`${authBase}/api/auth/sign-out`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => {
        /* best effort — clearing local storage is what matters */
      })
  }

  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.context().clearCookies()
}
