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

const normalizeSiteOrigin = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`
  try {
    return new URL(withProtocol).origin
  } catch {
    return null
  }
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
  const ogImage = settings?.seo?.ogImage

  let metadataBase: URL | undefined
  let canonicalUrl: string | undefined
  try {
    const normalizedOrigin = normalizeSiteOrigin(siteUrl)
    if (normalizedOrigin) {
      metadataBase = new URL(normalizedOrigin)
      canonicalUrl = new URL('/', metadataBase).toString()
    }
  } catch {
    metadataBase = undefined
  }

  const defaultOgImage = ogImage || '/opengraph-image'

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
      images: defaultOgImage ? [{ url: defaultOgImage }] : undefined,
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
