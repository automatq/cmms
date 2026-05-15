import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { uniqueId } from './test-data'

/**
 * Create a minimal asset via the /dashboard/assets/new form.
 * Returns the generated asset name so callers can find/assert on it later.
 */
export async function createAsset(page: Page, namePrefix = 'PwAsset'): Promise<string> {
  const name = `${namePrefix} ${uniqueId()}`
  await page.goto('/dashboard/assets/new')
  await page.locator('#name').waitFor({ state: 'visible', timeout: 15_000 })
  await page.fill('#name', name)
  await page.getByRole('button', { name: /save asset/i }).click()
  // On success the page redirects back to /dashboard/assets (no /new).
  await page.waitForURL(
    (url) => /\/dashboard\/assets\/?$/.test(url.pathname),
    { timeout: 30_000 },
  )
  return name
}

/**
 * From /dashboard/assets, click into the row matching the given asset name.
 * Leaves the page on /dashboard/assets/{id}.
 */
export async function openAssetDetail(page: Page, name: string): Promise<void> {
  await page.goto('/dashboard/assets')
  await expect(page.locator('body')).toContainText(name, { timeout: 15_000 })
  await page.locator(`a, button`, { hasText: name }).first().click()
  await page.waitForURL(/\/dashboard\/assets\/[0-9a-f-]+/, { timeout: 15_000 })
}
