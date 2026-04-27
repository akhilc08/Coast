import { ImageResponse } from 'next/og'
import { getListing } from '@/lib/queries/listings'
import { PHOTO_SLOT_ORDER } from '@/lib/photo-slots'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await getListing(id)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const photos = (listing?.listing_photos ?? []) as { storage_key: string; position: number; slot_type?: string | null }[]
  const preferred = photos.find(p => p.slot_type === 'front_left_corner')
  const hero = preferred ?? photos.slice().sort((a, b) => {
    const ai = a.slot_type != null ? (PHOTO_SLOT_ORDER[a.slot_type] ?? 999) : a.position
    const bi = b.slot_type != null ? (PHOTO_SLOT_ORDER[b.slot_type] ?? 999) : b.position
    return ai - bi
  })[0]

  const heroUrl = hero
    ? `${supabaseUrl}/storage/v1/object/public/car-photos/${hero.storage_key}`
    : null

  const title = listing
    ? [listing.year, listing.make, listing.model].filter(Boolean).join(' ')
    : 'Vehicle Listing'

  if (!heroUrl) {
    // Fallback: Coast logo
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
          <span style={{ fontSize: 96, fontWeight: 800, color: '#0f172a' }}>Coast</span>
          <span style={{ fontSize: 96, fontWeight: 800, color: '#2563eb' }}>.</span>
        </div>
      ),
      { ...size }
    )
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroUrl}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Label bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.55)',
          padding: '20px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff' }}>{title}</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#ffffff' }}>
            Coast<span style={{ color: '#60a5fa' }}>.</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
