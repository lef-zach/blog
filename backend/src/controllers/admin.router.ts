import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adminController } from './admin.controller';

const router = Router();

// All admin routes require authentication
// All admin routes require authentication and ADMIN role
router.use(authenticate, (req: any, res, next) => {
    const authReq = req as AuthRequest;
    if (authReq.user?.role !== 'ADMIN') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
        return;
    }
    next();
});

// Stats
router.get('/stats', adminController.getStats);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Users
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users', adminController.createUser);

export { router as adminRouter };
