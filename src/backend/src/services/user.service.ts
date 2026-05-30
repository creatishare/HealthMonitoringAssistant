import prisma from '../config/database';
import { DialysisType, PrimaryDisease, Gender, UserType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { formatDateOnly, getDateOnlyValue } from '../utils/app-date';

interface UserProfileUpdateInput {
  name?: string;
  gender?: Gender;
  birthDate?: string;
  height?: number;
  currentWeight?: number;
  userType?: UserType;
  onboardingCompleted?: boolean;
  dialysisType?: DialysisType;
  dryWeight?: number;
  baselineCreatinine?: number;
  tacrolimusTargetMin?: number;
  tacrolimusTargetMax?: number;
  diagnosisDate?: string;
  primaryDisease?: PrimaryDisease;
  hasTransplant?: boolean;
  transplantDate?: string;
}

// 获取用户档案
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw new AppError('用户不存在', 404, '01004');
  }

  return {
    userId: user.id,
    phone: user.phone,
    name: user.profile?.name,
    gender: user.profile?.gender,
    birthDate: formatDateOnly(user.profile?.birthDate),
    height: user.profile?.height,
    currentWeight: user.profile?.currentWeight,
    userType: user.profile?.userType,
    onboardingCompleted: user.profile?.onboardingCompleted ?? false,
    dialysisType: user.profile?.dialysisType,
    dryWeight: user.profile?.dryWeight,
    baselineCreatinine: user.profile?.baselineCreatinine,
    tacrolimusTargetMin: user.profile?.tacrolimusTargetMin,
    tacrolimusTargetMax: user.profile?.tacrolimusTargetMax,
    diagnosisDate: formatDateOnly(user.profile?.diagnosisDate),
    primaryDisease: user.profile?.primaryDisease,
    hasTransplant: user.profile?.hasTransplant,
    transplantDate: formatDateOnly(user.profile?.transplantDate),
    createdAt: user.createdAt,
    updatedAt: user.profile?.updatedAt,
  };
}

// 更新用户档案
export async function updateUserProfile(userId: string, data: UserProfileUpdateInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('用户不存在', 404, '01004');
  }

  if (
    data.tacrolimusTargetMin !== undefined &&
    data.tacrolimusTargetMax !== undefined &&
    data.tacrolimusTargetMin > data.tacrolimusTargetMax
  ) {
    throw new AppError('他克莫司目标下限不能高于上限', 400, '00002');
  }

  const profileData: Record<string, unknown> = {
    ...data,
    birthDate: data.birthDate ? getDateOnlyValue(data.birthDate) : undefined,
    diagnosisDate: data.diagnosisDate ? getDateOnlyValue(data.diagnosisDate) : undefined,
    transplantDate: data.transplantDate ? getDateOnlyValue(data.transplantDate) : undefined,
  };

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
      dialysisType: (profileData.dialysisType as DialysisType | undefined) || 'none',
      onboardingCompleted: (profileData.onboardingCompleted as boolean | undefined) ?? false,
    },
  });

  return profile;
}

// 完成首次登录初始化
export async function completeOnboarding(
  userId: string,
  userType: UserType,
  primaryDisease?: PrimaryDisease,
  extraData?: Partial<UserProfileUpdateInput>
) {
  const profileUpdates: UserProfileUpdateInput = {
    userType,
    onboardingCompleted: true,
    primaryDisease,
    ...extraData,
  };

  if (userType === 'kidney_failure') {
    profileUpdates.hasTransplant = false;
  }

  if (userType === 'kidney_transplant') {
    profileUpdates.hasTransplant = true;
  }

  return updateUserProfile(userId, profileUpdates);
}
