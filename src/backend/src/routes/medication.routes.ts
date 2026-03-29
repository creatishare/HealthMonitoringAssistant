import { Router } from 'express';
import * as medicationController from '../controllers/medication.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 用药管理
router.get('/', authenticate, medicationController.getMedications);
router.post('/', authenticate, medicationController.createMedication);
router.put('/:id', authenticate, medicationController.updateMedication);
router.delete('/:id', authenticate, medicationController.deleteMedication);
router.post('/:id/pause', authenticate, medicationController.pauseMedication);
router.post('/:id/resume', authenticate, medicationController.resumeMedication);

// 今日用药
router.get('/today', authenticate, medicationController.getTodayMedications);

// 服药记录
router.get('/logs', authenticate, medicationController.getMedicationLogs);
router.post('/logs', authenticate, medicationController.recordMedication);

// 用药统计
router.get('/statistics', authenticate, medicationController.getMedicationStatistics);

export default router;
