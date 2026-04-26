import PDFDocument from 'pdfkit';
import fs from 'fs';

import { ApiError } from '../middleware/error.middleware';
import { getAlerts } from './alert.service';
import { getHealthRecords, getRecentMetrics } from './health-record.service';
import { getTodayMedications } from './medication.service';
import { getUserProfile } from './user.service';
import logger from '../utils/logger';

interface ReportMetric {
  key: string;
  name: string;
  value: number;
  unit: string;
  date: string;
}

interface ReportAlert {
  id: string;
  level: string;
  message: string;
  suggestion?: string | null;
  createdAt: string;
}

interface ReportMedication {
  medicationId: string;
  name: string;
  dosage: number;
  dosageUnit: string;
  scheduledTime: string;
  status: string;
}

interface ReportRecord {
  recordDate: string;
  creatinine?: number | null;
  urea?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  phosphorus?: number | null;
  uricAcid?: number | null;
  hemoglobin?: number | null;
  bloodSugar?: number | null;
  weight?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  urineVolume?: number | null;
  tacrolimus?: number | null;
  notes?: string | null;
}

export interface FollowUpReportData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  profile: Awaited<ReturnType<typeof getUserProfile>>;
  recentMetrics: ReportMetric[];
  alerts: ReportAlert[];
  medications: ReportMedication[];
  records: ReportRecord[];
}

const METRIC_LABELS: Array<{ key: keyof ReportRecord; label: string; unit?: string }> = [
  { key: 'creatinine', label: '肌酐', unit: 'μmol/L' },
  { key: 'urea', label: '尿素氮', unit: 'mmol/L' },
  { key: 'potassium', label: '血钾', unit: 'mmol/L' },
  { key: 'sodium', label: '血钠', unit: 'mmol/L' },
  { key: 'phosphorus', label: '血磷', unit: 'mmol/L' },
  { key: 'uricAcid', label: '尿酸', unit: 'μmol/L' },
  { key: 'hemoglobin', label: '血红蛋白', unit: 'g/L' },
  { key: 'bloodSugar', label: '血糖', unit: 'mmol/L' },
  { key: 'weight', label: '体重', unit: 'kg' },
  { key: 'tacrolimus', label: '他克莫司', unit: 'ng/mL' },
];

const PDF_FONT_NAME = 'ChineseSans';
const OPEN_SOURCE_PDF_FONT_CANDIDATES = [
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otc',
  '/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf',
  '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/noto-cjk/NotoSansCJKsc-Regular.ttc',
  '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.otf',
  '/usr/share/fonts/noto-cjk/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/noto/NotoSansCJKsc-Regular.ttc',
  '/usr/share/fonts/noto/NotoSansCJK-Regular.otf',
  '/usr/share/fonts/noto/NotoSansCJKsc-Regular.otf',
  '/usr/share/fonts/opentype/source-han-sans/SourceHanSansSC-Regular.otf',
  '/usr/share/fonts/opentype/source-han-sans/SourceHanSansCN-Regular.otf',
  '/usr/share/fonts/truetype/arphic/uming.ttc',
];
const LOCAL_DEV_SYSTEM_FONT_CANDIDATES = [
  '/Library/Fonts/Arial Unicode.ttf',
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Arial Unicode.ttf',
  '/System/Library/Fonts/STHeiti Medium.ttc',
  '/System/Library/Fonts/Supplemental/STHeiti Medium.ttc',
];
const PDF_FONT_CANDIDATES = [
  process.env.PDF_FONT_PATH,
  ...OPEN_SOURCE_PDF_FONT_CANDIDATES,
  ...(process.env.NODE_ENV === 'production' ? [] : LOCAL_DEV_SYSTEM_FONT_CANDIDATES),
].filter(Boolean) as string[];
const PDF_FONT_SEARCH_DIRS = [
  '/usr/share/fonts',
  '/usr/local/share/fonts',
  '/Library/Fonts',
  '/System/Library/Fonts',
  '/System/Library/Fonts/Supplemental',
];

function scoreFontPath(fontPath: string) {
  const normalized = fontPath.toLowerCase();
  const scores = [
    { pattern: 'notosanscjksc-regular', score: 100 },
    { pattern: 'notosanscjk-regular', score: 95 },
    { pattern: 'sourcehansanssc-regular', score: 90 },
    { pattern: 'sourcehansanscn-regular', score: 88 },
    { pattern: 'notosanssc-regular', score: 85 },
    { pattern: 'wqy', score: 70 },
    { pattern: 'uming', score: 65 },
    { pattern: 'arial unicode', score: 60 },
    { pattern: 'stheiti', score: 55 },
  ];

  const match = scores.find(({ pattern }) => normalized.includes(pattern));
  if (!match) {
    return 0;
  }

  if (normalized.endsWith('.otf') || normalized.endsWith('.ttf')) {
    return match.score + 5;
  }

  return match.score;
}

