import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

async function loadGeist() {
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@latest/files/geist-sans-latin-800-normal.woff'
  )
  return res.arrayBuffer()
}

export default async function Icon() {
  const font = await loadGeist()

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', fontFamily: 'Geist Sans' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>C</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Geist Sans', data: font, weight: 800 }] }
  )
}
