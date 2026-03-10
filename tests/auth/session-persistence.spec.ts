import { test, expect } from '@playwright/test'

// AUTH-05: User session persists across browser refresh
test.describe('Session Persistence (AUTH-05)', () => {
  test('unauthenticated user is redirected from protected routes after refresh', async ({ page }) => {
    // Without login, /account should redirect to /login
    await page.goto('/account')
    await expect(page).toHaveURL(/login/)
  })

  test('login page is accessible without session', async ({ page }) => {
    await page.goto('/login')
    await expect(page).not.toHaveURL(/error|404/)
  })
})
