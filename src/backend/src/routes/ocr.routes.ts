import { Router } from 'express';
import * as ocrController from '../controllers/ocr.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// 需要认证的接口
router.post('/upload', authenticate, upload.single('image'), ocrController.uploadImage);
router.post('/recognize', authenticate, ocrController.recognizeImage);
router.post('/confirm', authenticate, ocrController.confirmOCRResult);
router.get('/:id', authenticate, ocrController.getOCRResult);

export default router;
