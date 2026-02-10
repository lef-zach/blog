import { z } from 'zod';

// API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Error response schema
const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
});

// Auth response schema
const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    username: z.string().optional().nullable(),
    name: z.string(),
    role: z.enum(['PUBLIC', 'AUTHOR', 'ADMIN']),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
});

// Article schema
const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  shortCode: z.string().optional().nullable(),
  excerpt: z.string(),
  content: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  readingTime: z.number().optional(),
  tags: z.array(z.union([z.string(), z.object({ name: z.string() })])), // Can be strings or objects
  category: z.union([z.string(), z.object({ name: z.string() })]).nullable(), // Can be string or object
  featuredImage: z.string().nullable().optional(),
  featuredImageLayout: z.enum(['BANNER', 'PORTRAIT']).optional().nullable(),
  featuredImageSize: z.enum(['S', 'M', 'B']).optional().nullable(),
  metaDescription: z.string().nullable(),
  views: z.number().optional(),
  shortClicks: z.number().optional(),
  shortLastHitAt: z.string().optional().nullable(),
  author: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    avatar: z.string().nullable().optional(),
  }).optional(),
});

// Paper schema
const paperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.union([z.string(), z.array(z.string())]),
  venue: z.string(),
  year: z.number(),
  citations: z.number(),
  abstract: z.string().nullable(),
  doi: z.string().nullable(),
  url: z.string().nullable(),
  pdfUrl: z.string().nullable().optional(),
  type: z.enum(['JOURNAL', 'CONFERENCE', 'PREPRINT', 'OTHER']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// User schema
const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().optional().nullable(),
  name: z.string(),
  role: z.enum(['PUBLIC', 'AUTHOR', 'ADMIN']),
  scholarUrl: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Settings schema
const settingsSchema = z.object({
  siteName: z.string(),
  siteDescription: z.string(),
  siteUrl: z.string(),
  siteUrls: z.array(z.string()).optional().nullable(),
  contactEmail: z.string(),
  socialLinks: z.object({
    github: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    googleScholar: z.string().optional().nullable(),
    orcid: z.string().optional().nullable(),
  }),
  seo: z.object({
    metaTitle: z.string(),
    metaDescription: z.string(),
    ogImage: z.string().optional(),
  }),
  features: z.object({
    enableComments: z.boolean(),
    enableAnalytics: z.boolean(),
    enableNewsletter: z.boolean(),
    enableRegistration: z.boolean().optional(),
  }),
  aboutArticleId: z.string().optional(),
});

// Analytics schema
const analyticsSchema = z.object({
  overview: z.object({
    totalViews: z.number(),
    uniqueVisitors: z.number(),
    totalArticles: z.number(),
    totalPapers: z.number(),
    viewsChange: z.number(),
    visitorsChange: z.number(),
  }),
  articles: z.array(z.object({
    id: z.string(),
    title: z.string(),
    views: z.number(),
    change: z.number(),
  })),
  papers: z.array(z.object({
    id: z.string(),
    title: z.string(),
    citations: z.number(),
    change: z.number(),
  })),
  traffic: z.array(z.object({
    date: z.string(),
    views: z.number(),
    visitors: z.number(),
  })),
  geo: z.object({
    countries: z.array(z.object({ name: z.string(), count: z.number() })),
    regions: z.array(z.object({ name: z.string(), count: z.number() })),
    cities: z.array(z.object({ name: z.string(), count: z.number() })),
  }).optional(),
  referrers: z.array(z.object({ name: z.string(), count: z.number() })).optional(),
});

const backupMetadataSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  filename: z.string(),
  encrypted: z.boolean(),
  includes: z.object({
    db: z.boolean(),
    uploads: z.boolean(),
    env: z.boolean(),
    certs: z.boolean(),
  }),
  size: z.number(),
  s3Key: z.string().optional(),
});

