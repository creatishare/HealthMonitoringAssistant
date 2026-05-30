import { Request, Response, NextFunction } from 'express';
import * as reportService from '../services/report.service';
import { ApiError } from '../middleware/error.middleware';
import { getAppDateWindow } from '../utils/app-date';

function getDefaultDateRange() {
  return getAppDateWindow(30);
}

export async function downloadFollowUpReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError('未登录', 401, '01007');
    }

    const defaults = getDefaultDateRange();
    const startDate = (req.query.startDate as string) || defaults.startDate;
    const endDate = (req.query.endDate as string) || defaults.endDate;
    const pdf = await reportService.generateFollowUpReportPdf(userId, startDate, endDate);
    const filename = `health-report-${startDate}-${endDate}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}
