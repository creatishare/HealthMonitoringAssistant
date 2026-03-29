import Queue from 'bull';
import dotenv from 'dotenv';
import prisma from '../config/database';
import logger from '../utils/logger';
import { createAlert } from '../services/alert.service';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 创建队列
const reminderQueue = new Queue('medication-reminders', REDIS_URL);

// 处理发送提醒任务
reminderQueue.process('send-reminder', async (job) => {
  const { userId, medicationId, scheduledTime } = job.data;

  logger.info(`处理用药提醒: ${medicationId}, 用户: ${userId}`);

  // 获取用药信息
  const medication = await prisma.medication.findUnique({
    where: { id: medicationId },
  });

  if (!medication || medication.status !== 'active') {
    logger.warn(`用药不存在或已停用: ${medicationId}`);
    return;
  }

  // 创建服药记录（待服状态）
  const log = await prisma.medicationLog.create({
    data: {
      userId,
      medicationId,
      scheduledTime: new Date(scheduledTime),
      status: 'missed', // 初始状态为missed，用户确认后改为taken
    },
  });

  // TODO: 发送推送通知
  logger.info(`已创建服药记录: ${log.id}`);

  // 延迟30分钟后检查是否已服药
  await reminderQueue.add(
    'check-missed',
    { logId: log.id, userId, medicationId },
    { delay: 30 * 60 * 1000 } // 30分钟后
  );
});

// 处理漏服检查任务
reminderQueue.process('check-missed', async (job) => {
  const { logId, userId, medicationId } = job.data;

  // 检查记录状态
  const log = await prisma.medicationLog.findUnique({
    where: { id: logId },
    include: { medication: true },
  });

  if (!log || log.status !== 'missed') {
    return; // 已处理或已删除
  }

  // 检查是否已存在预警
  const existingAlert = await prisma.alert.findFirst({
    where: {
      medicationLogId: logId,
      type: 'medication',
    },
  });

  if (existingAlert) {
    return; // 已生成预警
  }

  // 创建漏服预警
  await createAlert(userId, {
    level: 'warning',
    type: 'medication',
    message: `您已错过${log.medication.name}的服药时间，请尽快补服或咨询医生`,
    suggestion: '规律服药对控制病情非常重要',
    medicationId,
    medicationLogId: logId,
  });

  logger.info(`创建漏服预警: ${logId}`);
});

// 每分钟检查需要发送的提醒
async function scheduleReminders() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  logger.debug(`检查提醒: ${currentTime}`);

  // 获取所有活跃用药
  const medications = await prisma.medication.findMany({
    where: {
      status: 'active',
    },
  });

  for (const med of medications) {
    // 检查是否需要今天服药
    const shouldTakeToday = checkShouldTakeToday(med.frequency, med.createdAt);
    if (!shouldTakeToday) continue;

    // 检查当前时间是否匹配提醒时间
    for (const reminderTime of med.reminderTimes) {
      const timeStr = reminderTime.toISOString().split('T')[1].substring(0, 5);

      if (timeStr === currentTime) {
        // 计算实际提醒时间（考虑提前提醒）
        const scheduledTime = new Date(now);
        scheduledTime.setMinutes(
          scheduledTime.getMinutes() + med.reminderMinutesBefore
        );

        // 添加到队列
        await reminderQueue.add(
          'send-reminder',
          {
            userId: med.userId,
            medicationId: med.id,
            scheduledTime: scheduledTime.toISOString(),
          },
          {
            delay: med.reminderMinutesBefore * 60 * 1000,
          }
        );

        logger.info(
          `已调度提醒: ${med.name}, 用户: ${med.userId}, 时间: ${scheduledTime}`
        );
      }
    }
  }
}

// 检查今天是否需要服药
function checkShouldTakeToday(
  frequency: string,
  createdAt: Date
): boolean {
  const today = new Date();
  const daysSinceCreated = Math.floor(
    (today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (frequency) {
    case 'once_daily':
    case 'twice_daily':
    case 'three_daily':
      return true;
    case 'every_other_day':
      return daysSinceCreated % 2 === 0;
    case 'weekly':
      return today.getDay() === createdAt.getDay();
    default:
      return true;
  }
}

// 启动定时任务
logger.info('用药提醒Worker启动');

// 每分钟执行一次
setInterval(scheduleReminders, 60 * 1000);

// 立即执行一次
scheduleReminders();

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('正在关闭Worker...');
  await reminderQueue.close();
  process.exit(0);
});
