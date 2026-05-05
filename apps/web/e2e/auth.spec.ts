import { test, expect } from '@playwright/test'
import {
  signUp,
  signIn,
  signOut,
  createOrg,
  signUpAndCreateOrg,
} from './helpers/auth'
import { newAccount } from './helpers/test-data'

test.describe('Auth & onboarding', () => {
  test('signup → create org → land on dashboard', async ({ page }) => {
    const account = newAccount('signup')

    await signUp(page, account)
    await expect(page).toHaveURL(/\/onboarding\/create-org/)

    await createOrg(page, account.orgName)
    await expect(page).toHaveURL(/\/dashboard/)
    // Dashboard renders — confirm via the navigation chrome.
    await expect(
      page.getByRole('link', { name: /^Dashboard$/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('returning user lands on /dashboard, not /onboarding/create-org', async ({
    page,
  }) => {
    // Regression: returning sign-ins were previously bounced to create-org
    // because the new session row's active_organization_id was NULL.
    // Fixed by databaseHooks.session.create.after in apps/api better-auth.ts.
    const account = newAccount('returning')

    await signUpAndCreateOrg(page, account)
    await expect(page).toHaveURL(/\/dashboard/)

    await signOut(page)

    await signIn(page, account.email, account.password)
    await page.waitForURL(
      (url) =>
        url.pathname.startsWith('/dashboard') ||
        url.pathname.startsWith('/onboarding/create-org'),
      { timeout: 30_000 },
    )

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page).not.toHaveURL(/\/onboarding\/create-org/)
  })

  test('signin with bad password shows error and stays on /sign-in', async ({
    page,
  }) => {
    const account = newAccount('bad-pw')
    await signUpAndCreateOrg(page, account)
    await signOut(page)

    await signIn(page, account.email, 'totally-wrong-password')

    // Stay on /sign-in
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/sign-in/)
    // Error message rendered somewhere on the page
    await expect(page.locator('body')).toContainText(/invalid|incorrect|failed/i)
  })

  test('signup with already-used email shows error', async ({ page }) => {
    const account = newAccount('dup')
    await signUpAndCreateOrg(page, account)
    await signOut(page)

    // Try to sign up again with the same email
    await page.goto('/sign-up', { waitUntil: 'networkidle' })
    await page.fill('#name', 'Different Name')
    await page.fill('#email', account.email)
    await page.fill('#password', 'AnotherPw!12345')
    await page.getByRole('button', { name: /create account/i }).click()

    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/sign-up/)
    await expect(page.locator('body')).toContainText(/already|exists|in use|taken/i)
  })
})
