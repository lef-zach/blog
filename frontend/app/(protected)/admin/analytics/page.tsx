"use client";

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  FileText,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnalyticsData {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    totalArticles: number;
    totalPapers: number;
    viewsChange: number;
    visitorsChange: number;
  };
  articles: {
    id: string;
    title: string;
    views: number;
    change: number;
  }[];
  papers: {
    id: string;
    title: string;
    citations: number;
    change: number;
  }[];
  traffic: {
    date: string;
    views: number;
    visitors: number;
  }[];
  geo?: {
    countries: { name: string; count: number }[];
    regions: { name: string; count: number }[];
    cities: { name: string; count: number }[];
  };
  referrers?: { name: string; count: number }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const getDateRange = (timeRange: '7d' | '30d' | '90d' | '1y') => {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(timeRange);
      const response = await apiClient.getAnalytics({ startDate, endDate });
      setAnalytics(response.data as AnalyticsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleExport = () => {
    if (!analytics) return;

    const data = {
      overview: analytics.overview,
      articles: analytics.articles,
      papers: analytics.papers,
      traffic: analytics.traffic,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getChangeBadge = (change: number) => {
    if (change > 0) {
      return (
        <Badge className="bg-green-500/10 text-green-500">
          <ArrowUp className="mr-1 h-3 w-3" />
          {change}%
        </Badge>
      );
    }
    if (change < 0) {
      return (
        <Badge className="bg-red-500/10 text-red-500">
          <ArrowDown className="mr-1 h-3 w-3" />
          {Math.abs(change)}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/10 text-gray-500">
        0%
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {error ? 'Analytics unavailable' : 'No analytics data available'}
            </h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              {error
                ? error
                : 'Analytics will be available once you have published content'}
            </p>
            <Button onClick={fetchAnalytics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track your blog performance</p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={fetchAnalytics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Total Views</span>
                <Eye className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-2xl font-bold">
                {formatNumber(analytics.overview.totalViews)}
              </div>
              {getChangeBadge(analytics.overview.viewsChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Unique Visitors</span>
                <Users className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-1 text-2xl font-bold">
                {formatNumber(analytics.overview.uniqueVisitors)}
              </div>
              {getChangeBadge(analytics.overview.visitorsChange)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Total Articles</span>
                <FileText className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.overview.totalArticles}
              </div>
              <p className="text-xs text-muted-foreground">Published content</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Total Papers</span>
                <BookOpen className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.overview.totalPapers}
              </div>
              <p className="text-xs text-muted-foreground">Academic publications</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.articles.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No article views yet
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.articles.map((article, index) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <h3 className="line-clamp-1 text-sm font-semibold">
                            {article.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatNumber(article.views)}
                          </div>
                          <div className="text-xs text-muted-foreground">views</div>
                        </div>
                        {getChangeBadge(article.change)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Papers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Top Papers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.papers.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No papers published yet
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.papers.map((paper, index) => (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <h3 className="line-clamp-1 text-sm font-semibold">
                            {paper.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatNumber(paper.citations)}
                          </div>
                          <div className="text-xs text-muted-foreground">citations</div>
                        </div>
                        {getChangeBadge(paper.change)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.referrers && analytics.referrers.length > 0 ? (
                <div className="space-y-3">
                  {analytics.referrers.map((ref) => (
                    <div key={ref.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ref.name}</span>
                      <span className="font-semibold">{ref.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No referrers yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.geo?.countries && analytics.geo.countries.length > 0 ? (
                <div className="space-y-3">
                  {analytics.geo.countries.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No country data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Regions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.geo?.regions && analytics.geo.regions.length > 0 ? (
                <div className="space-y-3">
                  {analytics.geo.regions.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No region data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Cities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.geo?.cities && analytics.geo.cities.length > 0 ? (
                <div className="space-y-3">
                  {analytics.geo.cities.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No city data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Traffic Chart */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Traffic Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.traffic.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No traffic data available
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.traffic.map((day) => (
                  <div key={day.date} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {formatNumber(day.views)} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {formatNumber(day.visitors)} visitors
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute h-full bg-primary transition-all"
                        style={{
                          width: `${
                            (day.views /
                              Math.max(...analytics.traffic.map((t) => t.views))) *
                            100
                                                   }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
