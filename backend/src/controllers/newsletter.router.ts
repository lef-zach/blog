import { Router } from 'express';
import { newsletterController } from './newsletter.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';

const router = Router();

// Public: Subscribe
// Public: Subscribe
router.post('/subscribe', newsletterController.subscribe);
router.get('/unsubscribe/:id', newsletterController.unsubscribe);

// Admin: Get Subscribers
router.get(
    '/subscribers',
    authenticate,
    authorize('ADMIN'),
    newsletterController.getSubscribers
);

export const newsletterRouter = router;
