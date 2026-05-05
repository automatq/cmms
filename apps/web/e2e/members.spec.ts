import { test, expect } from '@playwright/test'
import { signUpAndCreateOrg } from './helpers/auth'
import { newAccount, uniqueEmail } from './helpers/test-data'

test.describe('Members & invitations', () => {
  test('owner can invite a member; pending invitation appears', async ({
    page,
  }) => {
    const owner = newAccount('owner')
    await signUpAndCreateOrg(page, owner)

    await page.goto('/dashboard/settings/members')
    await expect(
      page.getByRole('heading', { name: /members/i }).first(),
    ).toBeVisible()

    // Owner row shows up in active members list
    await expect(page.locator('table')).toContainText(owner.email)
    await expect(page.locator('table')).toContainText(/owner/i)

    // Open invite dialog and send an invite
    const inviteEmail = uniqueEmail('invitee')
    await page.getByRole('button', { name: /invite member/i }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('#invite-email').fill(inviteEmail)
    await dialog.locator('#invite-role').selectOption('member')
    await dialog.getByRole('button', { name: /send invite/i }).click()

    // Dialog closes; invite shows up in the pending list
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.locator('body')).toContainText(inviteEmail, {
      timeout: 15_000,
    })
    await expect(page.locator('body')).toContainText(/pending/i)
  })

  test('settings sub-nav exposes Members link', async ({ page }) => {
    const account = newAccount('nav')
    await signUpAndCreateOrg(page, account)

    // The settings sub-nav (which contains Members) only renders when
    // pathname starts with /dashboard/settings, so navigate there first.
    await page.goto('/dashboard/settings')
    const membersLink = page.locator(
      'a[href="/dashboard/settings/members"]',
    )
    await expect(membersLink.first()).toBeVisible({ timeout: 10_000 })
    await membersLink.first().click()

    await expect(page).toHaveURL(/\/dashboard\/settings\/members/)
  })
})
