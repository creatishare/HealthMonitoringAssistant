import { Router } from 'express';
import * as drugConcentrationController from '../controllers/drug-concentration.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// 需要认证的接口
router.get('/', authenticate, drugConcentrationController.getDrugConcentrations);
router.get('/trends', authenticate, drugConcentrationController.getDrugConcentrationTrends);
router.post('/', authenticate, drugConcentrationController.createDrugConcentration);

export default router;
