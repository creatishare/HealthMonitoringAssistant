import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 公开接口
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/verification-code', authController.sendVerificationCode);
router.post('/reset-password', authController.resetPassword);

// 需要认证的接口
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
