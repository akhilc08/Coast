import { describe, it, expect } from 'vitest'
import { formatBuyerName } from '@/lib/utils/formatBuyerName'

describe('formatBuyerName', () => {
  it('returns first name + last initial for a two-word name', () => {
    expect(formatBuyerName('Jane Doe')).toBe('Jane D.')
  })

  it('returns first name + last initial for multi-word name (splits on first space only)', () => {
    expect(formatBuyerName('Mary Jane Watson')).toBe('Mary J.')
  })

  it('returns full trimmed name when there is no space', () => {
    expect(formatBuyerName('Madonna')).toBe('Madonna')
  })

  it('returns Anonymous for null', () => {
    expect(formatBuyerName(null)).toBe('Anonymous')
  })

  it('returns Anonymous for empty string', () => {
    expect(formatBuyerName('')).toBe('Anonymous')
  })

  it('returns Anonymous for whitespace-only string', () => {
    expect(formatBuyerName('   ')).toBe('Anonymous')
  })

  it('handles double spaces between name parts by finding first non-space char after split', () => {
    // "Jane  Doe" — after splitting at first space, remainder is " Doe"
    // last initial = first non-space char in remainder = 'D'
    expect(formatBuyerName('Jane  Doe')).toBe('Jane D.')
  })

  it('trims leading/trailing whitespace before processing', () => {
    expect(formatBuyerName('  Jane Doe  ')).toBe('Jane D.')
  })
})
