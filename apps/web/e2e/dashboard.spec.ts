import { test, expect } from '@playwright/test'
import { signUpAndCreateOrg } from './helpers/auth'
import { newAccount } from './helpers/test-data'

test.describe('Dashboard shell', () => {
  test('dashboard renders sidebar with all top-level nav items', async ({
    page,
  }) => {
    const account = newAccount('shell')
    await signUpAndCreateOrg(page, account)
    await expect(page).toHaveURL(/\/dashboard/)

    // The sidebar should have these top-level entries.
    const expected = [
      'Dashboard',
      'Assets',
      'Work Orders',
      'Work Requests',
      'PM Plans',
      'Calendar',
      'Inventory',
      'Reports',
      'Data Import',
      'AI Assistant',
      'Settings',
    ]
    for (const label of expected) {
      await expect(
        page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first(),
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test('trial banner appears for new orgs', async ({ page }) => {
    const account = newAccount('trial')
    await signUpAndCreateOrg(page, account)

    // First-time users land on a "Welcome to Nexly" onboarding wizard
    // that mounts a moment after dashboard load. Wait for it to render,
    // then click "Skip setup" and wait for it to unmount.
    const skipBtn = page.getByRole('button', { name: /skip setup/i })
    await skipBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await skipBtn.click()
    await skipBtn.waitFor({ state: 'hidden', timeout: 10_000 })

    // Banner shows "X days left in your trial"
    await expect(page.locator('body')).toContainText(/day.*left in your trial/i, {
      timeout: 15_000,
    })
    // And an "Add payment method" CTA
    await expect(
      page.getByRole('button', { name: /add payment method/i }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('navigating to /dashboard/work-orders shows the work orders page', async ({
    page,
  }) => {
    const account = newAccount('wo')
    await signUpAndCreateOrg(page, account)

    await page.goto('/dashboard/work-orders')
    await expect(page).toHaveURL(/\/dashboard\/work-orders/)
    // Page-level heading or page-header title
    await expect(page.locator('main, body').first()).toContainText(
      /work orders/i,
      { timeout: 10_000 },
    )
  })

  test('navigating to /dashboard/assets shows the assets page', async ({
    page,
  }) => {
    const account = newAccount('assets')
    await signUpAndCreateOrg(page, account)

    await page.goto('/dashboard/assets')
    await expect(page).toHaveURL(/\/dashboard\/assets/)
    await expect(page.getByRole('heading', { name: /^Assets$/i }).first()).toBeVisible(
      { timeout: 10_000 },
    )
  })
})
