import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { gradingCallbackSchema } from '@/lib/validations/admin'

export async function POST(request: Request) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.GRADING_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse JSON body
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate payload
  const result = gradingCallbackSchema.safeParse(rawBody)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: result.error.flatten() },
      { status: 400 }
    )
  }

  const { vin, grade, grade_source } = result.data
  const normalizedVin = vin.toUpperCase()

  const admin = createAdminClient()

  // Look up listing by VIN
  const { data: listing, error: lookupError } = await admin
    .from('listings')
    .select('id')
    .eq('vin', normalizedVin)
    .single()

  if (lookupError || !listing) {
    return NextResponse.json({ error: 'VIN not found' }, { status: 404 })
  }

  // Write grade to listing
  const { error: updateError } = await admin
    .from('listings')
    .update({ grade, grade_source, graded_at: new Date().toISOString() })
    .eq('id', listing.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update grade' }, { status: 500 })
  }

  return NextResponse.json({ listing_id: listing.id }, { status: 200 })
}
