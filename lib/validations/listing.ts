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
  trim:            z.string().optional(),
  body_class:      z.string().optional(),
  condition_notes: z.string().optional(),
})

export type VinStepInput     = z.infer<typeof vinStepSchema>
export type DetailsStepInput = z.infer<typeof detailsStepSchema>
