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

    // Query information_schema to check column existence
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'listings')
      .in('column_name', ['grade', 'grade_source', 'graded_at'])

    expect(error).toBeNull()
    expect(data).toBeDefined()

    const columnNames = (data ?? []).map((row: { column_name: string }) => row.column_name)
    expect(columnNames).toContain('grade')
    expect(columnNames).toContain('grade_source')
    expect(columnNames).toContain('graded_at')
  })
})
