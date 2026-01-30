export const API_ROUTES = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  ARTICLES: {
    LIST: '/articles',
    BY_SLUG: (slug: string) => `/articles/${slug}`,
    BY_ID: (id: string) => `/articles/${id}`,
    PUBLISH: (id: string) => `/articles/${id}/publish`,
  },
  PAPERS: {
    LIST: '/papers',
    SYNC: '/papers/sync',
    EXPORT_BIBTEX: '/papers/export/bibtex',
    IMPORT_BIBTEX: '/papers/import/bibtex',
  },
} as const;

export const ARTICLE_STATUS = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export const PAPER_TYPE = {
  JOURNAL: 'JOURNAL',
  CONFERENCE: 'CONFERENCE',
  PREPRINT: 'PREPRINT',
  THESIS: 'THESIS',
  BOOK: 'BOOK',
} as const;

export const USER_ROLE = {
  PUBLIC: 'PUBLIC',
  AUTHOR: 'AUTHOR',
  ADMIN: 'ADMIN',
} as const;
