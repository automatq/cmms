import { test, expect } from '@playwright/test'

// Smoke tests for the public marketing pages — they shouldn't 500 or
// blank-render when crawlers / first-time visitors hit them.

test.describe('Marketing site', () => {
  test('landing page renders hero + nav', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText(/maintenance management/i)
    await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /start.*trial/i }).first(),
    ).toBeVisible()
  })

  test('pricing page shows single $269 CAD/month tier', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('body')).toContainText('$269')
    await expect(page.locator('body')).toContainText(/CAD/i)
    await expect(page.locator('body')).toContainText(/14[- ]day/i)
    // Should NOT show old tiers
    await expect(page.locator('body')).not.toContainText(/\$49\b/)
    await expect(page.locator('body')).not.toContainText(/\$149\b/)
  })

  test('about page renders', async ({ page }) => {
    await page.goto('/about')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('contact page renders form', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
  })

  test('features page renders', async ({ page }) => {
    await page.goto('/features')
    await expect(page.locator('h1')).toBeVisible()
  })
})
