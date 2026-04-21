import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 96, fontWeight: 800, color: 'white', letterSpacing: '-4px' }}>
            Coast
          </span>
          <span style={{ fontSize: 96, fontWeight: 800, color: '#93c5fd' }}>.</span>
        </div>
        <p style={{ fontSize: 28, color: 'rgba(255,255,255,0.75)', marginTop: 16, letterSpacing: '0.5px' }}>
          Wholesale Vehicle Marketplace
        </p>
      </div>
    ),
    { ...size }
  )
}
