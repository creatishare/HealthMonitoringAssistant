import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 需要认证的接口
router.get('/', authenticate, dashboardController.getDashboard);

export default router;
