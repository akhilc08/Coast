export interface PaintReading {
  panel:   string
  reading: string
}

export interface OBDIICode {
  code:           string
  description:    string
  monitor_status: string
}

export interface FluidLeak {
  fluid:    string
  severity: 'minor' | 'moderate' | 'severe'
}

export type ConditionRating = 'excellent' | 'good' | 'average' | 'bad'

export interface AiExteriorCondition {
  rating:               ConditionRating
  rating_reason:        string
  body_defects:         string[]
  scratches_dings_dents: string
  bumper_fender_damage: string
  paint_meter_readings: PaintReading[]
  rust_areas:           string[]
  glass_damage:         string[]
  glass_inspector_notes: string
}

export interface AiInteriorCondition {
  rating:                ConditionRating
  rating_reason:         string
  seat_wear_degraded:    boolean
  seat_wear_severity:    'minor' | 'moderate' | 'severe' | null
  odor:                  'smoke' | 'mold_mildew' | 'burnt' | 'other' | 'none'
  odor_notes:            string
  climate_control_working: boolean
  missing_or_broken:     string[]
  trim_damage_summary:   string
  cosmetic_defects:      string
}

export interface AiMechanicalCondition {
  rating:               ConditionRating
  rating_reason:        string
  obdii_codes:          OBDIICode[]
  engine_noise_db:      number | null
  engine_abnormalities: string
  fluid_leaks:          FluidLeak[]
  drive_notes:          string
}

export interface AiTiresCondition {
  rating:           ConditionRating
  rating_reason:    string
  tread_fl:         number | null
  tread_fr:         number | null
  tread_rl:         number | null
  tread_rr:         number | null
  wheel_rim_damage: string
}

export interface AiConditionData {
  exterior:   AiExteriorCondition
  interior:   AiInteriorCondition
  mechanical: AiMechanicalCondition
  tires:      AiTiresCondition
}

// Map AI rating to worst-case overall_grade for the listings table
export function worstRatingToGrade(ratings: ConditionRating[]): 'excellent' | 'good' | 'fair' | 'poor' {
  if (ratings.includes('bad'))       return 'poor'
  if (ratings.includes('average'))   return 'fair'
  if (ratings.includes('good'))      return 'good'
  return 'excellent'
}

export function ratingColor(r: ConditionRating | null | undefined): string {
  switch (r) {
    case 'excellent': return 'text-green-600'
    case 'good':      return 'text-blue-600'
    case 'average':   return 'text-yellow-600'
    case 'bad':       return 'text-red-500'
    default:          return 'text-[#78716c]'
  }
}

export function ratingBg(r: ConditionRating | null | undefined): string {
  switch (r) {
    case 'excellent': return 'border-green-200 bg-green-50 text-green-700'
    case 'good':      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'average':   return 'border-yellow-200 bg-yellow-50 text-yellow-700'
    case 'bad':       return 'border-red-200 bg-red-50 text-red-600'
    default:          return 'border-[#e7e5e4] bg-[#fafaf9] text-[#78716c]'
  }
}

export function ratingLabel(r: ConditionRating | null | undefined): string {
  switch (r) {
    case 'excellent': return 'Excellent'
    case 'good':      return 'Good'
    case 'average':   return 'Average'
    case 'bad':       return 'Bad'
    default:          return 'Not rated'
  }
}
