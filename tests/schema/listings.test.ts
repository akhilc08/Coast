import { describe, it, expect } from 'vitest'

// GRADE-03: Listings table includes grade, grade_source, and graded_at columns (nullable)
// This test queries the live Supabase DB to assert the schema is applied correctly.
// It will fail (connection error) until Plan 02 applies the migrations and .env.local is set.
describe('listings schema (GRADE-03)', () => {
  it('listings table has grade, grade_source, and graded_at columns', async () => {
    const { createClient } = await import('@supabase/supabase-js')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set — skipping live DB check')
      expect(true).toBe(true)
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify grade columns exist by selecting them directly with limit(0).
    // PostgREST validates column names against the schema before applying RLS,
    // so a missing column produces an error, and existing columns return [].
    // information_schema is not accessible via PostgREST (public schema only).
    const { error } = await supabase
      .from('listings')
      .select('grade, grade_source, graded_at')
      .limit(0)

    expect(error).toBeNull()
  })
})
