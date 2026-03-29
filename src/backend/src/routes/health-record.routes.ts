import { Router } from 'express';
import * as healthRecordController from '../controllers/health-record.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 需要认证的接口
router.get('/', authenticate, healthRecordController.getHealthRecords);
router.get('/trends', authenticate, healthRecordController.getTrends);
router.get('/:id', authenticate, healthRecordController.getHealthRecordById);
router.post('/', authenticate, healthRecordController.createHealthRecord);
router.put('/:id', authenticate, healthRecordController.updateHealthRecord);
router.delete('/:id', authenticate, healthRecordController.deleteHealthRecord);

export default router;
