import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function loadGeist() {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/files/geist-sans-latin-800-normal.woff'
  )
  return res.arrayBuffer()
}

export default async function OgImage() {
  const font = await loadGeist()

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
          background: '#ffffff',
          fontFamily: 'Geist Sans',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 120, fontWeight: 800, color: '#0f172a', letterSpacing: '-5px' }}>
            Coast
          </span>
          <span style={{ fontSize: 120, fontWeight: 800, color: '#2563eb' }}>.</span>
        </div>
        <p style={{ fontSize: 26, color: '#94a3b8', marginTop: 8, letterSpacing: '0.5px', fontWeight: 400 }}>
          Wholesale Vehicle Marketplace
        </p>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Geist Sans', data: font, weight: 800 }],
    }
  )
}
