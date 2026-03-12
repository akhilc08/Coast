import { describe, it, expect } from 'vitest'
import { conditionStepSchema } from '@/lib/validations/listing'

describe('conditionStepSchema (COND-01)', () => {
  it('rejects when overall_grade is missing', () => {
    const result = conditionStepSchema.safeParse({
      paint_condition: 'good',
      body_condition:  'good',
      seat_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path[0])
      expect(paths).toContain('overall_grade')
    }
  })

  it('rejects when paint_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      body_condition:  'good',
      seat_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when body_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      seat_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when seat_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      body_condition:  'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when engine_condition is missing', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      body_condition:  'good',
      seat_condition:  'good',
    })
    expect(result.success).toBe(false)
  })

  it('rejects tire_tread_depth above 12', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:   'good',
      paint_condition: 'good',
      body_condition:  'good',
      seat_condition:  'good',
      engine_condition: 'good',
      tire_tread_depth: 13,
    })
    expect(result.success).toBe(false)
  })

  it('rejects tire_tread_depth below 0', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'good',
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
      tire_tread_depth: -1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a fully valid minimal payload', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'excellent',
      paint_condition:  'good',
      body_condition:   'fair',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(true)
  })

  it('defaults known_issues to empty array', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'good',
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.known_issues).toEqual([])
  })

  it('defaults all boolean disclosures to false', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'good',
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.has_accident_history).toBe(false)
      expect(result.data.has_flood_damage).toBe(false)
      expect(result.data.has_frame_damage).toBe(false)
      expect(result.data.has_rebuilt_title).toBe(false)
      expect(result.data.has_lien).toBe(false)
      expect(result.data.is_former_rental).toBe(false)
    }
  })

  it('rejects an invalid overall_grade value', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'perfect',  // not in enum
      paint_condition:  'good',
      body_condition:   'good',
      seat_condition:   'good',
      engine_condition: 'good',
    })
    expect(result.success).toBe(false)
  })

  it('accepts salvage as overall_grade', () => {
    const result = conditionStepSchema.safeParse({
      overall_grade:    'salvage',
      paint_condition:  'poor',
      body_condition:   'poor',
      seat_condition:   'poor',
      engine_condition: 'poor',
    })
    expect(result.success).toBe(true)
  })
})
