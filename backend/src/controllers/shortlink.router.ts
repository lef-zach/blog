import { Router } from 'express';
import { shortlinkController } from './shortlink.controller';

const router = Router();

router.get('/:code', shortlinkController.redirectShortLink);

export { router as shortlinkRouter };
