/**
 * Transplant risk rule regression tests.
 *
 * Run: cd src/backend && npm run test:transplant-risk
 */

import {
  analyzeTransplantRisk,
  TRANSPLANT_RISK_DISCLAIMER,
} from '../services/transplant-risk.service';
import { buildDoctorSummaryLines, type FollowUpReportData } from '../services/report.service';
import { checkHealthRecordAlerts } from '../services/alert.service';
import prisma from '../config/database';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message} (expected ${expected}, got ${actual})`);
}

function assertIncludes(value: string, expected: string, message: string) {
  assert(value.includes(expected), `${message} includes "${expected}"`);
}

function assertNoDiagnosisLanguage(value: string, message: string) {
  for (const word of ['疑似排异', '排异', '感染', '药物毒性', '建议调药', '调整剂量']) {
    assert(!value.includes(word), `${message} does not include "${word}"`);
  }
}

const fullRecord = {
  recordDate: '2026-05-28',
  creatinine: 98,
  egfr: 62,
  tacrolimus: 7.2,
  urineProteinCreatinineRatio: 0.18,
  urineAlbuminCreatinineRatio: 28,
  bkVirusCopies: 0,
  cmvVirusCopies: 0,
  ebvVirusCopies: 0,
};

async function runTests() {
  console.log('=== Transplant Risk Rule Tests ===\n');

  const critical = analyzeTransplantRisk({
    userType: 'kidney_transplant',
    baselineCreatinine: 100,
    transplantDate: '2025-01-01',
    tacrolimusTargetMin: 6,
    tacrolimusTargetMax: 9,
    records: [{ ...fullRecord, creatinine: 128 }],
  });
  assertEqual(critical.level, 'critical', 'creatinine >25% baseline is critical');
  assertEqual(critical.title, '建议尽快联系移植医生', 'critical title is action-oriented');
  assertEqual(critical.suggestedAction, '尽快联系移植医生，并携带近期化验结果复诊。', 'critical suggested action');
  assertEqual(critical.creatinineChangePercent, 28, 'critical percent is rounded');
  assertEqual(critical.disclaimer, TRANSPLANT_RISK_DISCLAIMER, 'risk disclaimer is attached');
  assertNoDiagnosisLanguage(`${critical.message}${critical.suggestedAction}`, 'critical message');

  const warning = analyzeTransplantRisk({
    userType: 'kidney_transplant',
    baselineCreatinine: 100,
    records: [{ ...fullRecord, creatinine: 112 }],
  });
  assertEqual(warning.level, 'warning', 'creatinine >10% baseline is warning');
  assertEqual(warning.title, '建议复查并观察趋势', 'warning title is action-oriented');
  assertEqual(warning.creatinineChangePercent, 12, 'warning percent is rounded');

  const rising = analyzeTransplantRisk({
    userType: 'kidney_transplant',
    baselineCreatinine: 100,
    records: [
      { ...fullRecord, recordDate: '2026-05-01', creatinine: 95 },
      { ...fullRecord, recordDate: '2026-05-10', creatinine: 99 },
      { ...fullRecord, recordDate: '2026-05-20', creatinine: 104 },
    ],
  });
  assertEqual(rising.level, 'warning', 'three consecutive creatinine increases are warning');
  assertIncludes(rising.message, '最近3次肌酐呈连续上升趋势', 'rising creatinine message');
  assertNoDiagnosisLanguage(`${rising.message}${rising.suggestedAction}`, 'rising message');

  const tacrolimus = analyzeTransplantRisk({
    userType: 'kidney_transplant',
    baselineCreatinine: 100,
    tacrolimusTargetMin: 6,
    tacrolimusTargetMax: 9,
    records: [{ ...fullRecord, tacrolimus: 11 }],
  });
  assertEqual(tacrolimus.level, 'warning', 'out-of-target tacrolimus is warning');
  assertIncludes(tacrolimus.title, '血药浓度', 'tacrolimus title');
  assertIncludes(tacrolimus.message, '医生设定目标范围', 'tacrolimus message');
  assertNoDiagnosisLanguage(`${tacrolimus.message}${tacrolimus.suggestedAction}`, 'tacrolimus message');

  const missing = analyzeTransplantRisk({
    userType: 'kidney_transplant',
    records: [],
  });
  assertEqual(missing.level, 'info', 'missing fields use info level');
  assertEqual(missing.title, '建议补充移植随访资料', 'missing fields title');
  assertIncludes(missing.message, '建议补充数据', 'missing fields message');
  assertEqual(missing.missingFields.includes('baselineCreatinine'), true, 'missing baseline is listed');
  assertEqual(missing.missingFields.includes('bkVirusCopies'), true, 'missing BK virus load is listed');

  const stable = analyzeTransplantRisk({
    userType: 'kidney_transplant',
    baselineCreatinine: 100,
    tacrolimusTargetMin: 6,
    tacrolimusTargetMax: 9,
    records: [fullRecord],
  });
  assertEqual(stable.level, 'info', 'stable profile is info level');
  assertEqual(stable.title, '核心指标暂未见明显偏离', 'stable title');
  assertEqual(stable.missingFields.length, 0, 'stable full profile has no missing fields');
  assertIncludes(stable.message, '请继续按医嘱复查', 'stable message');

  const reportData: FollowUpReportData = {
    dateRange: { startDate: '2026-05-01', endDate: '2026-05-30' },
    generatedAt: '2026-05-30T00:00:00.000Z',
    profile: {
      userId: 'user-id',
      phone: '13800138000',
      name: '测试用户',
      gender: null,
      birthDate: undefined,
      height: null,
      currentWeight: null,
      userType: 'kidney_transplant',
      onboardingCompleted: true,
      dialysisType: undefined,
      dryWeight: null,
      baselineCreatinine: 100,
      tacrolimusTargetMin: 6,
      tacrolimusTargetMax: 9,
      diagnosisDate: undefined,
      primaryDisease: null,
      hasTransplant: true,
      transplantDate: '2025-01-01',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-30T00:00:00.000Z'),
    },
    recentMetrics: [],
    alerts: [],
    medications: [],
    records: [{ ...fullRecord, creatinine: 128 }],
  };
  const doctorSummary = buildDoctorSummaryLines(reportData).join('\n');
  assertIncludes(doctorSummary, '移植专项提示：建议尽快联系移植医生', 'PDF doctor summary transplant risk');
  assertIncludes(doctorSummary, '趋势偏移：最近肌酐较个人基线变化约 28%', 'PDF doctor summary creatinine shift');
  assertIncludes(doctorSummary, '他克莫司医生目标范围：6-9 ng/mL', 'PDF doctor summary tacrolimus target range');
  assertNoDiagnosisLanguage(doctorSummary, 'PDF doctor summary');

  const originalFindMany = prisma.healthRecord.findMany;
  (prisma.healthRecord as any).findMany = async () => [
    { ...fullRecord, id: 'record-3', recordDate: new Date('2026-05-20T00:00:00.000Z'), creatinine: 104 },
    { ...fullRecord, id: 'record-2', recordDate: new Date('2026-05-10T00:00:00.000Z'), creatinine: 99 },
    { ...fullRecord, id: 'record-1', recordDate: new Date('2026-05-01T00:00:00.000Z'), creatinine: 95 },
  ];

  try {
    const alerts = await checkHealthRecordAlerts(
      'user-id',
      {
        ...fullRecord,
        id: 'record-3',
        userId: 'user-id',
        recordDate: new Date('2026-05-20T00:00:00.000Z'),
        creatinine: 104,
        source: 'manual',
        urea: null,
        potassium: null,
        sodium: null,
        phosphorus: null,
        uricAcid: null,
        hemoglobin: null,
        bloodSugar: null,
        weight: null,
        bloodPressureSystolic: null,
        bloodPressureDiastolic: null,
        urineVolume: null,
        heartRate: null,
        urineOccultBlood: null,
        notes: null,
        createdAt: new Date('2026-05-20T00:00:00.000Z'),
        updatedAt: new Date('2026-05-20T00:00:00.000Z'),
      } as any,
      100
    );
    assertEqual(alerts[0]?.level, 'warning', 'alert service reuses rising creatinine warning');
    assertIncludes(alerts[0]?.message ?? '', '最近3次肌酐呈连续上升趋势', 'alert service rising trend message');
    assertNoDiagnosisLanguage(`${alerts[0]?.message ?? ''}${alerts[0]?.suggestion ?? ''}`, 'alert service rising trend');
  } finally {
    (prisma.healthRecord as any).findMany = originalFindMany;
  }

  console.log('\n=== All transplant risk rule tests passed ===');
}

runTests()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
