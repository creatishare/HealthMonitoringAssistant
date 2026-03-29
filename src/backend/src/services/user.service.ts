import prisma from '../config/database';
import { DialysisType, PrimaryDisease, Gender } from '@prisma/client';

// 获取用户档案
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    userId: user.id,
    phone: user.phone,
    name: user.profile?.name,
    gender: user.profile?.gender,
    birthDate: user.profile?.birthDate?.toISOString().split('T')[0],
    height: user.profile?.height,
    currentWeight: user.profile?.currentWeight,
    dialysisType: user.profile?.dialysisType,
    dryWeight: user.profile?.dryWeight,
    baselineCreatinine: user.profile?.baselineCreatinine,
    diagnosisDate: user.profile?.diagnosisDate?.toISOString().split('T')[0],
    primaryDisease: user.profile?.primaryDisease,
    createdAt: user.createdAt,
    updatedAt: user.profile?.updatedAt,
  };
}

// 更新用户档案
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    gender?: Gender;
    birthDate?: string;
    height?: number;
    currentWeight?: number;
    dialysisType?: DialysisType;
    dryWeight?: number;
    baselineCreatinine?: number;
    diagnosisDate?: string;
    primaryDisease?: PrimaryDisease;
  }
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 转换日期字符串为Date对象
  const profileData: any = {
    ...data,
    birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    diagnosisDate: data.diagnosisDate ? new Date(data.diagnosisDate) : undefined,
  };

  // 移除undefined字段
  Object.keys(profileData).forEach((key) => {
    if (profileData[key] === undefined) {
      delete profileData[key];
    }
  });

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: profileData,
    create: {
      userId,
      ...profileData,
      dialysisType: profileData.dialysisType || 'none',
    },
  });

  return profile;
}
