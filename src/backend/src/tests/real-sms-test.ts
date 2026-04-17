/**
 * 真实短信发送与核验测试脚本
 * 用法: cd src/backend && npx tsx src/tests/real-sms-test.ts
 */

import 'dotenv/config';
import * as readline from 'readline';
import { sendVerificationCode, verifySmsCode } from '../services/notification.service';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('=== 真实短信发送与核验测试 ===\n');

  const required = [
    'SMS_ACCESS_KEY',
    'SMS_SECRET_KEY',
    'SMS_SIGN_NAME',
    'SMS_TEMPLATE_CODE_VERIFICATION',
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('错误: 以下环境变量未配置，请在 src/backend/.env 中设置后再运行:');
    missing.forEach((k) => console.error(`  - ${k}`));
    process.exit(1);
  }

  console.log('环境变量检查通过');
  console.log(`签名: ${process.env.SMS_SIGN_NAME}`);
  console.log(`模板: ${process.env.SMS_TEMPLATE_CODE_VERIFICATION}\n`);

  const phone = await ask('请输入接收验证码的手机号 (如 13800138000): ');
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    console.error('手机号格式不正确');
    process.exit(1);
  }

  console.log(`\n正在发送验证码到 ${phone}...\n`);

  try {
    const result = await sendVerificationCode(phone);
    if (!result.success) {
      console.error('发送失败:', result.error);
      process.exit(1);
    }
    console.log('发送成功!');
    console.log(`RequestId: ${result.requestId || '无'}`);
    console.log(`BizId: ${result.bizId || '无'}`);
    console.log(`OutId: ${result.outId || '无'}`);
    if (result.verifyCode) {
      console.log(`返回的验证码(服务端): ${result.verifyCode}`);
    }
    console.log('');
  } catch (err: any) {
    console.error('发送异常:', err.message);
    process.exit(1);
  }

  const code = await ask('请输入你手机上收到的验证码: ');
  if (!/^\d{4,8}$/.test(code)) {
    console.error('验证码格式不正确');
    process.exit(1);
  }

  console.log(`\n正在核验验证码 ${code}...\n`);

  try {
    const valid = await verifySmsCode(phone, code);
    if (valid) {
      console.log('核验结果: 通过');
    } else {
      console.log('核验结果: 失败 (验证码错误或已过期)');
    }
  } catch (err: any) {
    console.error('核验异常:', err.message);
  }

  rl.close();
}

main();
