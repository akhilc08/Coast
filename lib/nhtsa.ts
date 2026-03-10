export interface VehicleDetails {
  make:      string
  model:     string
  year:      number
  bodyClass: string
  trim:      string
}

export function parseNhtsaResults(
  results: { Variable: string; Value: string }[]
): VehicleDetails | null {
  const map = Object.fromEntries(results.map(r => [r.Variable, r.Value]))
  const year = parseInt(map['Model Year'], 10)
  if (!map['Make'] || !map['Model'] || isNaN(year)) return null
  return {
    make:      map['Make'],
    model:     map['Model'],
    year,
    bodyClass: map['Body Class'] ?? '',
    trim:      map['Trim'] ?? '',
  }
}

export async function decodeVin(vin: string): Promise<VehicleDetails | null> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return parseNhtsaResults(data.Results)
  } catch {
    return null
  }
}
