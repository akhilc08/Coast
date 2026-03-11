import { describe, it } from 'vitest'

describe('Stripe webhook handler', () => {
  it.todo('creates order and marks listing sold on checkout.session.completed')
  it.todo('is idempotent — skips if order already exists for session')
  it.todo('returns 400 on invalid signature')
  it.todo('returns 200 for unhandled event types')
})
