import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vin = req.nextUrl.searchParams.get('vin')
  if (!vin || vin.length < 17) return NextResponse.json({ error: 'Invalid VIN' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('listings')
    .select('id, year, make, model, status, condition_locked')
    .eq('vin', vin.trim().toUpperCase())
    .single()

  if (error || !data) return NextResponse.json({ error: 'No listing found for this VIN' }, { status: 404 })

  return NextResponse.json(data)
}