function collectFontPaths(dir: string, depth = 0): string[] {
  if (depth > 4 || !fs.existsSync(dir)) {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    logger.warn(`读取字体目录失败: ${dir}`, error);
    return [];
  }

  const fontPaths: string[] = [];

  for (const entry of entries) {
    const entryPath = `${dir}/${entry.name}`;

    if (entry.isDirectory()) {
      fontPaths.push(...collectFontPaths(entryPath, depth + 1));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!/\.(otf|ttf|ttc|otc)$/i.test(entry.name)) {
      continue;
    }

    if (scoreFontPath(entryPath) > 0) {
      fontPaths.push(entryPath);
    }
  }

  return fontPaths;
}

function getPdfFontCandidates() {
  const discoveredFonts = PDF_FONT_SEARCH_DIRS.flatMap((dir) => collectFontPaths(dir));
  return Array.from(new Set([...PDF_FONT_CANDIDATES, ...discoveredFonts]))
    .filter(Boolean)
    .sort((a, b) => scoreFontPath(b) - scoreFontPath(a));
}

function getFontCollectionFaces(fontPath: string) {
  const normalized = fontPath.toLowerCase();

  if (!normalized.endsWith('.ttc') && !normalized.endsWith('.otc')) {
    return [undefined];
  }

  if (normalized.includes('notosanscjk')) {
    return [
      'NotoSansCJKsc-Regular',
      'NotoSansCJK-Regular',
      'NotoSansCJKtc-Regular',
      'NotoSansCJKjp-Regular',
      'NotoSansCJKkr-Regular',
    ];
  }

  if (normalized.includes('uming')) {
    return ['AR PL UMing CN', 'AR PL UMing HK', 'AR PL UMing TW'];
  }

  if (normalized.includes('wqy')) {
    return ['WenQuanYi Zen Hei', 'WenQuanYi Micro Hei'];
  }

  if (normalized.includes('stheiti')) {
    return ['STHeitiSC-Medium', 'STHeitiTC-Medium'];
  }

  return [undefined];
}

function setupPdfFonts(doc: PDFKit.PDFDocument) {
  const missingFontPaths: string[] = [];
  const failedFontPaths: string[] = [];
  const fontCandidates = getPdfFontCandidates();

  for (const fontPath of fontCandidates) {
    if (!fs.existsSync(fontPath)) {
      missingFontPaths.push(fontPath);
      continue;
    }

    for (const faceName of getFontCollectionFaces(fontPath)) {
      try {
        doc.registerFont(PDF_FONT_NAME, fontPath, faceName);
        doc.font(PDF_FONT_NAME);
        logger.info(`PDF中文字体加载成功: ${fontPath}${faceName ? ` (${faceName})` : ''}`);
        return;
      } catch (error) {
        failedFontPaths.push(`${fontPath}${faceName ? ` (${faceName})` : ''}`);
        logger.warn(`PDF中文字体加载失败: ${fontPath}${faceName ? ` (${faceName})` : ''}`, error);
      }
    }
  }

  logger.error('未找到可用中文字体，已拒绝生成乱码 PDF', {
    configuredFontPath: process.env.PDF_FONT_PATH,
    checkedPaths: fontCandidates,
    missingFontPaths,
    failedFontPaths,
  });

  throw new ApiError(
    '服务器缺少可用中文字体，无法生成健康报告。请重建后端镜像并安装 fonts-noto-cjk，或通过 PDF_FONT_PATH 指定字体文件。',
    500,
    '05001'
  );
}

function validateDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError('日期格式无效', 400, '00002');
  }

  if (start > end) {
    throw new ApiError('开始日期不能晚于结束日期', 400, '00002');
  }
}

function formatProfileLines(profile: FollowUpReportData['profile']) {
  const lines = [
    `姓名：${profile.name || '未填写'}`,
    `手机号：${profile.phone}`,
    `性别：${profile.gender || '未填写'}`,
    `透析方式：${profile.dialysisType || '未填写'}`,
    `原发病：${profile.primaryDisease || '未填写'}`,
    `身高：${profile.height ?? '未填写'}${profile.height ? ' cm' : ''}`,
    `当前体重：${profile.currentWeight ?? '未填写'}${profile.currentWeight ? ' kg' : ''}`,
    `干体重：${profile.dryWeight ?? '未填写'}${profile.dryWeight ? ' kg' : ''}`,
    `基线肌酐：${profile.baselineCreatinine ?? '未填写'}${profile.baselineCreatinine ? ' μmol/L' : ''}`,
    `确诊日期：${profile.diagnosisDate || '未填写'}`,
  ];

  if (profile.hasTransplant) {
    lines.push(`移植情况：已移植（${profile.transplantDate || '日期未填写'}）`);
  } else {
    lines.push('移植情况：未移植');
  }

  return lines;
}

