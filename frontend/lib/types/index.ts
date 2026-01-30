export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'PUBLIC' | 'AUTHOR' | 'ADMIN';
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
  publicEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  status: 'DRAFT' | 'REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string;
  scheduledAt?: string;
  visibility: 'public' | 'private' | 'password';
  password?: string;
  metaDescription?: string;
  metaKeywords?: string;
  readingTime?: number;
  wordCount?: number;
  authorId: string;
  author: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  venue?: string;
  year: number;
  citations: number;
  abstract?: string;
  doi?: string;
  type: 'JOURNAL' | 'CONFERENCE' | 'PREPRINT' | 'THESIS' | 'BOOK';
  pdfUrl?: string;
  bibtex?: string;
  userId: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedResponse<T> {
  data: {
    articles?: T[];
    papers?: T[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
