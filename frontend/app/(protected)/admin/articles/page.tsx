"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Link2,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  shortCode?: string | null;
  shortClicks?: number;
  author: {
    id: string;
    name: string;
    email: string;
  };
  tags: string[];
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [error, setError] = useState('');
  const [siteUrl, setSiteUrl] = useState<string | null>(null);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getArticles({
        search: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setArticles((response.data.articles || []) as unknown as Article[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.getPublicSettings();
        setSiteUrl(response.data?.siteUrl || null);
      } catch (err) {
        console.error('Failed to fetch site settings for short links', err);
      }
    };

    fetchSettings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) {
      return;
    }

    try {
      await apiClient.deleteArticle(id);
      fetchArticles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete article');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { icon: Clock, color: 'bg-yellow-500/10 text-yellow-500', label: 'Draft' },
      PUBLISHED: { icon: CheckCircle, color: 'bg-green-500/10 text-green-500', label: 'Published' },
      ARCHIVED: { icon: Archive, color: 'bg-gray-500/10 text-gray-500', label: 'Archived' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getShortUrl = (code: string) => {
    const normalizeSiteUrl = (value?: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
      try {
        return new URL(withProtocol).origin;
      } catch {
        return null;
      }
    };

    const siteOrigin = normalizeSiteUrl(siteUrl);
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const origin = siteOrigin || fallbackOrigin;

    return origin ? `${origin}/s/${code}` : `/s/${code}`;
  };

  const copyShortUrl = (code: string) => {
    const shortUrl = getShortUrl(code);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shortUrl);
      return;
    }
    window.prompt('Copy short URL', shortUrl);
  };

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Articles</h1>
            <p className="text-muted-foreground">Manage your blog articles</p>
          </div>
          <Button asChild>
            <Link href="/admin/articles/new">
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Link>
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading articles...</p>
                </div>
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No articles found</h3>
                <p className="mb-4 text-center text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try adjusting your search or filter'
                    : 'Get started by creating your first article'}
                </p>
                {!searchQuery && statusFilter === 'ALL' && (
                  <Button asChild>
                    <Link href="/admin/articles/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Article
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold">{article.title}</h3>
                        {getStatusBadge(article.status)}
                      </div>
                      <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {article.views} views
                        </span>
                        {article.shortCode && (
                          <span className="flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => copyShortUrl(article.shortCode as string)}
                            >
                              /s/{article.shortCode}
                            </button>
                            {typeof article.shortClicks === 'number' && (
                              <span className="text-muted-foreground">({article.shortClicks})</span>
                            )}
                          </span>
                        )}
                        {article.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            {article.tags.slice(0, 3).map((tag) => (
                              <span
                                key={typeof tag === 'string' ? tag : (tag as any).name}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-primary"
                              >
                                {typeof tag === 'string' ? tag : (tag as any).name}
                              </span>
                            ))}
                            {article.tags.length > 3 && (
                              <span>+{article.tags.length - 3}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/blog/${article.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/articles/${article.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDelete(article.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
