import prisma from '../config/database';
import { getRecentMetrics } from './health-record.service';
import { getTodayMedications } from './medication.service';
import { getUnreadAlertCount, getAlerts } from './alert.service';

// 获取仪表盘数据
export async function getDashboardData(userId: string) {
  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 获取问候语
  const hour = new Date().getHours();
  let greeting = '早上好';
  if (hour >= 12 && hour < 18) {
    greeting = '下午好';
  } else if (hour >= 18) {
    greeting = '晚上好';
  }

  // 获取今日打卡状态
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRecord = await prisma.healthRecord.findFirst({
    where: {
      userId,
      recordDate: {
        gte: today,
        lt: tomorrow,
      },
    },
  });

  // 获取今日用药
  const todayMedications = await getTodayMedications(userId);

  // 获取未读预警
  const unreadAlerts = await getUnreadAlertCount(userId);

  // 获取最近的预警（最多3条）
  const alertsData = await getAlerts(userId, { isRead: false, pageSize: 3 });

  // 获取最近指标
  const recentMetrics = await getRecentMetrics(userId, 4);

  return {
    user: {
      name: user.profile?.name,
      greeting,
    },
    today: {
      date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
      checkIn: {
        weight: {
          recorded: todayRecord?.weight !== null && todayRecord?.weight !== undefined,
          value: todayRecord?.weight,
        },
        bloodPressure: {
          recorded:
            todayRecord?.bloodPressureSystolic !== null &&
            todayRecord?.bloodPressureSystolic !== undefined,
          systolic: todayRecord?.bloodPressureSystolic,
          diastolic: todayRecord?.bloodPressureDiastolic,
        },
        urineVolume: {
          recorded: todayRecord?.urineVolume !== null && todayRecord?.urineVolume !== undefined,
          value: todayRecord?.urineVolume,
        },
      },
    },
    medications: todayMedications.medications,
    alerts: alertsData.list.map((alert) => ({
      id: alert.id,
      level: alert.level,
      message: alert.message,
    })),
    recentMetrics,
  };
}
