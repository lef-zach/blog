'use client'

import { useEffect, useState } from 'react'
import { FileText, ExternalLink, Download, Quote, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient, Paper, Settings } from '@/lib/api/client'


export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    totalPapers: 0,
    totalCitations: 0,
    hIndex: 0,
    i10Index: 0,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // 1. Get Public Profile to find Admin User ID
        const settingsRes = await apiClient.request<{ id: string } & Settings>('/profile/public')
        const userId = settingsRes.data.id

        if (!userId) {
          throw new Error('Admin user not found')
        }

        // 2. Fetch Papers for this user
        // We need to pass userId. apiClient.getPapers constructs URLSearchParams.
        // Let's use a direct request for now to be safe, or update apiClient later.
        // Actually, let's just make a direct request to ensure we pass userId
        const params = { userId, limit: 100 }
        const response = await apiClient.getPapers(params)

        const fetchedPapers = response.data.papers
        setPapers(fetchedPapers)

        // 3. Calculate Metrics (Client-side for now, or fetch from backend if endpoint supports public metrics)
        // Backend has getMetrics but it might be protected/user-specific.
        // Let's verify backend metrics endpoint. It uses req.user!.userId.
        // So public metrics are not available. We calculate locally.
        const totalCitations = fetchedPapers.reduce((sum, p) => sum + p.citations, 0)
        const sorted = [...fetchedPapers].sort((a, b) => b.citations - a.citations)
        let hIndex = 0
        for (let i = 0; i < sorted.length; i++) {
          if (sorted[i].citations >= i + 1) hIndex = i + 1
          else break
        }
        const i10Index = sorted.filter(p => p.citations >= 10).length

        setMetrics({
          totalPapers: fetchedPapers.length,
          totalCitations,
          hIndex,
          i10Index,
        })

      } catch (err) {
        console.error('Failed to fetch papers:', err)
        setError('Failed to load papers. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="container py-12 text-center">
        <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Loading publications...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-12 text-center">
        <p className="text-lg font-medium text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="mb-4 text-4xl font-bold">Publications</h1>
            <p className="text-xl text-muted-foreground">
              Academic research and publications
            </p>
          </div>
          {typeof window !== 'undefined' &&
            JSON.parse(localStorage.getItem('user') || '{}')?.role === 'ADMIN' && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    // Call sync without arguments to use stored URL
                    // Note: We might need to cast or fix client type if it demands string
                    await apiClient.syncPapers(undefined as any);
                    window.location.reload();
                  } catch (e) {
                    console.error(e);
                    alert('Sync failed. Please check Settings -> Google Scholar URL');
                  }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Scholar
              </Button>
            )}
        </div>

        {/* Metrics */}
        <div className="mb-12 grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Papers</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalPapers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Citations</CardDescription>
              <CardTitle className="text-3xl">{metrics.totalCitations}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>h-index</CardDescription>
              <CardTitle className="text-3xl">{metrics.hIndex}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>i10-index</CardDescription>
              <CardTitle className="text-3xl">{metrics.i10Index}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Papers List */}
        <div className="space-y-6">
          {papers.length === 0 ? (
            <p className="text-muted-foreground">No papers found.</p>
          ) : (
            papers.map((paper) => (
              <Card key={paper.id}>
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {paper.type}
                    </span>
                    <span className="text-sm text-muted-foreground">{paper.year}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Quote className="h-3 w-3" />
                      {paper.citations} citations
                    </span>
                  </div>
                  <CardTitle className="text-xl">{paper.title}</CardTitle>
                  <CardDescription className="text-base">
                    {Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors} · {paper.venue}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {paper.abstract && (
                    <p className="mb-2 text-sm text-muted-foreground">{paper.abstract}</p>
                  )}
                  <div className="flex gap-2">
                    {paper.doi && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          DOI
                        </a>
                      </Button>
                    )}
                    {paper.pdfUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          PDF
                        </a>
                      </Button>
                    )}
                    {paper.url && (
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline bg-primary/10 px-3 py-2 rounded-md transition-colors hover:bg-primary/20"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Read Paper
                      </a>
                    )}
                    {/* BibTeX button could be implemented creatively or hidden if complex */}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
