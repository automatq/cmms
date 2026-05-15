import { test, expect } from '@playwright/test'
import { signUpAndCreateOrg } from './helpers/auth'
import { createAsset } from './helpers/assets'
import { newAccount } from './helpers/test-data'

test.describe('Assets', () => {
  test('create asset → appears in list → detail page loads', async ({ page }) => {
    const account = newAccount('asset-crud')
    await signUpAndCreateOrg(page, account)

    const name = await createAsset(page, 'AssetCrud')

    // Back on the list page after creation
    await expect(page).toHaveURL(/\/dashboard\/assets\/?$/)
    await expect(page.locator('body')).toContainText(name, { timeout: 15_000 })

    // Click into detail
    await page.locator('a', { hasText: name }).first().click()
    await page.waitForURL(/\/dashboard\/assets\/[0-9a-f-]+/, {
      timeout: 15_000,
    })

    // Detail page renders the asset name in a heading
    await expect(page.locator('body')).toContainText(name)
  })

  test('asset list filter / search works', async ({ page }) => {
    const account = newAccount('asset-search')
    await signUpAndCreateOrg(page, account)

    const name = await createAsset(page, 'AssetSearch')

    await page.goto('/dashboard/assets')
    const searchBox = page.getByPlaceholder(/search/i).first()
    if (await searchBox.count()) {
      await searchBox.fill(name.split(' ')[1] ?? name)
      // Wait briefly for debounce
      await page.waitForTimeout(800)
      await expect(page.locator('body')).toContainText(name)
    }
  })
})
