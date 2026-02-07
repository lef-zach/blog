"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatReadingTime } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { useParams } from 'next/navigation';
import PostContentBoxes from '@/components/PostContentBoxes';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  publishedAt: string;
  readingTime: number;
  featuredImage?: string | null;
  featuredImageLayout?: 'BANNER' | 'PORTRAIT' | null;
  featuredImageSize?: 'S' | 'M' | 'B' | null;
  author: {
    name: string;
    bio?: string;
    avatar?: string;
  };
  category?: {
    name: string;
  };
  tags: { name: string }[];
  excerpt?: string;
}

const getAuthorInitials = (name?: string) => {
  if (!name) {
    return 'A';
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'A';
  }

  if (parts.length === 1) {
    return (parts[0][0] || 'A').toUpperCase();
  }

  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  const initials = `${first}${last}`.toUpperCase();

  return initials || 'A';
};

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getArticleBySlug(slug);
        setArticle(response.data as unknown as Article);
      } catch (err: any) {
        console.error('Failed to fetch article:', err);
        setError(err.message || 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
        <p className="text-muted-foreground mb-4">{error || 'Article not found'}</p>
        <Button asChild variant="outline">
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  const featuredLayout = (article.featuredImageLayout || 'BANNER').toLowerCase();
  const featuredSize = (article.featuredImageSize || 'M').toLowerCase();
  const authorInitials = getAuthorInitials(article.author?.name);
  const authorLabel = article.author?.name ? `Author ${article.author.name}` : 'Author';
  const shareText = article.excerpt || `Check out this article: ${article.title}`;

  const copyShareLink = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        return;
      } catch {
      }
    }
    window.prompt('Copy link', url);
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: shareText,
          url,
        });
        return;
      } catch {
      }
    }

    await copyShareLink(url);
  };

  const articleHeader = (
    <header>
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatDate(article.publishedAt || new Date().toISOString())}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {formatReadingTime(article.readingTime || 5)}
        </span>
      </div>
      <h1 className="mb-4 text-4xl font-bold">{article.title}</h1>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-label={authorLabel}
            title={authorLabel}
          >
            {authorInitials}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      </div>
    </header>
  );

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
        </Button>

        <article>
          {article.featuredImage && featuredLayout === 'portrait' ? (
            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start">
              <div
                className={`featured-image featured-image--portrait featured-image--${featuredSize} flex-shrink-0`}
              >
                <img src={article.featuredImage} alt={`${article.title} featured`} />
              </div>
              <div className="flex-1">{articleHeader}</div>
            </div>
          ) : (
            <>
              {article.featuredImage && (
                <div
                  className={`mb-8 featured-image featured-image--banner featured-image--${featuredSize}`}
                >
                  <img src={article.featuredImage} alt={`${article.title} featured`} />
                </div>
              )}
              <div className="mb-8">{articleHeader}</div>
            </>
          )}

          <div className="mb-8 flex flex-wrap gap-2">
            {article.category && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {article.category.name}
              </span>
            )}
            {article.tags?.map((tag: any) => (
              <span
                key={tag.name || tag}
                className="rounded-md bg-muted px-3 py-1 text-sm"
              >
                {tag.name || tag}
              </span>
            ))}
          </div>

          <PostContentBoxes html={article.content} />
        </article>
      </div>
    </div>
  );
}
