import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, verificationCodeLimiter } from '../middleware/security.middleware';

const router = Router();

// 公开接口
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/verification-code', verificationCodeLimiter, authController.sendVerificationCode);
router.post('/reset-password', authLimiter, authController.resetPassword);

// 需要认证的接口
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
