import { Router } from 'express';
import { Response, NextFunction } from 'express';
import paperService from '../services/paper.service';
import { createPaperSchema, updatePaperSchema, syncPapersSchema, importBibtexSchema } from '../validators/paper.validator';
import { AuthRequest } from '../middleware/auth';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { AppError } from '../middleware/error';

const router = Router();

export const createPaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createPaperSchema.parse(req.body);
    const paper = await paperService.createPaper(validatedData, req.user!.userId);
    res.status(201).json({ data: paper });
  } catch (error) {
    next(error);
  }
};

export const getPapers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Prioritize explicit userId (for public profile viewing), fall back to authenticated user
    const userId = (req.query.userId as string) || req.user?.userId;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'User ID is required'); // Will trigger token refresh
    }

    const result = await paperService.getPapers(userId, req.query);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const getPaperById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const paper = await paperService.getPaperById(id, req.user!.userId);
    res.json({ data: paper });
  } catch (error) {
    next(error);
  }
};

export const updatePaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = updatePaperSchema.parse(req.body);
    const paper = await paperService.updatePaper(id, validatedData, req.user!.userId);
    res.json({ data: paper });
  } catch (error) {
    next(error);
  }
};

export const deletePaper = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await paperService.deletePaper(id, req.user!.userId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const syncPapers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = syncPapersSchema.parse(req.body);
    const result = await paperService.syncFromScholar(validatedData.scholarUrl, req.user!.userId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const importBibtex = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = importBibtexSchema.parse(req.body);
    const result = await paperService.importBibtex(validatedData.bibtex, req.user!.userId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const exportBibtex = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bibtex = await paperService.exportBibtex(req.user!.userId);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=papers.bib');
    res.send(bibtex);
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const metrics = await paperService.getMetrics(req.user!.userId);
    res.json({ data: metrics });
  } catch (error) {
    next(error);
  }
};

// Route definitions
router.post('/', authenticate, createPaper);
router.get('/', optionalAuthenticate, getPapers);
router.get('/metrics', authenticate, getMetrics);
router.post('/sync', authenticate, syncPapers);
router.post('/import/bibtex', authenticate, importBibtex);
router.get('/export/bibtex', authenticate, exportBibtex);
router.get('/:id', authenticate, getPaperById);
router.put('/:id', authenticate, updatePaper);
router.delete('/:id', authenticate, deletePaper);

export { router as paperRouter };
