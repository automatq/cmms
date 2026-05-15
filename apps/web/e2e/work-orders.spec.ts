import { test, expect, type Page } from '@playwright/test'
import { signUpAndCreateOrg } from './helpers/auth'
import { createAsset } from './helpers/assets'
import { newAccount } from './helpers/test-data'

// Locator for the status dropdown on the WO detail page.
// The select is the only one on the page that has both "Requested" and
// "Cancelled" as options.
function statusSelect(page: Page) {
  return page
    .locator('select')
    .filter({ has: page.locator('option[value="requested"]') })
    .filter({ has: page.locator('option[value="cancelled"]') })
    .first()
}

/**
 * Create a WO against a freshly-created asset. Lands on /dashboard/work-orders.
 * Returns nothing — caller navigates into the WO via the list page.
 */
async function createWorkOrder(page: Page): Promise<void> {
  await createAsset(page, 'WOAsset')

  await page.goto('/dashboard/work-orders/new')
  // Wait for the asset dropdown to populate from the API
  const assetSelect = page.locator('#asset')
  await assetSelect.waitFor({ state: 'visible', timeout: 15_000 })
  // Wait until at least one non-empty option is available
  await expect
    .poll(
      async () => {
        const optionCount = await assetSelect.locator('option').count()
        return optionCount
      },
      { timeout: 15_000, message: 'asset dropdown did not populate' },
    )
    .toBeGreaterThan(1)

  // Pick the first non-placeholder option
  const firstAssetValue = await assetSelect.locator('option').nth(1).getAttribute('value')
  await assetSelect.selectOption(firstAssetValue!)

  await page.getByRole('button', { name: /submit work order/i }).click()
  // Redirects to /dashboard/work-orders on success
  await page.waitForURL(
    (url) => /\/dashboard\/work-orders\/?$/.test(url.pathname),
    { timeout: 30_000 },
  )
}

async function openFirstWorkOrder(page: Page): Promise<void> {
  await page.goto('/dashboard/work-orders')
  // WO cards show a WO number like "WO-2026-00001". Filter by that to
  // avoid matching the "New Work Order" CTA at the top of the page.
  const firstWoLink = page
    .locator('a')
    .filter({ hasText: /WO-\d{4}-\d+/ })
    .first()
  await firstWoLink.waitFor({ state: 'visible', timeout: 15_000 })
  await firstWoLink.click()
  await page.waitForURL(/\/dashboard\/work-orders\/[0-9a-f-]+/, {
    timeout: 15_000,
  })
}

test.describe('Work Order lifecycle', () => {
  test('new WO lands in REQUESTED status', async ({ page }) => {
    const account = newAccount('wo-create')
    await signUpAndCreateOrg(page, account)

    await createWorkOrder(page)

    // List page should show the new WO with a "requested" badge
    await expect(page.locator('body')).toContainText(/requested/i, {
      timeout: 15_000,
    })
  })

  test('REQUESTED → OPEN → IN_PROGRESS → COMPLETED transitions', async ({
    page,
  }) => {
    const account = newAccount('wo-lifecycle')
    await signUpAndCreateOrg(page, account)

    await createWorkOrder(page)
    await openFirstWorkOrder(page)

    const select = statusSelect(page)
    await expect(select).toBeVisible({ timeout: 15_000 })
    await expect(select).toHaveValue('requested')

    // REQUESTED → OPEN
    await select.selectOption('open')
    await expect(select).toHaveValue('open', { timeout: 15_000 })

    // OPEN → IN_PROGRESS
    await select.selectOption('in_progress')
    await expect(select).toHaveValue('in_progress', { timeout: 15_000 })

    // IN_PROGRESS → COMPLETED
    await select.selectOption('completed')
    await expect(select).toHaveValue('completed', { timeout: 15_000 })
  })

  test('WO can be CANCELLED from REQUESTED', async ({ page }) => {
    const account = newAccount('wo-cancel')
    await signUpAndCreateOrg(page, account)

    await createWorkOrder(page)
    await openFirstWorkOrder(page)

    const select = statusSelect(page)
    await expect(select).toHaveValue('requested')

    // REQUESTED → CANCELLED
    await select.selectOption('cancelled')
    await expect(select).toHaveValue('cancelled', { timeout: 15_000 })
  })
})
