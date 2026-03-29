/**
 * Web Push 推送服务
 * @description 实现浏览器推送通知，用于用药提醒
 */

import logger from '../utils/logger';

// Web Push配置
interface WebPushConfig {
  publicKey: string;
  privateKey: string;
  subject: string; // 邮箱或URL
}

// 推送订阅信息
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Web Push配置
const webPushConfig: WebPushConfig = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
};

// 内存中存储订阅（生产环境应使用Redis或数据库）
const subscriptions = new Map<string, PushSubscription[]>();

/**
 * 保存用户的推送订阅
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const userSubscriptions = subscriptions.get(userId) || [];

  // 检查是否已存在相同的订阅
  const exists = userSubscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint
  );

  if (!exists) {
    userSubscriptions.push(subscription);
    subscriptions.set(userId, userSubscriptions);
    logger.info(`用户 ${userId} 订阅了推送通知`);
  }
}

/**
 * 删除用户的推送订阅
 */
export async function removeSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const userSubscriptions = subscriptions.get(userId) || [];
  const filtered = userSubscriptions.filter(
    (sub) => sub.endpoint !== endpoint
  );

  if (filtered.length !== userSubscriptions.length) {
    subscriptions.set(userId, filtered);
    logger.info(`用户 ${userId} 取消了推送订阅`);
  }
}

/**
 * 获取用户的所有订阅
 */
export async function getUserSubscriptions(
  userId: string
): Promise<PushSubscription[]> {
  return subscriptions.get(userId) || [];
}

/**
 * 发送推送通知
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Promise<boolean> {
  if (!webPushConfig.publicKey || !webPushConfig.privateKey) {
    logger.info(`[WebPush模拟] 标题: ${payload.title}, 内容: ${payload.body}`);
    return true;
  }

  try {
    // 使用web-push库发送推送
    const webPush = await import('web-push');

    webPush.setVapidDetails(
      webPushConfig.subject,
      webPushConfig.publicKey,
      webPushConfig.privateKey
    );

    await webPush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );

    logger.info(`推送通知发送成功: ${payload.title}`);
    return true;
  } catch (error) {
    // 410 Gone 或 404 Not Found 表示订阅已过期
    if (error instanceof Error &&
        (error.message.includes('410') || error.message.includes('404'))) {
      logger.warn(`推送订阅已过期: ${subscription.endpoint}`);
      return false;
    }

    logger.error('发送推送通知失败', error);
    return false;
  }
}

/**
 * 发送用药提醒推送
 */
export async function sendMedicationPush(
  userId: string,
  medicationName: string,
  dosage: string
): Promise<{ success: number; failed: number }> {
  const userSubscriptions = await getUserSubscriptions(userId);

  if (userSubscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const subscription of userSubscriptions) {
    const result = await sendPushNotification(subscription, {
      title: '用药提醒',
      body: `该服用 ${medicationName} 了，剂量：${dosage}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'medication-reminder',
      data: {
        type: 'medication',
        medicationName,
        dosage,
        url: '/medications',
      },
    });

    if (result) {
      success++;
    } else {
      failed++;
      // 删除过期订阅
      await removeSubscription(userId, subscription.endpoint);
    }
  }

  return { success, failed };
}

/**
 * 发送漏服提醒推送
 */
export async function sendMissedMedicationPush(
  userId: string,
  medicationName: string,
  scheduledTime: string
): Promise<{ success: number; failed: number }> {
  const userSubscriptions = await getUserSubscriptions(userId);

  if (userSubscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const subscription of userSubscriptions) {
    const result = await sendPushNotification(subscription, {
      title: '漏服提醒',
      body: `您错过了 ${scheduledTime} 的 ${medicationName} 用药`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'missed-medication',
      data: {
        type: 'missed',
        medicationName,
        scheduledTime,
        url: '/medications',
      },
    });

    if (result) {
      success++;
    } else {
      failed++;
      await removeSubscription(userId, subscription.endpoint);
    }
  }

  return { success, failed };
}

/**
 * 发送异常指标提醒
 */
export async function sendAbnormalMetricPush(
  userId: string,
  metricName: string,
  value: string
): Promise<{ success: number; failed: number }> {
  const userSubscriptions = await getUserSubscriptions(userId);

  if (userSubscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const subscription of userSubscriptions) {
    const result = await sendPushNotification(subscription, {
      title: '健康提醒',
      body: `您的${metricName}指标异常：${value}，建议及时就医`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'abnormal-metric',
      data: {
        type: 'abnormal',
        metricName,
        value,
        url: '/records',
      },
    });

    if (result) {
      success++;
    } else {
      failed++;
      await removeSubscription(userId, subscription.endpoint);
    }
  }

  return { success, failed };
}

/**
 * 检查Web Push是否可用
 */
export function isWebPushAvailable(): boolean {
  return !!(webPushConfig.publicKey && webPushConfig.privateKey);
}

/**
 * 生成VAPID密钥对（用于初始化配置）
 */
export async function generateVAPIDKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const webPush = await import('web-push');
  return webPush.generateVAPIDKeys();
}

export default {
  saveSubscription,
  removeSubscription,
  getUserSubscriptions,
  sendMedicationPush,
  sendMissedMedicationPush,
  sendAbnormalMetricPush,
  isWebPushAvailable,
  generateVAPIDKeys,
};