const backupJobSchema = z.object({
  id: z.string(),
  type: z.enum(['backup', 'restore']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  createdAt: z.string(),
  updatedAt: z.string(),
  message: z.string().optional(),
  result: z.any().optional(),
});

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshDisabled = false;
  private refreshDisabledUntil: number | null = null;
  // No refreshToken stored in client anymore (HttpOnly Cookie)

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Tokens managed in memory, initialized via refresh on app load
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem('refreshDisabledUntil');
      if (stored) {
        const until = Number(stored);
        if (!Number.isNaN(until) && Date.now() < until) {
          this.refreshDisabled = true;
          this.refreshDisabledUntil = until;
        } else {
          window.sessionStorage.removeItem('refreshDisabledUntil');
        }
      }
    }
  }

  private saveTokens(accessToken: string) {
    this.accessToken = accessToken;
    this.clearRefreshDisabled();
  }

  private clearTokens() {
    this.accessToken = null;
  }

  private disableRefresh(seconds?: number) {
    this.refreshDisabled = true;
    if (typeof window !== 'undefined') {
      if (typeof seconds === 'number') {
        const until = Date.now() + seconds * 1000;
        this.refreshDisabledUntil = until;
        window.sessionStorage.setItem('refreshDisabledUntil', String(until));
      } else {
        window.sessionStorage.removeItem('refreshDisabledUntil');
      }
    }
  }

  private clearRefreshDisabled() {
    this.refreshDisabled = false;
    this.refreshDisabledUntil = null;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('refreshDisabledUntil');
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T }> {
    // If a refresh is happening, wait for it before trying any request.
    // This prevents race conditions where requests fire before session restoration is complete.
    if (this.refreshPromise) {
      try { await this.refreshPromise; } catch (e) { /* Let the request proceed and fail if needed */ }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Ensure credentials are sent (for cookies)
    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include' as RequestCredentials,
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      if (response.status === 401) {
        const isAuthMe = endpoint.includes('/auth/me');
        const isAuthLogout = endpoint.includes('/auth/logout');
        // If 401 and we have an accessToken, it might be expired. Try refresh.
        // Even if we don't have accessToken, we might have a valid cookie?
        // Let's try refresh once.
        try {
          // Avoid infinite loop if refresh itself fails
          if (endpoint.includes('/auth/refresh') || isAuthMe || isAuthLogout || this.refreshDisabled) {
            throw new Error('Refresh failed');
          }

          await this.refreshAccessToken();
          // Retry original request with new token
          return this.request<T>(endpoint, options);

        } catch (error) {
          this.clearTokens();
          this.disableRefresh();
          if (!isAuthMe && !isAuthLogout && typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path.startsWith('/admin') && !path.includes('/login')) {
              window.location.href = '/login';
            }
          }
          throw new ApiError('UNAUTHORIZED', 'Session expired');
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.code || 'UNKNOWN_ERROR',
        errorData.error?.message || 'An error occurred',
        errorData.error?.details
      );
    }

    const data = await response.json();
    return data;
  }

  private refreshPromise: Promise<void> | null = null;

  public async refreshAccessToken() {
    if (this.refreshDisabled) {
      throw new ApiError('REFRESH_DISABLED', 'Refresh is disabled');
    }
    // If a refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        // Call refresh endpoint - Token is in Cookie
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Send Cookie
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            this.disableRefresh(60);
            throw new ApiError('REFRESH_UNAUTHORIZED', 'No refresh token available');
          }
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const retrySeconds = retryAfter ? Number(retryAfter) : 15 * 60;
            if (!Number.isNaN(retrySeconds)) {
              this.disableRefresh(retrySeconds);
            } else {
              this.disableRefresh();
            }
            throw new ApiError('RATE_LIMITED', 'Too many requests, try again later');
          }
          // If 409 (Conflict), it means someone else refreshed it. 
          // We can assume success for this client instance context if needed, 
          // but technically we don't have the new access token in body.
          // However, browser usually updates cookie.
          // But we need the accessToken string for memory.
          // If 409, we probably should have "joined" the other request. 
          // But since we use a promise lock, 409 shouldn't happen from *this* client.
          // It would only happen if another Tab does it.
          // If another Tab does it, our cookie might be new, but we don't have accessToken.
          // We should try to get the accessToken?
          // Actually, the server returns 409 only if it fails to delete.
          // But it likely didn't return the new token.
          throw new ApiError('REFRESH_FAILED', 'Failed to refresh token');
        }

        const data = await response.json();
        if (data.data?.accessToken) {
          this.saveTokens(data.data.accessToken);
        } else {
          throw new Error('Invalid refresh response');
        }
      } catch (error) {
        this.disableRefresh();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  public isLoggedIn(): boolean {
    return !!this.accessToken;
  }

  // Auth methods
  async register(data: {
    name: string;
    email: string;
    password: string;
    username?: string;
  }) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async createUser(data: any) {
    const response = await this.request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async login({ email, password }: { email: string; password: string }) {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // authResponseSchema expectation might fail if we stripped refreshToken?
    // Let's just trust data.data.accessToken
    const accessToken = response.data.accessToken;
    this.saveTokens(accessToken);
    return response;
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ data: any }> {
    const response = await this.request<any>('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearTokens();
      this.disableRefresh();
    }
  }

  async getMe() {
    const response = await this.request('/auth/me');
    return response;
  }

  // Article methods
  async getArticles(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    tag?: string;
    category?: string;
    search?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);

    const response = await this.request<{
      articles: Article[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/articles?${queryParams.toString()}`);
    return response;
  }

  async getArticleBySlug(slug: string) {
    const response = await this.request<Article>(`/articles/${slug}`);
    return response;
  }

  async createArticle(data: any) {
    const response = await this.request<Article>('/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateArticle(id: string, data: any) {
    const response = await this.request<Article>(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteArticle(id: string) {
    const response = await this.request<void>(`/articles/${id}`, {
      method: 'DELETE',
    });
    return response;
  }

  async publishArticle(id: string) {
    const response = await this.request<Article>(`/articles/${id}/publish`, {
      method: 'PUT',
    });
    return response;
  }

  // Paper methods
  async getPapers(params?: {
    page?: number;
    limit?: number;
    offset?: number;
    type?: string;
    year?: number;
    userId?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.year) queryParams.append('year', params.year.toString());
    if (params?.userId) queryParams.append('userId', params.userId);

    const response = await this.request<{
      papers: Paper[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
      scholarTotalCitations?: number | null;
    }>(`/papers?${queryParams.toString()}`);
    return response;
  }

  async getPaperMetrics() {
    const response = await this.request<{
      totalPapers: number;
      totalCitations: number;
      hIndex: number;
      i10Index: number;
      averageCitations: number;
    }>('/papers/metrics');
    return response;
  }

  // Articles
  async getArticle(slugOrId: string) {
    const response = await this.request<Article>(`/articles/${slugOrId}`);
    return response;
  }


  async getPaper(id: string) {
    const response = await this.request<Paper>(`/papers/${id}`);
    return response;
  }

  async createPaper(data: any) {
    const response = await this.request<Paper>('/papers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updatePaper(id: string, data: any) {
    const response = await this.request<Paper>(`/papers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deletePaper(id: string) {
    const response = await this.request<void>(`/papers/${id}`, {
      method: 'DELETE',
    });
    return response;
  }

  async syncPapers(scholarUrl: string) {
    const response = await this.request<Paper[]>('/papers/sync', {
      method: 'POST',
      body: JSON.stringify({ scholarUrl }),
    });
    return response;
  }

  async exportPapersBibtex() {
    const response = await this.request<string>('/papers/export/bibtex');
    return response;
  }

  async importPapersBibtex(bibtex: string) {
    const response = await this.request<Paper[]>('/papers/import/bibtex', {
      method: 'POST',
      body: JSON.stringify({ bibtex }),
    });
    return response;
  }

  // User methods
  async getUsers(params?: {
    limit?: number;
    offset?: number;
    role?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.role) queryParams.append('role', params.role);

    const response = await this.request<User[]>(`/admin/users?${queryParams.toString()}`);
    return response;
  }

  async getUser(id: string) {
    const response = await this.request<User>(`/admin/users/${id}`);
    return response;
  }

  async updateUser(id: string, data: any) {
    const response = await this.request<User>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteUser(id: string) {
    const response = await this.request<void>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
    return response;
  }

  // Settings methods
  async getSettings() {
    const response = await this.request<Settings>('/profile');
    return response;
  }

  async getPublicSettings() {
    const response = await this.request<{ id: string } & Settings>('/profile/public');
    return response;
  }

  async updateSettings(data: any) {
    const response = await this.request<Settings>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  }

  // Analytics methods
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const response = await this.request<Analytics>(`/admin/analytics?${queryParams.toString()}`);
    return response;
  }

  // Admin stats
  async getAdminStats() {
    const response = await this.request<{
      totalUsers: number;
      totalArticles: number;
      totalPapers: number;
      totalViews: number;
    }>('/admin/stats');
    return response;
  }

  async getShortLinkStats(articleId: string) {
    const response = await this.request<{
      shortCode?: string | null;
      shortClicks?: number;
      shortLastHitAt?: string | null;
      recentClicks: number;
      topReferrers: { domain: string; count: number }[];
      retentionDays: number;
    }>(`/admin/articles/${articleId}/shortlinks`);
    return response;
  }

  // Backups
  async listBackups() {
    const response = await this.request<z.infer<typeof backupMetadataSchema>[]>('/admin/backups');
    return response;
  }

  async createBackup(options: {
    includeDb?: boolean;
    includeUploads?: boolean;
    includeEnv?: boolean;
    includeCerts?: boolean;
    encrypt?: boolean;
    passphrase?: string;
  }) {
    const response = await this.request<{ jobId: string }>('/admin/backups', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response;
  }

  async getBackupJob(jobId: string) {
    const response = await this.request<z.infer<typeof backupJobSchema>>(`/admin/backups/jobs/${jobId}`);
    return response;
  }

  async restoreBackup(backupId: string, options: {
    mode?: 'staged' | 'in-place';
    restoreDb?: boolean;
    restoreUploads?: boolean;
    restoreEnv?: boolean;
    restoreCerts?: boolean;
    passphrase?: string;
  }) {
    const response = await this.request<{ jobId: string }>(`/admin/backups/${backupId}/restore`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return response;
  }

  async deleteBackup(backupId: string) {
    const response = await this.request<{ deleted: boolean }>(`/admin/backups/${backupId}`, {
      method: 'DELETE',
    });
    return response;
  }

  // Newsletter
  async subscribe(email: string) {
    const response = await this.request<{ message: string }>('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  async getSubscribers() {
    return this.request<{ id: string; email: string; createdAt: string; active: boolean }[]>('/newsletter/subscribers');
  }

  async unsubscribe(id: string) {
    return this.request<{ message: string }>(`/newsletter/unsubscribe/${id}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiError };
export type Article = z.infer<typeof articleSchema>;
export type Paper = z.infer<typeof paperSchema>;
export type User = z.infer<typeof userSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export type BackupMetadata = z.infer<typeof backupMetadataSchema>;
export type BackupJob = z.infer<typeof backupJobSchema>;
