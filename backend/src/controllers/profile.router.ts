import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { profileController } from './profile.controller';

const router = Router();

// Get public settings (no auth required)
router.get('/public', profileController.getPublicSettings);

// All other profile routes require authentication
router.use(authenticate);

// Get profile
router.get('/', profileController.getProfile);

// Update profile
router.put('/', profileController.updateProfile);

export { router as profileRouter };
