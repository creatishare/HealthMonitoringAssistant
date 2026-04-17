/**
 * SMS verification bug fix tests
 * Run with: npx tsx src/tests/sms-verification.test.ts
 */

import { isValidVerificationCode } from '../utils/validators';
import { getSMSConfig, sendVerificationCode, verifySmsCode } from '../services/notification.service';

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
  console.log(`PASS: ${message}`);
}

function assertThrows(fn: () => void, expectedMessage: string, testName: string) {
  try {
    fn();
    throw new Error(`FAIL: ${testName} - expected to throw "${expectedMessage}" but did not throw`);
  } catch (err: any) {
    if (err.message === `FAIL: ${testName} - expected to throw "${expectedMessage}" but did not throw`) {
      throw err;
    }
    if (!err.message?.includes(expectedMessage)) {
      throw new Error(`FAIL: ${testName}\n  Expected message containing: ${expectedMessage}\n  Actual: ${err.message}`);
    }
    console.log(`PASS: ${testName}`);
  }
}

async function runTests() {
  console.log('=== SMS Verification Fix Tests ===\n');

  // Test 1: validators - configurable code length
  console.log('--- validators.ts ---');
  assertEqual(isValidVerificationCode('123456'), true, 'default length 6 should accept 123456');
  assertEqual(isValidVerificationCode('12345'), false, 'default length 6 should reject 12345');
  assertEqual(isValidVerificationCode('1234567'), false, 'default length 6 should reject 1234567');
  assertEqual(isValidVerificationCode('1234', 4), true, 'length 4 should accept 1234');
  assertEqual(isValidVerificationCode('12345', 4), false, 'length 4 should reject 12345');
  assertEqual(isValidVerificationCode('12345678', 8), true, 'length 8 should accept 12345678');
  assertEqual(isValidVerificationCode('123456789', 8), false, 'length 8 should reject 123456789');
  assertEqual(isValidVerificationCode('1234', 3), false, 'invalid length <4 falls back to 6, so 1234 is false');
  assertEqual(isValidVerificationCode('123456', 3), true, 'invalid length <4 falls back to 6, so 123456 is true');
  assertEqual(isValidVerificationCode('1234', 9), false, 'invalid length >8 falls back to 6, so 1234 is false');
  assertEqual(isValidVerificationCode('123456', 9), true, 'invalid length >8 falls back to 6, so 123456 is true');

  // Test 2: SMS config consistency
  console.log('\n--- notification.service.ts config ---');
  const config = getSMSConfig();
  assertEqual(typeof config.verificationCodeLength, 'number', 'verificationCodeLength should be a number');
  assertEqual(typeof config.verificationValidTimeSeconds, 'number', 'verificationValidTimeSeconds should be a number');
  assertEqual(typeof config.verificationIntervalSeconds, 'number', 'verificationIntervalSeconds should be a number');
  assertEqual(config.verificationCodeLength >= 4 && config.verificationCodeLength <= 8, true, 'code length should be 4-8');
  assertEqual(config.verificationValidTimeSeconds > 0, true, 'valid time should be positive');
  assertEqual(config.verificationIntervalSeconds > 0, true, 'interval should be positive');

  // Test 3: notification.service.ts mock mode verification code length
  console.log('\n--- notification.service.ts mock mode ---');
  const sendResult = await sendVerificationCode('13800138000');
  assertEqual(sendResult.success, true, 'mock mode should return success');
  assertEqual(
    typeof sendResult.verifyCode === 'string' && sendResult.verifyCode.length === config.verificationCodeLength,
    true,
    `mock verifyCode length should match config (${config.verificationCodeLength})`
  );

  // Test 4: verifySmsCode returns false in mock mode (no credentials)
  const verifyResult = await verifySmsCode('13800138000', sendResult.verifyCode || '');
  assertEqual(verifyResult, false, 'verifySmsCode should return false in mock mode');

  console.log('\n=== All tests passed ===');
}

runTests().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
