import { test } from '@playwright/test'

test.describe('Wholesaler: create listing draft (LIST-05)', () => {
  test.fixme('redirects unauthenticated user from /seller/listings/new to /login', async () => {})
  test.fixme('authenticated wholesaler can reach /seller/listings/new', async () => {})
  test.fixme('step 1 VIN input accepts 17-character VIN', async () => {})
  test.fixme('successful VIN lookup auto-advances to step 2 with pre-filled fields', async () => {})
  test.fixme('failed VIN lookup shows inline error and does not advance', async () => {})
  test.fixme('step 2 Continue saves draft and shows step 3 photo upload', async () => {})
  test.fixme('wholesaler can close wizard mid-way and draft persists in dashboard', async () => {})
})
