import { prisma } from '../config/database';
import { AppError } from '../middleware/error';
import { redis } from '../config/redis';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class PaperService {
  private static readonly SCHOLAR_SYNC_INTERVAL_SECONDS = 24 * 60 * 60;
  private static readonly SCHOLAR_PAGE_SIZE = 100;
  private static readonly SCHOLAR_MAX_PAGES = 20;
  private static readonly SCHOLAR_TOTAL_CITATIONS_TTL_SECONDS = 24 * 60 * 60;

  async createPaper(data: any, userId: string) {
    const paper = await prisma.paper.create({
      data: {
        title: data.title,
        authors: data.authors,
        venue: data.venue,
        year: data.year,
        citations: data.citations || 0,
        abstract: data.abstract,
        doi: data.doi,
        type: data.type || 'JOURNAL',
        pdfUrl: data.pdfUrl,
        bibtex: data.bibtex,
        userId,
      },
    });

    // Clear cache
    await redis.del('papers:*');

    return paper;
  }

  async getPapers(userId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.year) {
      where.year = parseInt(query.year);
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { authors: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        skip,
        take: limit,
        orderBy: { year: 'desc' },
      }),
      prisma.paper.count({ where }),
    ]);

    return {
      papers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPaperById(id: string, userId: string) {
    const paper = await prisma.paper.findFirst({
      where: { id, userId },
    });

    if (!paper) {
      throw new AppError(404, 'PAPER_NOT_FOUND', 'Paper not found');
    }

    return paper;
  }

  async updatePaper(id: string, data: any, userId: string) {
    const paper = await prisma.paper.findFirst({
      where: { id, userId },
    });

    if (!paper) {
      throw new AppError(404, 'PAPER_NOT_FOUND', 'Paper not found');
    }

    const updated = await prisma.paper.update({
      where: { id },
      data,
    });

    // Clear cache
    await redis.del('papers:*');

    return updated;
  }

  async deletePaper(id: string, userId: string) {
    const paper = await prisma.paper.findFirst({
      where: { id, userId },
    });

    if (!paper) {
      throw new AppError(404, 'PAPER_NOT_FOUND', 'Paper not found');
    }

    await prisma.paper.delete({ where: { id } });

    // Clear cache
    await redis.del('papers:*');

    return { message: 'Paper deleted successfully' };
  }

  async syncFromScholar(scholarUrl: string | undefined, userId: string) {
    let targetUrl: string | null = scholarUrl || null;

    if (scholarUrl !== undefined) {
      if (scholarUrl && scholarUrl.trim() !== '') {
        // If valid URL provided, force update
        await prisma.user.update({
          where: { id: userId },
          data: { scholarUrl },
        });
        targetUrl = scholarUrl;
      } else if (scholarUrl === null) {
        // Explicitly clearing
        await prisma.user.update({
          where: { id: userId },
          data: { scholarUrl: null },
        });
        targetUrl = null;
      }
    }

    // If no URL provided in this request, fetch stored one
    if (!targetUrl) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { scholarUrl: true },
      });
      if (!user?.scholarUrl) {
        const existingPaperWithScholarLink = await prisma.paper.findFirst({
          where: {
            userId,
            url: {
              contains: 'scholar.google.com/citations?',
            },
          },
          select: { url: true },
          orderBy: { updatedAt: 'desc' },
        });

        const inferredMatch = existingPaperWithScholarLink?.url?.match(/user=([^&]+)/);
        if (inferredMatch?.[1]) {
          targetUrl = `https://scholar.google.com/citations?user=${inferredMatch[1]}`;
          await prisma.user.update({
            where: { id: userId },
            data: { scholarUrl: targetUrl },
          });
        } else {
          throw new AppError(400, 'NO_SCHOLAR_URL', 'No Google Scholar URL provided or stored');
        }
      } else {
        targetUrl = user.scholarUrl;
      }
    }

    if (!targetUrl) throw new AppError(400, 'NO_SCHOLAR_URL', 'Invalid URL');

    const userIdMatch = targetUrl.match(/user=([^&]+)/) || targetUrl.match(/user\/([^\/?]+)/);
    if (!userIdMatch) {
      throw new AppError(400, 'INVALID_URL', 'Invalid Google Scholar URL');
    }

    const scholarId = userIdMatch[1];
    const userAgent = process.env.GOOGLE_SCHOLAR_USER_AGENT || 'AcademicBlogSync/1.0';

    try {
      const papers: any[] = [];
      let profileTotalCitations: number | null = null;

      for (let page = 0; page < PaperService.SCHOLAR_MAX_PAGES; page++) {
        const cstart = page * PaperService.SCHOLAR_PAGE_SIZE;
        const profileResponse = await axios.get(
          `https://scholar.google.com/citations?user=${scholarId}&pagesize=${PaperService.SCHOLAR_PAGE_SIZE}&cstart=${cstart}`,
          {
            headers: { 'User-Agent': userAgent },
            timeout: 10000,
          }
        );

        const $ = cheerio.load(profileResponse.data);
        if (page === 0) {
          profileTotalCitations = this.extractProfileTotalCitations($);
        }
        const rows = $('.gsc_a_tr');

        if (rows.length === 0) {
          break;
        }

        rows.each((_, element) => {
          const $row = $(element);
          const titleElement = $row.find('.gsc_a_at');
          const title = titleElement.text().trim();
          const relativeUrl = titleElement.attr('data-href') || titleElement.attr('href');
          const url = relativeUrl ? `https://scholar.google.com${relativeUrl}` : null;

          const authorsAndVenue = $row.find('.gs_gray').first().text().trim();
          const venue = $row.find('.gs_gray').last().text().trim();
          const yearText = $row.find('.gsc_a_y').text().trim();
          const yearFromCell = Number.parseInt(yearText, 10);
          const venueYear = this.extractYearFromText(venue);
          const year = Number.isFinite(yearFromCell) ? yearFromCell : venueYear;
          const citationsText = $row.find('.gsc_a_c').text().trim();
          const citations = Number(citationsText.replace(/[^\d]/g, '')) || 0;

          if (title) {
            papers.push({
              title,
              authors: authorsAndVenue,
              venue,
              year,
              citations,
              type: this.inferType(venue),
              url,
            });
          }
        });

        if (rows.length < PaperService.SCHOLAR_PAGE_SIZE) {
          break;
        }
      }

      const existingPapers = await prisma.paper.findMany({
        where: { userId },
        select: { id: true, title: true, year: true },
      });

      const existingByTitleYear = new Map<string, string>();
      const existingByTitle = new Map<string, string>();

      for (const existing of existingPapers) {
        const normalizedTitle = this.normalizeTitle(existing.title);
        existingByTitleYear.set(`${normalizedTitle}|${existing.year}`, existing.id);
        if (!existingByTitle.has(normalizedTitle)) {
          existingByTitle.set(normalizedTitle, existing.id);
        }
      }

      const results = [];
      let skippedWithoutYear = 0;

      for (const paper of papers) {
        const normalizedTitle = this.normalizeTitle(paper.title);
        let existingId: string | undefined;

        if (paper.year && paper.year > 0) {
          existingId = existingByTitleYear.get(`${normalizedTitle}|${paper.year}`);
        }

        if (!existingId && (!paper.year || paper.year <= 0)) {
          existingId = existingByTitle.get(normalizedTitle);
        }

        if (existingId) {
          const updated = await prisma.paper.update({
            where: { id: existingId },
            data: {
              citations: paper.citations,
              venue: paper.venue,
              url: paper.url,
            },
          });
          results.push({ action: 'updated', paper: updated });
        } else if (paper.year && paper.year > 0) {
          const created = await prisma.paper.create({
            data: {
              ...paper,
              userId,
            },
          });
          existingByTitleYear.set(`${normalizedTitle}|${paper.year}`, created.id);
          if (!existingByTitle.has(normalizedTitle)) {
            existingByTitle.set(normalizedTitle, created.id);
          }
          results.push({ action: 'created', paper: created });
        } else {
          skippedWithoutYear += 1;
        }
      }

      const summedCitations = papers.reduce((sum, p) => sum + (p.citations || 0), 0);
      const scholarTotalCitations = profileTotalCitations ?? summedCitations;

      await redis.del('papers:*');
      await redis.set(
        `papers:scholar:last-sync:${userId}`,
        String(Date.now()),
        'EX',
        PaperService.SCHOLAR_SYNC_INTERVAL_SECONDS
      );
      await redis.set(
        `papers:scholar:total-citations:${userId}`,
        String(scholarTotalCitations),
        'EX',
        PaperService.SCHOLAR_TOTAL_CITATIONS_TTL_SECONDS
      );

      return {
        total: papers.length,
        scholarTotalCitations,
        created: results.filter(r => r.action === 'created').length,
        updated: results.filter(r => r.action === 'updated').length,
        skippedWithoutYear,
        papers: results,
      };
    } catch (error: any) {
      console.error('Google Scholar Sync Error:', error.message);
      if (error.response?.status === 429) {
        throw new AppError(429, 'RATE_LIMITED', 'Rate limit exceeded');
      }
      throw new AppError(500, 'SYNC_FAILED', 'Failed to scrape: ' + error.message);
    }
  }

  async importBibtex(bibtex: string, userId: string) {
    const papers = this.parseBibtex(bibtex);
    const results = [];

    for (const paper of papers) {
      const existing = await prisma.paper.findFirst({
        where: {
          userId,
          title: paper.title,
          year: paper.year,
        },
      });

      if (!existing) {
        const created = await prisma.paper.create({
          data: {
            ...paper,
            userId,
          },
        });
        results.push({ action: 'created', paper: created });
      }
    }

    // Clear cache
    await redis.del('papers:*');

    return {
      total: papers.length,
      imported: results.length,
      papers: results,
    };
  }

  async exportBibtex(userId: string) {
    const papers = await prisma.paper.findMany({
      where: { userId },
      orderBy: { year: 'desc' },
    });

    let bibtex = '';
    for (const paper of papers) {
      const key = `${paper.authors.split(',')[0].split(' ').pop()}${paper.year}${paper.title.split(' ')[0]}`;
      bibtex += `@${paper.type.toLowerCase()}{${key},\n`;
      bibtex += `  title={${paper.title}},\n`;
      bibtex += `  author={${paper.authors}},\n`;
      if (paper.venue) bibtex += `  journal={${paper.venue}},\n`;
      bibtex += `  year={${paper.year}},\n`;
      if (paper.doi) bibtex += `  doi={${paper.doi}},\n`;
      bibtex += `}\n\n`;
    }

    return bibtex;
  }

  async getMetrics(userId: string) {
    const papers = await prisma.paper.findMany({ where: { userId } });

    const totalCitations = papers.reduce((sum, p) => sum + p.citations, 0);
    const sortedByCitations = papers.sort((a, b) => b.citations - a.citations);

    // Calculate h-index
    let hIndex = 0;
    for (let i = 0; i < sortedByCitations.length; i++) {
      if (sortedByCitations[i].citations >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }

    // Calculate i10-index
    const i10Index = sortedByCitations.filter(p => p.citations >= 10).length;

    return {
      totalPapers: papers.length,
      totalCitations,
      hIndex,
      i10Index,
      averageCitations: papers.length > 0 ? totalCitations / papers.length : 0,
    };
  }

  private inferType(venue: string): string {
    const lower = venue.toLowerCase();
    if (lower.includes('conference') || lower.includes('proc.') || lower.includes('symposium')) {
      return 'CONFERENCE';
    }
    if (lower.includes('arxiv') || lower.includes('preprint')) {
      return 'PREPRINT';
    }
    if (lower.includes('phd') || lower.includes('thesis') || lower.includes('dissertation')) {
      return 'THESIS';
    }
    return 'JOURNAL';
  }

  private extractYearFromText(text: string): number | null {
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? Number.parseInt(match[0], 10) : null;
  }

  private extractProfileTotalCitations($: cheerio.CheerioAPI): number | null {
    const firstRow = $('#gsc_rsb_st tbody tr').first();
    if (firstRow.length === 0) return null;

    const totalText = firstRow.find('.gsc_rsb_std').first().text().trim();
    if (!totalText) return null;

    const parsed = Number(totalText.replace(/[^\d]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseBibtex(bibtex: string): any[] {
    const papers: any[] = [];
    const entries = bibtex.split(/@\w+\{/).filter(e => e.trim());

    for (const entry of entries) {
      const paper: any = {};
      const lines = entry.split('\n');

      for (const line of lines) {
        const match = line.match(/\s*(\w+)\s*=\s*\{([^}]*)\}/);
        if (match) {
          const key = match[1].toLowerCase();
          const value = match[2];

          switch (key) {
            case 'title':
              paper.title = value;
              break;
            case 'author':
              paper.authors = value;
              break;
            case 'journal':
            case 'booktitle':
              paper.venue = value;
              break;
            case 'year':
              paper.year = parseInt(value);
              break;
            case 'doi':
              paper.doi = value;
              break;
            case 'abstract':
              paper.abstract = value;
              break;
          }
        }
      }

      if (paper.title && paper.year) {
        papers.push(paper);
      }
    }

    return papers;
  }
}

export default new PaperService();
