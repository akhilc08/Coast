import { test, expect } from '@playwright/test'

// AUTH-01: Consumer can create an account with email and password
test.describe('Consumer Signup (AUTH-01)', () => {
  test('signup form renders and accepts valid input', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: /create account|sign up/i })).toBeVisible()
    await page.getByLabel(/full name/i).fill('Test Consumer')
    await page.getByLabel(/email/i).fill(`test-${Date.now()}@example.com`)
    await page.getByLabel(/^password$/i).fill('TestPass123')
    await page.getByRole('button', { name: /create account|sign up/i }).click()
    // After signup, should show email verification message or redirect
    await expect(page.getByText(/check your email|verify your email|confirmation/i)).toBeVisible({ timeout: 10000 })
  })

  test('signup form rejects invalid email', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/email/i).fill('not-an-email')
    await page.getByLabel(/^password$/i).fill('TestPass123')
    await page.getByRole('button', { name: /create account|sign up/i }).click()
    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })

  test('signup form rejects weak password', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('weak')
    await page.getByRole('button', { name: /create account|sign up/i }).click()
    await expect(page.getByText(/at least 8 characters|password must/i)).toBeVisible()
  })
})
