import { z } from 'zod';

const imageSourceSchema = z.string().optional().nullable().refine((value) => {
  if (!value) return true;
  if (value.startsWith('data:image/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'Invalid image source' });

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  featuredImage: imageSourceSchema,
  featuredImageLayout: z.enum(['BANNER', 'PORTRAIT']).optional(),
  featuredImageSize: z.enum(['S', 'M', 'B']).optional(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().optional(),
  featuredImage: imageSourceSchema,
  featuredImageLayout: z.enum(['BANNER', 'PORTRAIT']).optional(),
  featuredImageSize: z.enum(['S', 'M', 'B']).optional(),
  status: z.enum(['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'PASSWORD']).optional(),
  password: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
});

export const publishArticleSchema = z.object({
  status: z.enum(['PUBLISHED', 'SCHEDULED']),
  scheduledAt: z.string().datetime().optional(),
});

export const queryArticlesSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  author: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.string().optional(),
});
