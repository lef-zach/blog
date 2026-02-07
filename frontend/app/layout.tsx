import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { GlobalSidebar } from '@/components/layout/global-sidebar'
import { AuthProvider } from '@/components/providers/auth-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const INTERNAL_API_BASE = API_BASE_URL.startsWith('http')
  ? API_BASE_URL
  : `http://backend:3001${API_BASE_URL}`

const isPrivateHostname = (hostname: string) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  if (/^10\./.test(hostname)) return true
  if (/^192\.168\./.test(hostname)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true
  return false
}

const normalizeSiteOrigin = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol === 'http:' && !isPrivateHostname(url.hostname)) {
      url.protocol = 'https:'
    }
    return url.origin
  } catch {
    return null
  }
}

const normalizeOgImage = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null
  if (trimmed.startsWith('/')) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    return null
  }
  return null
}

const resolveOgImage = (value: string | null, siteOrigin: string) => {
  if (!value) return null
  if (value.startsWith('/')) {
    return new URL(value, siteOrigin).toString()
  }
  return value
}

type PublicSettings = {
  siteName?: string
  siteDescription?: string
  siteUrl?: string
  siteUrls?: string[]
  seo?: {
    metaTitle?: string
    metaDescription?: string
    ogImage?: string
  }
}

async function fetchPublicSettings(): Promise<PublicSettings | null> {
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchPublicSettings()
  const siteName = settings?.siteName || 'Modern Blog'
  const siteDescription = settings?.siteDescription || 'A modern blog platform.'
  const metaTitle = settings?.seo?.metaTitle || siteName
  const metaDescription = settings?.seo?.metaDescription || siteDescription
  const siteUrl = settings?.siteUrl || settings?.siteUrls?.[0] || 'http://localhost'
  const ogImage = normalizeOgImage(settings?.seo?.ogImage)

  let metadataBase: URL | undefined
  let canonicalUrl: string | undefined
  let siteOrigin = 'http://localhost'
  try {
    const normalizedOrigin = normalizeSiteOrigin(siteUrl)
    if (normalizedOrigin) {
      siteOrigin = normalizedOrigin
      metadataBase = new URL(normalizedOrigin)
      canonicalUrl = new URL('/', metadataBase).toString()
    }
  } catch {
    metadataBase = undefined
  }

  const defaultOgImage = resolveOgImage(ogImage || '/opengraph-image', siteOrigin)

  return {
    metadataBase,
    title: metaTitle,
    description: metaDescription,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl || siteUrl,
      siteName,
      type: 'website',
      images: defaultOgImage
        ? [{ url: defaultOgImage, width: 1200, height: 630, alt: siteName }]
        : undefined,
    },
    twitter: {
      card: defaultOgImage ? 'summary_large_image' : 'summary',
      title: metaTitle,
      description: metaDescription,
      images: defaultOgImage ? [defaultOgImage] : undefined,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <div className="flex-1 flex">
                <GlobalSidebar />
                <main className="flex-1">{children}</main>
              </div>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
