import { Mail, Github, Linkedin, Twitter, FileText, BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PostContentBoxes from '@/components/PostContentBoxes'
import type { Article } from '@/lib/api/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'
const INTERNAL_API_BASE = API_BASE_URL.startsWith('http')
  ? API_BASE_URL
  : `http://backend:3001${API_BASE_URL}`

export const dynamic = 'force-dynamic'

type PublicSettingsPayload = {
  data?: {
    aboutArticleId?: string | null
  }
}

type ArticlePayload = {
  data?: Article
}

async function fetchPublicAboutArticleId(): Promise<string | null> {
  try {
    const response = await fetch(`${INTERNAL_API_BASE}/profile/public`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as PublicSettingsPayload
    return payload?.data?.aboutArticleId || null
  } catch (error) {
    console.error('Failed to fetch public about settings:', error)
    return null
  }
}

async function fetchAboutArticle(aboutArticleId: string | null): Promise<Article | null> {
  if (!aboutArticleId) {
    return null
  }

  try {
    const response = await fetch(`${INTERNAL_API_BASE}/articles/${aboutArticleId}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as ArticlePayload
    return payload?.data || null
  } catch (error) {
    console.error('Failed to fetch about article:', error)
    return null
  }
}

export default async function AboutPage() {
  const aboutArticleId = await fetchPublicAboutArticleId()
  const article = await fetchAboutArticle(aboutArticleId)

  if (article) {
    const featuredLayout = (article.featuredImageLayout || 'BANNER').toLowerCase();
    const featuredSize = (article.featuredImageSize || 'M').toLowerCase();
    return (
      <div className="container py-12">
        <article className="mx-auto max-w-4xl">
          {article.featuredImage && featuredLayout === 'portrait' ? (
            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start">
              <div className={`featured-image featured-image--portrait featured-image--${featuredSize} flex-shrink-0`}>
                <img src={article.featuredImage} alt={`${article.title} featured`} />
              </div>
              <div className="flex-1">
                <h1 className="mb-8 text-4xl font-bold">{article.title}</h1>
                <PostContentBoxes html={article.content || ''} />
              </div>
            </div>
          ) : (
            <>
              {article.featuredImage && (
                <div className={`mb-8 featured-image featured-image--banner featured-image--${featuredSize}`}>
                  <img src={article.featuredImage} alt={`${article.title} featured`} />
                </div>
              )}
              <h1 className="mb-8 text-4xl font-bold">{article.title}</h1>
              <PostContentBoxes html={article.content || ''} />
            </>
          )}
        </article>
      </div>
    );
  }

  // Fallback to static content if no article is selected
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <h1 className="mb-4 text-4xl font-bold">About</h1>
          <p className="text-xl text-muted-foreground">
            Software developer, researcher, and technical writer
          </p>
        </div>

        {/* Bio Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Biography</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none">
            <p>
              I am a software developer and researcher passionate about building scalable systems
              and exploring the intersection of software engineering and academic research.
            </p>
            <p>
              With over 10 years of experience in full-stack development, I specialize in
              building modern web applications using technologies like React, Node.js, and cloud services.
              My research interests include distributed systems, machine learning, and software architecture.
            </p>
            <p>
              This blog serves as a platform to share my thoughts, tutorials, and research findings
              with the broader community. I believe in open-source software and knowledge sharing.
            </p>
          </CardContent>
        </Card>

        {/* Skills Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Skills & Expertise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-semibold">Frontend Development</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• React / Next.js</li>
                  <li>• TypeScript</li>
                  <li>• Tailwind CSS</li>
                  <li>• State Management</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">Backend Development</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Node.js / Express</li>
                  <li>• PostgreSQL / Prisma</li>
                  <li>• REST APIs</li>
                  <li>• Microservices</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">DevOps & Infrastructure</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Docker / Kubernetes</li>
                  <li>• CI/CD Pipelines</li>
                  <li>• Cloud Services (AWS, GCP)</li>
                  <li>• Linux Administration</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-3 font-semibold">Research Areas</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Distributed Systems</li>
                  <li>• Machine Learning</li>
                  <li>• Software Architecture</li>
                  <li>• Performance Optimization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Get in Touch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="mb-4 text-muted-foreground">
                Feel free to reach out for collaborations, questions, or just to say hello!
              </p>
              <Button asChild>
                <a href="mailto:contact@example.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </a>
              </Button>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Connect on Social Media</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                    <Twitter className="mr-2 h-4 w-4" />
                    Twitter
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="justify-start" asChild>
                <a href="/blog">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Blog Articles
                </a>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <a href="/papers">
                  <FileText className="mr-2 h-4 w-4" />
                  View Publications
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
