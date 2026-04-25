import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/follow-up', authenticate, reportController.downloadFollowUpReport);

export default router;