function formatMetricLines(metrics: ReportMetric[]) {
  if (metrics.length === 0) {
    return ['暂无关键指标数据'];
  }

  return metrics.map((metric) => `${metric.name}：${metric.value} ${metric.unit}（${metric.date}）`);
}

function formatAlertLines(alerts: ReportAlert[]) {
  if (alerts.length === 0) {
    return ['最近暂无未读预警'];
  }

  return alerts.map((alert) => {
    const suggestion = alert.suggestion ? `；建议：${alert.suggestion}` : '';
    return `[${alert.level}] ${alert.message}${suggestion}（${alert.createdAt}）`;
  });
}

function formatMedicationLines(medications: ReportMedication[]) {
  if (medications.length === 0) {
    return ['今日暂无用药提醒'];
  }

  return medications.map(
    (medication) =>
      `${medication.name}：${medication.dosage}${medication.dosageUnit}，时间 ${medication.scheduledTime}，状态 ${medication.status}`
  );
}

function formatRecordLines(records: ReportRecord[]) {
  if (records.length === 0) {
    return ['所选时间范围内暂无健康记录'];
  }

  return records.map((record) => {
    const metricSummary = METRIC_LABELS.map(({ key, label, unit }) => {
      const value = record[key];
      if (value === null || value === undefined) {
        return null;
      }
      return `${label} ${value}${unit ? ` ${unit}` : ''}`;
    }).filter(Boolean);

    const bloodPressure =
      record.bloodPressureSystolic != null && record.bloodPressureDiastolic != null
        ? `血压 ${record.bloodPressureSystolic}/${record.bloodPressureDiastolic} mmHg`
        : null;

    const urineVolume =
      record.urineVolume != null ? `尿量 ${record.urineVolume} mL` : null;

    const notes = record.notes ? `备注：${record.notes}` : null;

    return [record.recordDate, ...metricSummary, bloodPressure, urineVolume, notes]
      .filter(Boolean)
      .join('；');
  });
}

function writeSection(doc: PDFKit.PDFDocument, title: string, lines: string[]) {
  doc.moveDown();
  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(11);

  lines.forEach((line) => {
    doc.text(`• ${line}`, {
      width: 500,
      align: 'left',
    });
    doc.moveDown(0.3);
  });
}

export async function buildFollowUpReportData(
  userId: string,
  startDate: string,
  endDate: string
): Promise<FollowUpReportData> {
  validateDateRange(startDate, endDate);

  const [profile, recordsResult, recentMetrics, alertsResult, todayMedications] = await Promise.all([
    getUserProfile(userId),
    getHealthRecords(userId, { startDate, endDate, page: 1, pageSize: 100 }),
    getRecentMetrics(userId, 5),
    getAlerts(userId, { isRead: false, page: 1, pageSize: 5 }),
    getTodayMedications(userId),
  ]);

  return {
    dateRange: { startDate, endDate },
    generatedAt: new Date().toISOString(),
    profile,
    recentMetrics,
    alerts: alertsResult.list.map((alert) => ({
      id: alert.id,
      level: alert.level,
      message: alert.message,
      suggestion: alert.suggestion,
      createdAt: alert.createdAt.toISOString().split('T')[0],
    })),
    medications: todayMedications.medications,
    records: recordsResult.list,
  };
}

export async function generateFollowUpReportPdf(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Buffer> {
  const reportData = await buildFollowUpReportData(userId, startDate, endDate);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    setupPdfFonts(doc);

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('健康监测助手复诊报告', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`导出时间：${reportData.generatedAt.split('T')[0]}`, { align: 'center' });
    doc.text(`统计区间：${startDate} 至 ${endDate}`, { align: 'center' });

    writeSection(doc, '一、基础档案', formatProfileLines(reportData.profile));
    writeSection(doc, '二、最近关键指标', formatMetricLines(reportData.recentMetrics));
    writeSection(doc, '三、最近未读预警', formatAlertLines(reportData.alerts));
    writeSection(doc, '四、今日用药摘要', formatMedicationLines(reportData.medications));
    writeSection(doc, '五、区间健康记录摘要', formatRecordLines(reportData.records));

    doc.moveDown();
    doc.fontSize(10).fillColor('gray').text('说明：本报告仅用于复诊资料整理与回顾，不构成医疗诊断建议。', {
      align: 'left',
    });

    doc.end();
  });
}
