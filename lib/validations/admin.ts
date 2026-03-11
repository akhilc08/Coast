import { z } from 'zod'

export const createWholesalerSchema = z.object({
  businessName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export const gradingCallbackSchema = z.object({
  vin: z.string().length(17),
  grade: z.string().min(1).max(10),
  grade_source: z.enum(['ai', 'manual']).default('ai'),
})

export type CreateWholesalerInput = z.infer<typeof createWholesalerSchema>
export type GradingCallbackInput = z.infer<typeof gradingCallbackSchema>
