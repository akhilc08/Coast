import { describe, it } from 'vitest'

// Target: lib/nhtsa.ts (created in 02-02)
// import { decodeVin, parseNhtsaResults } from '@/lib/nhtsa'

// Fixture: subset of real NHTSA API response for VIN 1HGCM82633A004352 (2003 Honda Accord)
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
  it.todo('parseNhtsaResults converts Results array to flat object by Variable key')
  it.todo('parseNhtsaResults returns make=HONDA from fixture data')
  it.todo('parseNhtsaResults returns model=Accord from fixture data')
  it.todo('parseNhtsaResults returns year=2003 (integer) from fixture data')
  it.todo('parseNhtsaResults returns null when Make is missing from results')
  it.todo('decodeVin returns null (does not throw) when fetch response is not ok')
})
