import prisma from '../config/database';
import { AppError } from '../utils/errors';
import { getRecentMetrics } from './health-record.service';
import { getTodayMedications } from './medication.service';
import { getUnreadAlertCount, getAlerts } from './alert.service';

function getBloodPressureStatus(
  systolic?: number | null,
  diastolic?: number | null
): 'normal' | 'warning' | 'critical' | undefined {
  if (systolic == null && diastolic == null) return undefined;

  if (systolic != null && (systolic > 180 || systolic < 60)) return 'critical';
  if (diastolic != null && (diastolic > 120 || diastolic < 40)) return 'critical';

  if (systolic != null && (systolic > 140 || systolic < 90)) return 'warning';
  if (diastolic != null && (diastolic > 90 || diastolic < 60)) return 'warning';

  return 'normal';
}

function getUrineVolumeStatus(volume?: number | null): 'normal' | 'warning' | 'critical' | undefined {
  if (volume == null) return undefined;
  if (volume < 100) return 'critical';
  if (volume < 400 || volume > 5000) return 'warning';
  return 'normal';
}

function getWeightStatus(weight?: number | null, dryWeight?: number | null): 'normal' | 'warning' | 'critical' | undefined {
  if (weight == null) return undefined;
  if (dryWeight != null && Math.abs(weight - dryWeight) > 3) return 'warning';
  return 'normal';
}

// 获取仪表盘数据
export async function getDashboardData(userId: string) {
  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError('用户不存在', 404, '01004');
  }

  // 获取问候语
  const hour = new Date().getHours();
  let greeting = '早上好';
  if (hour >= 12 && hour < 18) {
    greeting = '下午好';
  } else if (hour >= 18) {
    greeting = '晚上好';
  }

  // 获取今日打卡状态（使用UTC日期避免时区偏移导致查不到当天记录）
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);
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
      userType: user.profile?.userType,
      primaryDisease: user.profile?.primaryDisease,
    },
    today: {
      date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
      checkIn: {
        weight: {
          recorded: todayRecord?.weight !== null && todayRecord?.weight !== undefined,
          value: todayRecord?.weight,
          status: getWeightStatus(todayRecord?.weight, user.profile?.dryWeight),
        },
        bloodPressure: {
          recorded:
            todayRecord?.bloodPressureSystolic !== null &&
            todayRecord?.bloodPressureSystolic !== undefined,
          systolic: todayRecord?.bloodPressureSystolic,
          diastolic: todayRecord?.bloodPressureDiastolic,
          status: getBloodPressureStatus(todayRecord?.bloodPressureSystolic, todayRecord?.bloodPressureDiastolic),
        },
        urineVolume: {
          recorded: todayRecord?.urineVolume !== null && todayRecord?.urineVolume !== undefined,
          value: todayRecord?.urineVolume,
          status: getUrineVolumeStatus(todayRecord?.urineVolume),
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
