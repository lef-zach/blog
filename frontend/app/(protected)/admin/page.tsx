"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Settings,
  Users,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalPapers: number;
  totalCitations: number;
  monthlyViews: number;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  createdAt: string;
  views: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    totalPapers: 0,
    totalCitations: 0,
    monthlyViews: 0,
  });
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch articles
      const articlesResponse = await apiClient.getArticles({ limit: 10 });
      const articles = (articlesResponse.data.articles || []) as unknown as Article[];

      // Calculate stats
      const totalArticles = articlesResponse.data.pagination.total;
      const publishedArticles = articles.filter((a: Article) => a.status === 'PUBLISHED').length;
      const draftArticles = articles.filter((a: Article) => a.status === 'DRAFT').length;
      const totalViews = articles.reduce((sum: number, a: Article) => sum + (a.views || 0), 0);

      const metricsResponse = await apiClient.getPaperMetrics();
      const totalPapers = metricsResponse.data.totalPapers;
      const totalCitations = metricsResponse.data.totalCitations;

      setStats({
        totalArticles,
        publishedArticles,
        draftArticles,
        totalPapers,
        totalCitations,
        monthlyViews: totalViews, // Using total views as monthly views for now
      });

      setRecentArticles(articles.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Logout failed:', err);
      window.location.href = '/';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-yellow-500/10 text-yellow-500', label: 'Draft' },
      PUBLISHED: { color: 'bg-green-500/10 text-green-500', label: 'Published' },
      ARCHIVED: { color: 'bg-gray-500/10 text-gray-500', label: 'Archived' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your blog and publications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <Button asChild>
              <Link href="/admin/articles/new">
                <Plus className="mr-2 h-4 w-4" />
                New Article
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalArticles}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.publishedArticles} published
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Papers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPapers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalCitations} citations
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.monthlyViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    All time
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Draft Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.draftArticles}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for review
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Articles */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Articles</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/articles">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentArticles.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No articles yet. Create your first article!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="font-semibold">{article.title}</h3>
                            {getStatusBadge(article.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {article.views} views
                            </span>
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href="/admin/articles/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Article
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href="/admin/papers">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Manage Papers
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Site Settings
                    </Link>
                  </Button>
                  <Button variant="outline" className="justify-start" asChild>
                    <Link href="/admin/analytics">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div >
  );
}
