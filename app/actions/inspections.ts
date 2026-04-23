'use server'

import { createClient } from '@/lib/supabase/server'
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

function parseSeatWear(raw: string): { degraded: boolean; severity: 'minor' | 'moderate' | 'severe' | null } {
  const v = raw.toLowerCase().trim()
  if (!v || v === 'none') return { degraded: false, severity: null }
  if (v === 'minor') return { degraded: true, severity: 'minor' }
  if (v === 'moderate') return { degraded: true, severity: 'moderate' }
  if (v === 'severe') return { degraded: true, severity: 'severe' }
  return { degraded: true, severity: 'minor' }
}

function parseOdor(raw: string): 'smoke' | 'mold_mildew' | 'burnt' | 'other' | 'none' {
  switch (raw) {
    case 'smoke':       return 'smoke'
    case 'mold_mildew': return 'mold_mildew'
    case 'burnt':       return 'burnt'
    case 'other':       return 'other'
    default:            return 'none'
  }
}

export interface InspectionFormData {
  vin: string
  inspectionDate: string
  inspectionProvider: string
  mileage: string
  exteriorRating: string
  minorBodyDefects: string
  majorBodyDefects: string
  glassDamage: string
  paintLow: string
  paintHigh: string
  interiorRating: string
  seatWear: string
  odor: string
  climateControl: boolean
  interiorDamage: string
  mechanicalRating: string
  engineNoises: string
  obdiiCodes: string
  fluidLeaks: string
  driveNotes: string
  tiresRating: string
  treadFl: string
  treadFr: string
  treadRl: string
  treadRr: string
  wheelDamage: string
}

export async function submitInspectionAction(
  data: InspectionFormData
): Promise<{ success: true; listing_id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return { error: 'Unauthorized' }

  const admin = createAdminClient()

  const { data: listing, error: lookupError } = await admin
    .from('listings')
    .select('id')
    .eq('vin', data.vin.trim().toUpperCase())
    .single()

  if (lookupError || !listing) return { error: `No listing found for VIN: ${data.vin}` }

  const extRating   = normalizeRating(data.exteriorRating)
  const intRating   = normalizeRating(data.interiorRating)
  const mechRating  = normalizeRating(data.mechanicalRating)
  const tiresRating = normalizeRating(data.tiresRating)

  const seatWear = parseSeatWear(data.seatWear)

  const paintReadings = (data.paintLow || data.paintHigh)
    ? [{ panel: 'Overall', reading: `${data.paintLow || '?'}–${data.paintHigh || '?'} µm` }]
    : []

  const obdiiList = parseList(data.obdiiCodes).map(code => ({
    code,
    description: '',
    monitor_status: 'complete',
  }))

  const fluidLeakList = parseList(data.fluidLeaks).map(fluid => ({
    fluid,
    severity: 'minor' as const,
  }))

  const toNum = (s: string) => { const n = parseFloat(s); return isNaN(n) ? null : n }

  const updatePayload: Record<string, unknown> = {
    ai_condition_exterior: {
      rating: extRating,
      rating_reason: '',
      body_defects: [...parseList(data.minorBodyDefects), ...parseList(data.majorBodyDefects)],
      scratches_dings_dents: '',
      bumper_fender_damage: '',
      paint_meter_readings: paintReadings,
      rust_areas: [],
      glass_damage: parseList(data.glassDamage),
      glass_inspector_notes: '',
    },
    ai_condition_interior: {
      rating: intRating,
      rating_reason: '',
      seat_wear_degraded: seatWear.degraded,
      seat_wear_severity: seatWear.severity,
      odor: parseOdor(data.odor),
      odor_notes: '',
      climate_control_working: data.climateControl,
      missing_or_broken: [],
      trim_damage_summary: data.interiorDamage,
      cosmetic_defects: '',
    },
    ai_condition_mechanical: {
      rating: mechRating,
      rating_reason: '',
      obdii_codes: obdiiList,
      engine_noise_db: null,
      engine_abnormalities: data.engineNoises,
      fluid_leaks: fluidLeakList,
      drive_notes: data.driveNotes,
    },
    ai_condition_tires: {
      rating: tiresRating,
      rating_reason: '',
      tread_fl: toNum(data.treadFl),
      tread_fr: toNum(data.treadFr),
      tread_rl: toNum(data.treadRl),
      tread_rr: toNum(data.treadRr),
      wheel_rim_damage: data.wheelDamage,
    },
    condition_locked: true,
    overall_grade: worstRatingToGrade([extRating, intRating, mechRating, tiresRating]),
    updated_at: new Date().toISOString(),
  }

  if (data.mileage) {
    const parsed = parseInt(data.mileage.replace(/[^0-9]/g, ''), 10)
    if (!isNaN(parsed)) updatePayload.mileage = parsed
  }

  const { error: updateError } = await admin
    .from('listings')
    .update(updatePayload)
    .eq('id', listing.id)

  if (updateError) return { error: `Failed to save: ${updateError.message}` }

  return { success: true, listing_id: listing.id }
}
