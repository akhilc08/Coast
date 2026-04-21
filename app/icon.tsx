import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          background: '#ffffff',
          paddingTop: 2,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>
          C
        </span>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#2563eb' }}>.</span>
      </div>
    ),
    { ...size }
  )
}
