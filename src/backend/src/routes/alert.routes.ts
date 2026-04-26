import { Router } from 'express';
import * as alertController from '../controllers/alert.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 需要认证的接口
router.get('/', authenticate, alertController.getAlerts);
router.get('/unread-count', authenticate, alertController.getUnreadCount);
router.put('/read-all', authenticate, alertController.markAllAsRead);
router.delete('/read', authenticate, alertController.deleteReadAlerts);
router.put('/:id/read', authenticate, alertController.markAsRead);
router.delete('/:id', authenticate, alertController.deleteAlert);

export default router;
