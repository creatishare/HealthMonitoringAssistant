/**
 * Alert action field regression tests.
 *
 * Run: cd src/backend && npm run test:alert-actions
 */

import { serializeAlertForClient } from '../services/alert.service';
import { formatDashboardAlert } from '../services/dashboard.service';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message} (expected ${expected}, got ${actual})`);
}

async function runTests() {
  console.log('=== Alert Action Field Tests ===\n');

  const serialized = serializeAlertForClient({
    id: 'alert-1',
    userId: 'user-1',
    level: 'critical',
    type: 'metric',
    recordId: 'record-1',
    metric: 'potassium',
    medicationId: null,
    medicationLogId: null,
    message: '血钾偏高',
    suggestion: '请尽快复查',
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-05-30T08:00:00.000Z'),
  });

  assertEqual(serialized.id, 'alert-1', 'serialized alert keeps id');
  assertEqual(serialized.level, 'critical', 'serialized alert keeps level');
  assertEqual(serialized.type, 'metric', 'serialized alert keeps type');
  assertEqual(serialized.suggestion, '请尽快复查', 'serialized alert keeps suggestion');
  assertEqual(serialized.recordId, 'record-1', 'serialized alert keeps recordId');
  assertEqual(serialized.metric, 'potassium', 'serialized alert keeps metric');
  assert(!('userId' in serialized), 'serialized alert does not expose userId');

  const dashboardAlert = formatDashboardAlert(serialized);
  assertEqual(dashboardAlert.id, 'alert-1', 'dashboard alert keeps id');
  assertEqual(dashboardAlert.type, 'metric', 'dashboard alert keeps type');
  assertEqual(dashboardAlert.suggestion, '请尽快复查', 'dashboard alert keeps suggestion');
  assertEqual(dashboardAlert.recordId, 'record-1', 'dashboard alert keeps recordId');
  assertEqual(dashboardAlert.metric, 'potassium', 'dashboard alert keeps metric');

  console.log('\n=== All alert action field tests passed ===');
}

runTests().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
