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

  // 查询当天所有记录（按创建时间倒序，最新的在前面）
  const todayRecords = await prisma.healthRecord.findMany({
    where: {
      userId,
      recordDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 从当天多条记录中聚合打卡数据
  // 体重/血压取最新一条非空值；尿量累加所有非空值
  const latestWeight = todayRecords.find((r) => r.weight != null)?.weight;
  const latestBloodPressureRecord = todayRecords.find(
    (r) => r.bloodPressureSystolic != null && r.bloodPressureDiastolic != null
  );
  const totalUrineVolume = todayRecords.reduce((sum, r) => {
    if (r.urineVolume != null) return sum + r.urineVolume;
    return sum;
  }, 0);

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
          recorded: latestWeight != null,
          value: latestWeight,
          status: getWeightStatus(latestWeight, user.profile?.dryWeight),
        },
        bloodPressure: {
          recorded: latestBloodPressureRecord != null,
          systolic: latestBloodPressureRecord?.bloodPressureSystolic,
          diastolic: latestBloodPressureRecord?.bloodPressureDiastolic,
          status: getBloodPressureStatus(
            latestBloodPressureRecord?.bloodPressureSystolic,
            latestBloodPressureRecord?.bloodPressureDiastolic
          ),
        },
        urineVolume: {
          recorded: totalUrineVolume > 0,
          value: totalUrineVolume > 0 ? totalUrineVolume : undefined,
          status: getUrineVolumeStatus(totalUrineVolume > 0 ? totalUrineVolume : null),
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
