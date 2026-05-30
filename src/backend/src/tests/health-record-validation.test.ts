/**
 * Health record validation regression tests.
 *
 * Run: cd src/backend && npm run test:health-records
 */

import prisma from '../config/database';
import {
  createHealthRecord,
  getHealthRecords,
  getTrends,
  updateHealthRecord,
} from '../services/health-record.service';
import { isValidDate } from '../utils/validators';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

async function assertRejectsWithBadRequest(
  name: string,
  action: () => Promise<unknown>,
  expectedMessage: string
) {
  try {
    await action();
    throw new Error(`Expected ${name} to reject`);
  } catch (error: any) {
    if (error.message === `Expected ${name} to reject`) {
      throw new Error(`FAIL: ${name} did not reject`);
    }

    assert(error.statusCode === 400, `${name} returns 400`);
    assert(error.message.includes(expectedMessage), `${name} message includes "${expectedMessage}"`);
  }
}

async function runTests() {
  console.log('=== Health Record Validation Tests ===\n');

  assert(isValidDate('2026-02-28') === true, 'valid YYYY-MM-DD date is accepted');
  assert(isValidDate('2026-02-31') === false, 'impossible calendar date is rejected');
  assert(isValidDate('2026-2-1') === false, 'non-padded date is rejected');

  await assertRejectsWithBadRequest(
    'create invalid record date',
    () => createHealthRecord('test-user-id', { recordDate: '2026-02-31', creatinine: 120 }),
    '记录日期格式错误'
  );

  await assertRejectsWithBadRequest(
    'create invalid metric value',
    () => createHealthRecord('test-user-id', { recordDate: '2026-05-30', potassium: 99 }),
    '血钾不能大于20'
  );

  await assertRejectsWithBadRequest(
    'create non-integer blood pressure',
    () => createHealthRecord('test-user-id', {
      recordDate: '2026-05-30',
      bloodPressureSystolic: 120.5,
    }),
    '收缩压必须是整数'
  );

  await assertRejectsWithBadRequest(
    'create non-integer heart rate',
    () => createHealthRecord('test-user-id', {
      recordDate: '2026-05-30',
      heartRate: 72.5,
    } as any),
    '心率必须是整数'
  );

  await assertRejectsWithBadRequest(
    'create invalid urine occult blood type',
    () => createHealthRecord('test-user-id', {
      recordDate: '2026-05-30',
      urineOccultBlood: 2,
    } as any),
    '尿潜血必须是字符串'
  );

  await assertRejectsWithBadRequest(
    'create unknown field',
    () => createHealthRecord('test-user-id', {
      recordDate: '2026-05-30',
      creatinine: 120,
      diagnosis: 'should not pass',
    } as any),
    '不支持的字段'
  );

  await assertRejectsWithBadRequest(
    'update unknown field',
    () => updateHealthRecord('test-user-id', 'record-id', { diagnosis: 'should not pass' } as any),
    '不支持的字段'
  );

  await assertRejectsWithBadRequest(
    'list unknown metric filter',
    () => getHealthRecords('test-user-id', { metric: 'badMetric' }),
    '不支持的健康指标'
  );

  await assertRejectsWithBadRequest(
    'list invalid date range',
    () => getHealthRecords('test-user-id', { startDate: '2026-05-31', endDate: '2026-05-01' }),
    '开始日期不能晚于结束日期'
  );

  await assertRejectsWithBadRequest(
    'trend unknown metric',
    () => getTrends('test-user-id', ['creatinine', 'badMetric'], '2026-05-01', '2026-05-30'),
    '不支持的趋势指标'
  );

  await assertRejectsWithBadRequest(
    'trend invalid date',
    () => getTrends('test-user-id', ['creatinine'], '2026-02-31', '2026-05-30'),
    '开始日期格式错误'
  );

  const originalCreate = prisma.healthRecord.create;
  let capturedCreateArgs: any = null;
  (prisma.healthRecord as any).create = async (args: any) => {
    capturedCreateArgs = args;
    return {
      id: 'record-id',
      userId: args.data.userId,
      recordDate: args.data.recordDate,
      ...args.data,
      createdAt: new Date('2026-05-30T00:00:00.000Z'),
      updatedAt: new Date('2026-05-30T00:00:00.000Z'),
    };
  };

  try {
    const record = await createHealthRecord('test-user-id', {
      recordDate: '2026-05-30',
      heartRate: 72,
      egfr: 58.4,
      urineProteinCreatinineRatio: 0.22,
      urineAlbuminCreatinineRatio: 35.5,
      urineOccultBlood: '+',
      bkVirusCopies: 1200,
      cmvVirusCopies: 0,
      ebvVirusCopies: 430,
    } as any);

    assert(record.heartRate === 72, 'create accepts formal heartRate field');
    assert(record.egfr === 58.4, 'create accepts eGFR field');
    assert(record.urineOccultBlood === '+', 'create accepts urine occult blood text field');
    assert(capturedCreateArgs.data.bkVirusCopies === 1200, 'create persists BK virus copies');
  } finally {
    (prisma.healthRecord as any).create = originalCreate;
  }

  const originalFindMany = prisma.healthRecord.findMany;
  let capturedTrendArgs: any = null;
  (prisma.healthRecord as any).findMany = async (args: any) => {
    capturedTrendArgs = args;
    return [
      {
        recordDate: new Date('2026-05-20T00:00:00.000Z'),
        heartRate: 72,
        egfr: 58.4,
        urineProteinCreatinineRatio: 0.22,
        bkVirusCopies: 1200,
      },
    ];
  };

  try {
    const trend = await getTrends(
      'test-user-id',
      ['heartRate', 'egfr', 'urineProteinCreatinineRatio', 'bkVirusCopies'],
      '2026-05-01',
      '2026-05-30'
    );

    assert(trend.metrics.includes('heartRate' as any), 'trends whitelist accepts heartRate');
    assert(trend.metrics.includes('egfr' as any), 'trends whitelist accepts eGFR');
    assert(capturedTrendArgs.select.heartRate === true, 'trends select includes heartRate');
    assert(trend.data[0].bkVirusCopies === 1200, 'trends return virus copy values');
  } finally {
    (prisma.healthRecord as any).findMany = originalFindMany;
  }

  console.log('\n=== All health record validation tests passed ===');
}

runTests()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
