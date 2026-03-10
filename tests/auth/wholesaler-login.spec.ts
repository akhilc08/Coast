import { test, expect } from '@playwright/test'

// AUTH-04: Wholesaler can log in with admin-provided credentials
test.describe('Wholesaler Login (AUTH-04)', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('login rejects invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('nonexistent@example.com')
    await page.getByLabel(/password/i).fill('WrongPass123')
    await page.getByRole('button', { name: /log in|sign in/i }).click()
    await expect(page.getByText(/invalid|incorrect|credentials/i)).toBeVisible({ timeout: 10000 })
  })
})
