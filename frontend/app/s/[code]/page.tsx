import { redirect, notFound } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const INTERNAL_ORIGIN = (() => {
  if (API_BASE_URL.startsWith('http')) {
    try {
      const url = new URL(API_BASE_URL)
      return `${url.protocol}//${url.host}`
    } catch {
      return API_BASE_URL.replace(/\/api\/v1\/?$/, '')
    }
  }
  return 'http://backend:3001'
})()

export default async function ShortLinkPage({
  params,
}: {
  params: { code: string }
}) {
  const code = params.code
  if (!code) {
    notFound()
  }

  const response = await fetch(`${INTERNAL_ORIGIN}/s/${encodeURIComponent(code)}`, {
    redirect: 'manual',
    cache: 'no-store',
  })

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location')
    if (location) {
      redirect(location)
    }
  }

  if (response.status === 404) {
    notFound()
  }

  redirect('/blog')
}
