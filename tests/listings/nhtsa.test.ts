import { describe, it, expect, vi } from 'vitest'
import { parseNhtsaResults, decodeVin } from '@/lib/nhtsa'

export const nhtsaFixture = {
  Results: [
    { Variable: 'Make', Value: 'HONDA', ValueId: '474' },
    { Variable: 'Model', Value: 'Accord', ValueId: '1861' },
    { Variable: 'Model Year', Value: '2003', ValueId: '' },
    { Variable: 'Body Class', Value: 'Coupe', ValueId: '3' },
    { Variable: 'Trim', Value: 'EX-V6', ValueId: '' },
    { Variable: 'Doors', Value: '2', ValueId: '' },
  ],
}

describe('NHTSA VIN decode (LIST-02)', () => {
  it('parseNhtsaResults converts Results array to flat object by Variable key', () => {
    const result = parseNhtsaResults(nhtsaFixture.Results)
    expect(result).not.toBeNull()
  })

  it('parseNhtsaResults returns make=HONDA from fixture data', () => {
    const result = parseNhtsaResults(nhtsaFixture.Results)
    expect(result?.make).toBe('HONDA')
  })

  it('parseNhtsaResults returns model=Accord from fixture data', () => {
    const result = parseNhtsaResults(nhtsaFixture.Results)
    expect(result?.model).toBe('Accord')
  })

  it('parseNhtsaResults returns year=2003 (integer) from fixture data', () => {
    const result = parseNhtsaResults(nhtsaFixture.Results)
    expect(result?.year).toBe(2003)
    expect(typeof result?.year).toBe('number')
  })

  it('parseNhtsaResults returns null when Make is missing from results', () => {
    const results = nhtsaFixture.Results.filter(r => r.Variable !== 'Make')
    const result = parseNhtsaResults(results)
    expect(result).toBeNull()
  })

  it('decodeVin returns null (does not throw) when fetch response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await decodeVin('1HGCM82633A004352')
    expect(result).toBeNull()
    vi.unstubAllGlobals()
  })
})
