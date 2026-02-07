import type { Metadata } from 'next'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const INTERNAL_API_BASE = API_BASE_URL.startsWith('http')
  ? API_BASE_URL
  : `http://backend:3001${API_BASE_URL}`

type PublicSettings = {
  siteUrl?: string
  siteUrls?: string[]
  seo?: {
    ogImage?: string
  }
}

type ArticleMetadata = {
  title?: string
  excerpt?: string | null
  metaDescription?: string | null
  featuredImage?: string | null
  slug?: string
}

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

const fetchArticleMetadata = async (slug: string): Promise<ArticleMetadata | null> => {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/articles/${slug}`, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return null
    const payload = await response.json()
    return payload?.data || null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const [settings, article] = await Promise.all([
    fetchPublicSettings(),
    fetchArticleMetadata(params.slug),
  ])

  if (!article) {
    return {}
  }

  const siteOrigin = normalizeSiteOrigin(settings?.siteUrl || settings?.siteUrls?.[0]) || 'http://localhost'
  const canonicalUrl = `${siteOrigin}/blog/${article.slug || params.slug}`
  const description = article.excerpt || article.metaDescription || article.title || ''
  const ogImage = resolveOgImage(
    normalizeOgImage(article.featuredImage)
      || normalizeOgImage(settings?.seo?.ogImage)
      || '/opengraph-image',
    siteOrigin
  )

  let metadataBase: URL | undefined
  try {
    metadataBase = new URL(siteOrigin)
  } catch {
    metadataBase = undefined
  }

  return {
    metadataBase,
    title: article.title || 'Blog Article',
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: article.title || 'Blog Article',
      description,
      url: canonicalUrl,
      type: 'article',
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: article.title || 'Blog Article' }]
        : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: article.title || 'Blog Article',
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default function BlogSlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
