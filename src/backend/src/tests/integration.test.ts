/**
 * 本地集成测试 - 测试所有核心功能
 * 运行: cd src/backend && npx tsx src/tests/integration.test.ts
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../config/database';

const BASE_URL = 'http://localhost:3001';
let accessToken = '';
let userId = '';
let healthRecordId = '';
let medicationId = '';

async function request(
  path: string,
  options: RequestInit = {}
): Promise<{ status: number; data: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  PASS: ${message}`);
}

async function runTests() {
  console.log('=== 本地集成测试 ===\n');

  // 0. 前置: 清理测试数据并创建测试用户
  console.log('0. 准备测试数据');
  const testPhone = '13800138099';
  const testPassword = 'Test1234';

  const existing = await prisma.user.findUnique({ where: { phone: testPhone } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const passwordHash = await bcrypt.hash(testPassword, 12);
  const user = await prisma.user.create({
    data: {
      phone: testPhone,
      passwordHash,
      profile: {
        create: {
          name: '测试用户',
          dialysisType: 'hemodialysis',
          onboardingCompleted: true,
        },
      },
    },
    include: { profile: true },
  });
  userId = user.id;
  console.log(`  创建测试用户: ${testPhone}, ID=${userId}\n`);

  // 1. 健康检查
  console.log('1. 健康检查');
  const health = await request('/health');
  assert(health.status === 200 && health.data?.status === 'ok', '健康检查返回 ok');

  // 2. 登录
  console.log('\n2. 用户登录');
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: testPhone, password: testPassword }),
  });
  assert(login.status === 200, `登录成功 (status=${login.status})`);
  assert(login.data?.data?.accessToken, '返回 accessToken');
  assert(login.data?.data?.refreshToken, '返回 refreshToken');
  accessToken = login.data.data.accessToken;

  // 3. 错误密码登录
  console.log('\n3. 错误密码登录');
  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: testPhone, password: 'wrong' }),
  });
  assert(badLogin.status === 401, `错误密码返回 401 (实际 ${badLogin.status})`);

  // 4. 未注册用户登录
  console.log('\n4. 未注册用户登录');
  const noUser = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: '19999999999', password: 'Test1234' }),
  });
  assert(noUser.status === 400, `未注册用户返回 400 (实际 ${noUser.status})`);

  // 5. 获取用户档案
  console.log('\n5. 获取用户档案');
  const me = await request('/users/profile');
  assert(me.status === 200, '获取用户档案成功');
  assert(me.data?.data?.phone === testPhone, '手机号匹配');

  // 6. 更新用户档案
  console.log('\n6. 更新用户档案');
  const updateProfile = await request('/users/profile', {
    method: 'PUT',
    body: JSON.stringify({ name: '更新后的名字', height: 175 }),
  });
  assert(updateProfile.status === 200, '更新档案成功');

  // 7. 创建健康记录
  console.log('\n7. 创建健康记录');
  const createRecord = await request('/health-records', {
    method: 'POST',
    body: JSON.stringify({
      recordDate: '2026-04-17',
      creatinine: 180,
      urea: 12.5,
      potassium: 5.8,
      weight: 65,
      bloodPressureSystolic: 140,
      bloodPressureDiastolic: 90,
      urineVolume: 800,
      notes: '测试记录',
    }),
  });
  assert(createRecord.status === 201, '创建健康记录成功');
  healthRecordId = createRecord.data?.data?.id;
  assert(!!healthRecordId, '返回记录 ID');

  // 8. 获取健康记录列表
  console.log('\n8. 获取健康记录列表');
  const listRecords = await request('/health-records');
  assert(listRecords.status === 200, '获取记录列表成功');
  const recordsList = listRecords.data?.data?.list;
  assert(Array.isArray(recordsList), '返回数组');
  assert(recordsList?.length >= 1, '至少有一条记录');

  // 9. 获取单条记录
  console.log('\n9. 获取单条健康记录');
  const getRecord = await request(`/health-records/${healthRecordId}`);
  assert(getRecord.status === 200, '获取单条记录成功');
  assert(getRecord.data?.data?.creatinine === 180, '肌酐值正确');

  // 10. 更新健康记录
  console.log('\n10. 更新健康记录');
  const updateRecord = await request(`/health-records/${healthRecordId}`, {
    method: 'PUT',
    body: JSON.stringify({ creatinine: 200, notes: '更新后的备注' }),
  });
  assert(updateRecord.status === 200, '更新记录成功');

  // 11. 创建用药
  console.log('\n11. 创建用药');
  const createMed = await request('/medications', {
    method: 'POST',
    body: JSON.stringify({
      name: '环孢素',
      specification: '25mg/粒',
      dosage: 2,
      dosageUnit: '粒',
      frequency: 'twice_daily',
      reminderTimes: ['08:00', '20:00'],
      reminderMinutesBefore: 10,
    }),
  });
  assert(createMed.status === 201, '创建用药成功');
  medicationId = createMed.data?.data?.id;
  assert(!!medicationId, '返回用药 ID');

  // 12. 获取用药列表
  console.log('\n12. 获取用药列表');
  const listMeds = await request('/medications');
  assert(listMeds.status === 200, '获取用药列表成功');
  const medsList = listMeds.data?.data?.list ?? listMeds.data?.data;
  assert(Array.isArray(medsList) && medsList.length >= 1, '至少有一条用药');

  // 13. 创建服药记录
  console.log('\n13. 创建服药记录');
  const createLog = await request('/medications/logs', {
    method: 'POST',
    body: JSON.stringify({
      medicationId,
      scheduledTime: '2026-04-17T08:00:00Z',
      status: 'taken',
      actualTime: '2026-04-17T08:05:00Z',
    }),
  });
  assert(createLog.status === 201, '创建服药记录成功');

  // 14. 获取仪表盘数据
  console.log('\n14. 获取仪表盘数据');
  const dashboard = await request('/dashboard');
  assert(dashboard.status === 200, '获取仪表盘成功');

  // 15. 获取预警列表
  console.log('\n15. 获取预警列表');
  const alerts = await request('/alerts');
  assert(alerts.status === 200, '获取预警列表成功');

  // 16. 获取未读预警数量
  console.log('\n16. 获取未读预警数量');
  const unread = await request('/alerts/unread-count');
  assert(unread.status === 200, '获取未读数量成功');
  assert(typeof unread.data?.data?.total === 'number', '返回 total 数字');

  // 17. 删除健康记录
  console.log('\n17. 删除健康记录');
  const deleteRecord = await request(`/health-records/${healthRecordId}`, {
    method: 'DELETE',
  });
  assert(deleteRecord.status === 204, '删除记录成功');

  // 18. 删除用药
  console.log('\n18. 删除用药');
  const deleteMed = await request(`/medications/${medicationId}`, {
    method: 'DELETE',
  });
  assert(deleteMed.status === 204, '删除用药成功');

  // 19. 登出
  console.log('\n19. 用户登出');
  const logout = await request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  assert(logout.status === 200, '登出成功');

  // 清理
  console.log('\n20. 清理测试数据');
  await prisma.user.delete({ where: { id: userId } });
  console.log('  测试用户已删除');

  console.log('\n=== 所有测试通过 ===');
  await prisma.$disconnect();
}

runTests().catch(async (err) => {
  console.error(`\nFAIL: ${err.message}`);
  // 尝试清理
  try {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
