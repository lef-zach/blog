"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Github, Linkedin, Twitter, Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/lib/api/client'

export function Footer() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setLoading(true)
      setMessage(null)
      const res = await apiClient.subscribe(email)
      // The backend returns { message: string } directly, not wrapped in data
      setMessage({ text: (res as any).message || "Subscribed successfully!", type: 'success' })
      setEmail('')
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to subscribe.", type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">TechBlog</h3>
            <p className="text-sm text-muted-foreground">
              A self-hosted blog platform for technical writing and academic publications.
            </p>

            <form onSubmit={handleSubscribe} className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold">Newsletter</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background h-9"
                  required
                />
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                </Button>
              </div>
              {message && (
                <p className={`text-xs ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {message.text}
                </p>
              )}
            </form>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-primary">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/papers" className="text-muted-foreground hover:text-primary">
                  Papers
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/admin" className="text-muted-foreground hover:text-primary">
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Connect</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" asChild>
                <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  <span className="sr-only">GitHub</span>
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                  <span className="sr-only">LinkedIn</span>
                </Link>
              </Button>
              <Button variant="outline" size="icon" asChild>
                <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                  <span className="sr-only">Twitter</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TechBlog. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
