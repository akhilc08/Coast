import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { worstRatingToGrade } from '@/lib/types/condition'
import type { ConditionRating } from '@/lib/types/condition'

function normalizeRating(raw: string): ConditionRating {
  const v = raw.toLowerCase().trim()
  if (v === 'excellent') return 'excellent'
  if (v === 'good') return 'good'
  if (v === 'average' || v === 'fair') return 'average'
  if (v === 'bad' || v === 'poor') return 'bad'
  return 'average'
}

function parseList(raw: string): string[] {
  if (!raw || raw.trim() === '' || raw.toLowerCase() === 'none') return []
  return raw.split(/[,\n]+/).map(s => s.trim()).filter(Boolean)
}

function parseTread(raw: string): { fl: number | null; fr: number | null; rl: number | null; rr: number | null } {
  if (!raw) return { fl: null, fr: null, rl: null, rr: null }
  const parts = raw.split(/[,/\s]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
  if (parts.length === 1) return { fl: parts[0], fr: parts[0], rl: parts[0], rr: parts[0] }
  if (parts.length >= 4) return { fl: parts[0], fr: parts[1], rl: parts[2], rr: parts[3] }
  return { fl: parts[0] ?? null, fr: parts[1] ?? null, rl: parts[2] ?? null, rr: parts[3] ?? null }
}

function parseSeatWear(raw: string): { degraded: boolean; severity: 'minor' | 'moderate' | 'severe' | null } {
  const v = raw.toLowerCase().trim()
  if (!v || v === 'none' || v === 'no') return { degraded: false, severity: null }
  if (v.includes('minor')) return { degraded: true, severity: 'minor' }
  if (v.includes('moderate')) return { degraded: true, severity: 'moderate' }
  if (v.includes('severe')) return { degraded: true, severity: 'severe' }
  return { degraded: true, severity: 'minor' }
}

function parseOdor(raw: string): 'smoke' | 'mold_mildew' | 'burnt' | 'other' | 'none' {
  const v = raw.toLowerCase().trim()
  if (!v || v === 'none' || v === 'no') return 'none'
  if (v.includes('smoke')) return 'smoke'
  if (v.includes('mold') || v.includes('mildew')) return 'mold_mildew'
  if (v.includes('burnt') || v.includes('burn')) return 'burnt'
  return 'other'
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (!process.env.FORM_WEBHOOK_SECRET || secret !== process.env.FORM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      vin,
      mileage,
      exterior_rating,
      minor_body_defects,
      major_body_defects,
      glass_damage,
      paint_low,
      paint_high,
      interior_rating,
      seat_wear,
      odor,
      climate_control,
      interior_damage,
      mechanical_rating,
      engine_noises,
      obdii_codes,
      fluid_leaks,
      drive_notes,
      tires_rating,
      tread_depth,
      wheel_damage,
    } = body

    if (!vin) return NextResponse.json({ error: 'VIN is required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: listing, error: lookupError } = await admin
      .from('listings')
      .select('id')
      .eq('vin', String(vin).trim().toUpperCase())
      .single()

    if (lookupError || !listing) {
      return NextResponse.json({ error: `No listing found for VIN: ${vin}` }, { status: 404 })
    }

    const extRating   = normalizeRating(exterior_rating   ?? '')
    const intRating   = normalizeRating(interior_rating   ?? '')
    const mechRating  = normalizeRating(mechanical_rating ?? '')
    const tiresRating = normalizeRating(tires_rating      ?? '')

    const paintReadings = (paint_low || paint_high)
      ? [{ panel: 'Overall', reading: `${paint_low ?? '?'}–${paint_high ?? '?'} µm` }]
      : []

    const seatWear = parseSeatWear(seat_wear ?? '')
    const tread    = parseTread(tread_depth ?? '')

    const obdiiList = parseList(obdii_codes ?? '').map(code => ({
      code,
      description: '',
      monitor_status: 'complete',
    }))

    const fluidLeakList = parseList(fluid_leaks ?? '')
      .filter(s => s.toLowerCase() !== 'none')
      .map(fluid => ({ fluid, severity: 'minor' as const }))

    const climateWorking = !['no', 'not working', 'broken', 'false'].includes(
      (climate_control ?? '').toLowerCase().trim()
    )

    const ai_condition_exterior = {
      rating: extRating,
      rating_reason: '',
      body_defects: [
        ...parseList(minor_body_defects ?? ''),
        ...parseList(major_body_defects ?? ''),
      ],
      scratches_dings_dents: '',
      bumper_fender_damage: '',
      paint_meter_readings: paintReadings,
      rust_areas: [],
      glass_damage: parseList(glass_damage ?? ''),
      glass_inspector_notes: '',
    }

    const ai_condition_interior = {
      rating: intRating,
      rating_reason: '',
      seat_wear_degraded: seatWear.degraded,
      seat_wear_severity: seatWear.severity,
      odor: parseOdor(odor ?? ''),
      odor_notes: '',
      climate_control_working: climateWorking,
      missing_or_broken: [],
      trim_damage_summary: interior_damage ?? '',
      cosmetic_defects: '',
    }

    const ai_condition_mechanical = {
      rating: mechRating,
      rating_reason: '',
      obdii_codes: obdiiList,
      engine_noise_db: null,
      engine_abnormalities: engine_noises ?? '',
      fluid_leaks: fluidLeakList,
      drive_notes: drive_notes ?? '',
    }

    const ai_condition_tires = {
      rating: tiresRating,
      rating_reason: '',
      tread_fl: tread.fl,
      tread_fr: tread.fr,
      tread_rl: tread.rl,
      tread_rr: tread.rr,
      wheel_rim_damage: wheel_damage ?? '',
    }

    const overall_grade = worstRatingToGrade([extRating, intRating, mechRating, tiresRating])

    const parsedMileage = mileage
      ? parseInt(String(mileage).replace(/[^0-9]/g, ''), 10) || null
      : null

    // Insert into inspections history table
    const { error: insertError } = await admin
      .from('inspections')
      .insert({
        listing_id:            listing.id,
        inspection_date:       body.inspection_date || null,
        inspector_name:        body.inspection_provider || null,
        mileage_at_inspection: parsedMileage,
        exterior:              ai_condition_exterior,
        interior:              ai_condition_interior,
        mechanical:            ai_condition_mechanical,
        tires:                 ai_condition_tires,
        overall_grade,
      })

    if (insertError) {
      return NextResponse.json({ error: `Failed to save inspection record: ${insertError.message}` }, { status: 500 })
    }

    // Update listing with latest condition data
    const updatePayload: Record<string, unknown> = {
      ai_condition_exterior,
      ai_condition_interior,
      ai_condition_mechanical,
      ai_condition_tires,
      condition_locked: true,
      overall_grade,
      updated_at: new Date().toISOString(),
    }

    if (parsedMileage) updatePayload.mileage = parsedMileage

    const { error: updateError } = await admin
      .from('listings')
      .update(updatePayload)
      .eq('id', listing.id)

    if (updateError) {
      return NextResponse.json({ error: `Failed to update listing: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, listing_id: listing.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[form-webhook]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
