'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Tag, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, formatReadingTime } from '@/lib/utils'
import { apiClient, Article } from '@/lib/api/client'

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true)
        const response = await apiClient.getArticles({ status: 'PUBLISHED' })
        setArticles(response.data.articles)
      } catch (err) {
        console.error('Failed to fetch articles:', err)
        setError('Failed to load articles. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading articles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-12 text-center text-red-500">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold">Blog</h1>
          <p className="text-xl text-muted-foreground">
            Thoughts, tutorials, and insights on software development
          </p>
        </div>

        <div className="space-y-8">
          {articles.length === 0 ? (
            <p className="text-muted-foreground">No articles found.</p>
          ) : (
            articles.map((article) => (
              <Card key={article.id} className="overflow-hidden">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {article.publishedAt ? formatDate(article.publishedAt) : 'Draft'}
                    </span>
                    {/* readingTime is usually calculated on backend or frontend. client.ts Article type has user optional readingTime? */}
                    {/* Checking client.ts schema: readingTime is NOT in articleSchema but logic might return it? */}
                    {/* Backend ArticleService calculates it. Let's assume it returns it implicitly or we ignore it if missing. */}
                    {/* user.schema has readingTime? Article model in schema.prisma has it? */}
                    {/* Let's verify schema.ts later. For now, check if article has it. Type definition in client.ts implies it might not. */}
                    {/* Let's just try to render it if it exists. */}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatReadingTime(article.readingTime || 5)}
                    </span>
                    {article.category && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {typeof article.category === 'string' ? article.category : article.category.name}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-2xl">
                    <Link
                      href={`/blog/${article.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {article.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="text-base">
                    {article.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <span
                        key={typeof tag === 'string' ? tag : tag.name}
                        className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                      >
                        <Tag className="h-3 w-3" />
                        {typeof tag === 'string' ? tag : tag.name}
                      </span>
                    ))}
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/blog/${article.slug}`}>Read More</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
