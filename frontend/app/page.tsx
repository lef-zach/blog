"use client";

import Link from 'next/link'
import { ArrowRight, BookOpen, FileText, Github, Linkedin, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api/client'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.getPublicSettings();
        setSettings(res.data);
      } catch (e) {
        console.error("Failed to fetch settings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const { siteName, siteDescription, contactEmail } = settings || {};

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Welcome to <span className="text-primary">{siteName || 'My Tech Blog'}</span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            {siteDescription || 'Exploring the intersection of software development, academic research, and technical writing.'}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/blog">
                <BookOpen className="mr-2 h-5 w-5" />
                Read Articles
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/papers">
                <FileText className="mr-2 h-5 w-5" />
                View Publications
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">What You'll Find Here</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <BookOpen className="mb-2 h-12 w-12 text-primary" />
                <CardTitle>Technical Articles</CardTitle>
                <CardDescription>
                  In-depth tutorials, best practices, and insights on software development
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <FileText className="mb-2 h-12 w-12 text-primary" />
                <CardTitle>Research Papers</CardTitle>
                <CardDescription>
                  Academic publications and research findings in computer science
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Github className="mb-2 h-12 w-12 text-primary" />
                <CardTitle>Open Source</CardTitle>
                <CardDescription>
                  Code samples, projects, and contributions to the developer community
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Latest Articles Preview could fetch real articles eventually, but sticking to structure for now or leaving as static if not requested. User only asked for front page to be editable (implies content). I made Hero editable. */}
      {/* If user wants content to be editable they likely mean the text. */}

      {/* Social Links */}
      <section className="border-t bg-muted/50 py-12">
        <div className="container text-center">
          <h3 className="mb-6 text-xl font-semibold">Connect With Me</h3>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href={settings?.socialLinks?.github || "https://github.com"} target="_blank" rel="noopener noreferrer">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href={settings?.socialLinks?.linkedin || "https://linkedin.com"} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link href={settings?.socialLinks?.twitter || "https://twitter.com"} target="_blank" rel="noopener noreferrer">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
