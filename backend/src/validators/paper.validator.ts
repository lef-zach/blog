import { z } from 'zod';

export const createPaperSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.string().min(1, 'Authors are required'),
  venue: z.string().optional(),
  year: z.number().int().min(1900).max(2100),
  citations: z.number().int().min(0).default(0),
  abstract: z.string().optional(),
  doi: z.string().optional(),
  type: z.enum(['JOURNAL', 'CONFERENCE', 'PREPRINT', 'THESIS', 'BOOK']).default('JOURNAL'),
  pdfUrl: z.string().url().optional().nullable(),
  bibtex: z.string().optional(),
});

export const updatePaperSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  authors: z.string().min(1, 'Authors are required').optional(),
  venue: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  citations: z.number().int().min(0).optional(),
  abstract: z.string().optional(),
  doi: z.string().optional(),
  type: z.enum(['JOURNAL', 'CONFERENCE', 'PREPRINT', 'THESIS', 'BOOK']).optional(),
  pdfUrl: z.string().url().optional().nullable(),
  bibtex: z.string().optional(),
});

export const syncPapersSchema = z.object({
  scholarUrl: z.string().url('Invalid Google Scholar URL').optional(),
});

export const importBibtexSchema = z.object({
  bibtex: z.string().min(1, 'BibTeX content is required'),
});
