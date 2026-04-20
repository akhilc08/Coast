import { z } from 'zod'

// VIN: 17 chars, no I/O/Q (SAE J112 standard)
export const vinStepSchema = z.object({
  vin: z
    .string()
    .length(17, 'VIN must be exactly 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'VIN contains invalid characters (I, O, Q not allowed)'),
})

export const detailsStepSchema = z.object({
  make:            z.string().min(1, 'Make is required'),
  model:           z.string().min(1, 'Model is required'),
  year:            z.number().int().min(1900).max(2100),
  mileage:         z.number().int().min(0, 'Mileage cannot be negative'),
  price_cents:     z.number().int().positive('Price must be greater than zero'),
  color:           z.string().optional(),
  condition_notes:      z.string().optional(),
  seller_description:   z.string().optional(),
  pickup_zip:      z.string().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
})

export type VinStepInput     = z.infer<typeof vinStepSchema>
export type DetailsStepInput = z.infer<typeof detailsStepSchema>

export const conditionStepSchema = z.object({
  // Overall (required)
  overall_grade: z.enum(['excellent','good','fair','poor','salvage'], {
    error: 'Overall grade is required',
  }),
  overall_notes: z.string().optional(),

  // Exterior (paint + body required)
  paint_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Paint condition is required',
  }),
  body_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Body condition is required',
  }),
  glass_condition: z.enum(['excellent','good','fair','poor']).optional(),
  exterior_notes:  z.string().optional(),

  // Interior (seats required)
  seat_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Seat condition is required',
  }),
  dashboard_condition: z.enum(['excellent','good','fair','poor']).optional(),
  carpet_condition:    z.enum(['excellent','good','fair','poor']).optional(),
  interior_notes:      z.string().optional(),

  // Mechanical (engine required)
  engine_condition: z.enum(['excellent','good','fair','poor'], {
    error: 'Engine condition is required',
  }),
  transmission_condition: z.enum(['excellent','good','fair','poor']).optional(),
  brake_condition:        z.enum(['excellent','good','fair','poor']).optional(),
  tire_condition:         z.enum(['excellent','good','fair','poor']).optional(),
  tire_tread_depth:       z.number().int().min(0).max(12).optional(),
  mechanical_notes:       z.string().optional(),

  // Known Issues
  known_issues: z.array(z.string()).default([]),

  // Disclosures
  has_accident_history: z.boolean().default(false),
  has_flood_damage:     z.boolean().default(false),
  has_frame_damage:     z.boolean().default(false),
  has_rebuilt_title:    z.boolean().default(false),
  has_lien:             z.boolean().default(false),
  is_former_rental:     z.boolean().default(false),
})

export type ConditionStepInput = z.infer<typeof conditionStepSchema>
