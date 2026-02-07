"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import {
  Save,
  Eye,
  ArrowLeft,
  Plus,
  X,
  Calendar,
  Clock,
  FileText,
  Tag,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Copy,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RichTextEditor from '@/components/ui/rich-text-editor';

interface Article {
  id?: string;
  title: string;
  slug: string;
  shortCode?: string | null;
  shortClicks?: number;
  shortLastHitAt?: string | null;
  excerpt: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  tags: (string | { name: string })[];
  category?: string | { name: string };
  featuredImage?: string;
  featuredImageLayout?: 'BANNER' | 'PORTRAIT';
  featuredImageSize?: 'S' | 'M' | 'B';
  metaDescription?: string;
}

type ShortLinkStats = {
  shortCode?: string | null;
  shortClicks?: number;
  shortLastHitAt?: string | null;
  recentClicks: number;
  topReferrers: { domain: string; count: number }[];
  retentionDays: number;
};

export default function ArticleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const isEditing = !!params.id && params.id !== 'new';

  const [article, setArticle] = useState<Article>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    status: 'DRAFT',
    tags: [],
    featuredImageLayout: 'BANNER',
    featuredImageSize: 'M',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newTag, setNewTag] = useState('');
  const [featuredImageError, setFeaturedImageError] = useState('');
  const [shortLinkStats, setShortLinkStats] = useState<ShortLinkStats | null>(null);
  const [shortLinkLoading, setShortLinkLoading] = useState(false);
  const [shortLinkError, setShortLinkError] = useState('');
  const [siteUrl, setSiteUrl] = useState<string | null>(null);

  const fetchArticle = async () => {
    if (!isEditing) return;

    try {
      setLoading(true);
      const response = await apiClient.getArticleBySlug(params.id as string);
      const data = response.data as any;

      // Normalize tags and category to strings for the editor
      const normalizedArticle = {
        ...data,
        tags: data.tags.map((t: any) => typeof t === 'string' ? t : t.name),
        category: typeof data.category === 'object' && data.category ? data.category.name : data.category,
        featuredImageLayout: data.featuredImageLayout || 'BANNER',
        featuredImageSize: data.featuredImageSize || 'M'
      };

      setArticle(normalizedArticle);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch article');
    } finally {
      setLoading(false);
    }
  };

  const fetchShortLinkStats = async () => {
    if (!isEditing) return;
    try {
      setShortLinkLoading(true);
      setShortLinkError('');
      const response = await apiClient.getShortLinkStats(params.id as string);
      setShortLinkStats(response.data as ShortLinkStats);
    } catch (err: any) {
      setShortLinkError(err.message || 'Failed to load short link stats');
    } finally {
      setShortLinkLoading(false);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [params.id]);

  useEffect(() => {
    fetchShortLinkStats();
  }, [params.id]);

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

  const handleFeaturedImageUpload = (file: File | null) => {
    setFeaturedImageError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeaturedImageError('Please select an image file.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setFeaturedImageError('Image must be smaller than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setArticle((prev) => ({
          ...prev,
          featuredImage: result,
        }));
      }
    };
    reader.onerror = () => {
      setFeaturedImageError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
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

  const handleTitleChange = (value: string) => {
    setArticle((prev) => ({
      ...prev,
      title: value,
      slug: isEditing ? prev.slug : generateSlug(value),
    }));
  };

  const handleSave = async (publish = false) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const articleData = {
        ...article,
        status: publish ? 'PUBLISHED' : 'DRAFT',
      };

      if (isEditing) {
        await apiClient.updateArticle(params.id as string, articleData);
      } else {
        await apiClient.createArticle(articleData);
      }

      setSuccess(
        publish
          ? 'Article published successfully!'
          : 'Article saved successfully!'
      );
      setTimeout(() => {
        router.push('/admin/articles');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (article.tags.includes(newTag.trim())) return;

    setArticle((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()],
    }));
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setArticle((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handlePreview = () => {
    if (isEditing) {
      window.open(`/blog/${article.slug}`, '_blank');
    } else {
      alert('Save the article first to preview it');
    }
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading article...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="mb-2 text-4xl font-bold">
                {isEditing ? 'Edit Article' : 'New Article'}
              </h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Edit your article' : 'Create a new article'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {saving ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Article Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={article.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter article title"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={article.slug}
                    onChange={(e) =>
                      setArticle((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="article-slug"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <textarea
                    id="excerpt"
                    value={article.excerpt}
                    onChange={(e) =>
                      setArticle((prev) => ({ ...prev, excerpt: e.target.value }))
                    }
                    placeholder="Brief description of the article"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    value={article.content}
                    onChange={(value) =>
                      setArticle((prev) => ({ ...prev, content: value }))
                    }
                    placeholder="Write your article content here..."
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Current Status</span>
                    <Badge
                      className={
                        article.status === 'PUBLISHED'
                          ? 'bg-green-500/10 text-green-500'
                          : article.status === 'DRAFT'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-gray-500/10 text-gray-500'
                      }
                    >
                      {article.status}
                    </Badge>
                  </div>
                  {article.publishedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Published</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag"
                  />
                  <Button size="icon" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag: any) => {
                    const tagName = typeof tag === 'object' && tag !== null ? tag.name : tag;
                    return (
                      <Badge
                        key={tagName}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tagName}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader>
                <CardTitle>Category</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={typeof article.category === 'object' && article.category !== null ? (article.category as any).name : (article.category || '')}
                  onChange={(e) =>
                    setArticle((prev) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder="Article category"
                />
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Featured Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={article.featuredImage?.startsWith('data:') ? '' : (article.featuredImage || '')}
                  onChange={(e) =>
                    setArticle((prev) => ({
                      ...prev,
                      featuredImage: e.target.value,
                    }))
                  }
                  placeholder="https://example.com/image.jpg"
                />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="featuredImageLayout">Layout</Label>
                    <select
                      id="featuredImageLayout"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={article.featuredImageLayout || 'BANNER'}
                      onChange={(e) =>
                        setArticle((prev) => ({
                          ...prev,
                          featuredImageLayout: e.target.value as 'BANNER' | 'PORTRAIT',
                        }))
                      }
                    >
                      <option value="BANNER">Banner</option>
                      <option value="PORTRAIT">Left Portrait</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="featuredImageSize">Size</Label>
                    <select
                      id="featuredImageSize"
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={article.featuredImageSize || 'M'}
                      onChange={(e) =>
                        setArticle((prev) => ({
                          ...prev,
                          featuredImageSize: e.target.value as 'S' | 'M' | 'B',
                        }))
                      }
                    >
                      <option value="S">Small</option>
                      <option value="M">Medium</option>
                      <option value="B">Big</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="featuredImageUpload">Upload Image</Label>
                  <Input
                    id="featuredImageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFeaturedImageUpload(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uploading stores a data URL. Use a hosted URL if you prefer.
                  </p>
                  {featuredImageError && (
                    <p className="text-xs text-red-500">{featuredImageError}</p>
                  )}
                  {article.featuredImage && (
                    <div className={`mt-3 featured-image featured-image--${(article.featuredImageLayout || 'BANNER').toLowerCase()} featured-image--${(article.featuredImageSize || 'M').toLowerCase()}`}>
                      <img src={article.featuredImage} alt="Featured preview" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isEditing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Short Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {shortLinkLoading && (
                    <p className="text-sm text-muted-foreground">Loading short link stats...</p>
                  )}
                  {shortLinkError && (
                    <p className="text-sm text-destructive">{shortLinkError}</p>
                  )}
                  {!shortLinkLoading && !shortLinkError && (() => {
                    const shortCode = shortLinkStats?.shortCode || article.shortCode;

                    if (!shortCode) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          Publish the article to generate a short link.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">/s/{shortCode}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyShortUrl(shortCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total clicks: {shortLinkStats?.shortClicks ?? article.shortClicks ?? 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last hit:{' '}
                          {shortLinkStats?.shortLastHitAt
                            ? new Date(shortLinkStats.shortLastHitAt).toLocaleString()
                            : 'Never'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last {shortLinkStats?.retentionDays ?? 90} days: {shortLinkStats?.recentClicks ?? 0}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">Top referrers</p>
                          {shortLinkStats?.topReferrers?.length ? (
                            <div className="mt-2 space-y-1">
                              {shortLinkStats.topReferrers.map((ref) => (
                                <div key={ref.domain} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">{ref.domain}</span>
                                  <span>{ref.count}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">No referrers yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <textarea
                    id="metaDescription"
                    value={article.metaDescription || ''}
                    onChange={(e) =>
                      setArticle((prev) => ({
                        ...prev,
                        metaDescription: e.target.value,
                      }))
                    }
                    placeholder="SEO meta description"
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
