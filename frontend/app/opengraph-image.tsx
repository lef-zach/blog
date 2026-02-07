import { ImageResponse } from 'next/og'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const INTERNAL_API_BASE = API_BASE_URL.startsWith('http')
  ? API_BASE_URL
  : `http://backend:3001${API_BASE_URL}`

type PublicSettings = {
  siteName?: string
  siteDescription?: string
}

const fetchPublicSettings = async (): Promise<PublicSettings | null> => {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/profile/public`, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return null
    const payload = await response.json()
    return payload?.data || null
  } catch {
    return null
  }
}

export default async function OpenGraphImage() {
  const settings = await fetchPublicSettings()
  const siteName = settings?.siteName || 'Modern Blog'
  const siteDescription = settings?.siteDescription || 'A modern blog platform.'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          color: '#f8fafc',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div
          style={{
            width: '88%',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            padding: 48,
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: 32,
            border: '1px solid rgba(148, 163, 184, 0.25)',
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>{siteName}</div>
          <div style={{ fontSize: 28, color: '#cbd5f5', lineHeight: 1.4 }}>{siteDescription}</div>
          <div style={{ fontSize: 20, color: '#94a3b8' }}>Essays, research, and engineering notes</div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
