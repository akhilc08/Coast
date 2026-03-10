import { test, expect } from '@playwright/test'

// AUTH-02: Consumer receives email verification; must verify before purchasing
// Note: Full email delivery tested manually. E2E tests the OTP exchange route.
test.describe('Email Confirmation Route (AUTH-02)', () => {
  test('confirm route redirects to login when token is missing', async ({ page }) => {
    await page.goto('/auth/confirm')
    // Without valid token, should redirect to login with error
    await expect(page).toHaveURL(/login/)
  })

  test('confirm route redirects to login on invalid token', async ({ page }) => {
    await page.goto('/auth/confirm?token_hash=invalid&type=email')
    await expect(page).toHaveURL(/login/)
  })
})
