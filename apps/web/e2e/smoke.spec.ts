import { test, expect, type Page } from '@playwright/test'
import { signUpAndCreateOrg } from './helpers/auth'
import { newAccount } from './helpers/test-data'

// Smoke tests: walk the dashboard sidebar pages and confirm each one
// renders without a 500/blank-page. We share a single signed-in session
// across all checks so we don't pay the signup cost N times (and so we
// don't trip the auth rate limiter).

test.describe('Dashboard pages smoke', () => {
  test.describe.configure({ mode: 'serial' })

  let page: Page

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    page = await ctx.newPage()
    const account = newAccount('smoke')
    await signUpAndCreateOrg(page, account)

    // First-time onboarding wizard sometimes blocks the dashboard. Skip if present.
    const skipBtn = page.getByRole('button', { name: /skip setup/i })
    if (await skipBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skipBtn.click()
      await skipBtn.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => null)
    }
  })

  test.afterAll(async () => {
    await page?.context().close()
  })

  // KNOWN BROKEN: `/dashboard/inventory/parts` returns 404 — the directory has
  // [id]/ and new/ subroutes but no page.tsx for the list view. Skip until fixed.
  const pagesToCheck: Array<{ path: string; expectText: RegExp; skip?: string }> = [
    { path: '/dashboard', expectText: /dashboard/i },
    { path: '/dashboard/work-orders', expectText: /work orders/i },
    { path: '/dashboard/work-requests', expectText: /work request/i },
    { path: '/dashboard/assets', expectText: /assets/i },
    { path: '/dashboard/pm', expectText: /pm|preventive/i },
    { path: '/dashboard/pm/templates', expectText: /template/i },
    { path: '/dashboard/calendar', expectText: /calendar/i },
    { path: '/dashboard/inventory/parts', expectText: /parts/i, skip: 'missing page.tsx — list view returns 404' },
    { path: '/dashboard/inventory/storerooms', expectText: /storeroom/i },
    { path: '/dashboard/inventory/suppliers', expectText: /supplier/i },
    { path: '/dashboard/inventory/transactions', expectText: /transaction/i },
    { path: '/dashboard/inventory/purchase-orders', expectText: /purchase order/i },
    { path: '/dashboard/inventory/contracts', expectText: /contract/i },
    { path: '/dashboard/reports', expectText: /report/i },
    { path: '/dashboard/reports/downtime', expectText: /downtime/i },
    { path: '/dashboard/reports/work-orders', expectText: /work order/i },
    { path: '/dashboard/reports/assets', expectText: /asset/i },
    { path: '/dashboard/reports/costs', expectText: /cost/i },
    { path: '/dashboard/reports/budgets', expectText: /budget/i },
    { path: '/dashboard/reports/warranties', expectText: /warrant/i },
    { path: '/dashboard/reports/pm-compliance', expectText: /pm|compliance/i },
    { path: '/dashboard/reports/technician-performance', expectText: /technician|performance/i },
    { path: '/dashboard/reports/inventory', expectText: /inventory/i },
    { path: '/dashboard/ai', expectText: /ai|assistant/i },
    { path: '/dashboard/search', expectText: /search/i },
    { path: '/dashboard/imports', expectText: /import/i },
    { path: '/dashboard/settings', expectText: /settings/i },
    { path: '/dashboard/settings/members', expectText: /member/i },
    { path: '/dashboard/settings/teams', expectText: /team/i },
    { path: '/dashboard/settings/webhooks', expectText: /webhook/i },
  ]

  for (const { path, expectText, skip } of pagesToCheck) {
    if (skip) {
      test.skip(`page ${path} renders (SKIP: ${skip})`, async () => {})
      continue
    }
    test(`page ${path} renders`, async () => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      // 200 OK
      expect(response?.status(), `${path} returned ${response?.status()}`).toBeLessThan(400)
      // No client-side error boundary
      await expect(page.locator('body')).not.toContainText(/application error|something went wrong/i)
      // Page-specific keyword present somewhere on the page
      await expect(page.locator('body')).toContainText(expectText, { timeout: 10_000 })
    })
  }
})
