/**
 * 通知服务
 * @description 集成阿里云短信服务，实现验证码、用药提醒等短信通知
 */

import Dypnsapi20170525, {
  SendSmsVerifyCodeRequest,
  CheckSmsVerifyCodeRequest,
} from '@alicloud/dypnsapi20170525';
import { Config as OpenApiConfig } from '@alicloud/openapi-client';
import Util, { RuntimeOptions } from '@alicloud/tea-util';
import Credential, { Config as CredentialConfig } from '@alicloud/credentials';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

interface SMSConfig {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  endpoint: string;
  verificationTemplateCode: string;
  verificationValidTimeSeconds: number;
  verificationCodeLength: number;
  verificationIntervalSeconds: number;
}

interface AliyunCommonResponse {
  code?: string;
  message?: string;
  requestId?: string;
  model?: {
    bizId?: string;
    outId?: string;
    verifyCode?: string;
  };
  success?: boolean;
}

export enum SMSTemplate {
  VERIFICATION_CODE = 'VERIFICATION_CODE',
  MEDICATION_REMINDER = 'MEDICATION_REMINDER',
  MISS_MEDICATION = 'MISS_MEDICATION',
  ABNORMAL_ALERT = 'ABNORMAL_ALERT',
}

const smsConfig: SMSConfig = {
  accessKeyId: process.env.SMS_ACCESS_KEY || '',
  accessKeySecret: process.env.SMS_SECRET_KEY || '',
  signName: process.env.SMS_SIGN_NAME || '',
  endpoint: process.env.SMS_ENDPOINT || 'https://dypnsapi.aliyuncs.com',
  verificationTemplateCode: process.env.SMS_TEMPLATE_CODE_VERIFICATION || '',
  verificationValidTimeSeconds: Number(process.env.SMS_VERIFICATION_VALID_TIME || 300),
  verificationCodeLength: Number(process.env.SMS_VERIFICATION_CODE_LENGTH || 6),
  verificationIntervalSeconds: Number(process.env.SMS_VERIFICATION_INTERVAL || 60),
};

const templateCodes: Record<Exclude<SMSTemplate, SMSTemplate.VERIFICATION_CODE>, string> = {
  [SMSTemplate.MEDICATION_REMINDER]: process.env.SMS_TEMPLATE_CODE_REMINDER || '',
  [SMSTemplate.MISS_MEDICATION]: process.env.SMS_TEMPLATE_CODE_MISS || '',
  [SMSTemplate.ABNORMAL_ALERT]: process.env.SMS_TEMPLATE_CODE_ALERT || '',
};

interface VerificationSendResult {
  success: boolean;
  requestId?: string;
  bizId?: string;
  outId?: string;
  verifyCode?: string;
  error?: string;
}

let smsClient: Dypnsapi20170525 | null = null;

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/^https?:\/\//, '');
}

function getSMSClient(): Dypnsapi20170525 {
  if (smsClient) {
    return smsClient;
  }

  const credential = new Credential(new CredentialConfig({
    type: 'access_key',
    accessKeyId: smsConfig.accessKeyId,
    accessKeySecret: smsConfig.accessKeySecret,
  }));

  const config = new OpenApiConfig({
    credential,
  });

  config.endpoint = normalizeEndpoint(smsConfig.endpoint);
  const client = new Dypnsapi20170525(config);
  smsClient = client;
  return client;
}

function getAliyunErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error';
}

function logAliyunError(action: string, phone: string, error: unknown): void {
  if (typeof error === 'object' && error !== null) {
    const errorWithData = error as { message?: string; data?: Record<string, unknown> };
    logger.error(`阿里云短信接口异常: ${action}`, {
      phone,
      message: errorWithData.message,
      data: errorWithData.data,
    });
    return;
  }

  logger.error(`阿里云短信接口异常: ${action}`, { phone, error: String(error) });
}

function isAliyunSuccess(data: AliyunCommonResponse): boolean {
  return data.code === 'OK' && data.success === true;
}

async function sendSMS(
  phone: string,
  template: Exclude<SMSTemplate, SMSTemplate.VERIFICATION_CODE>,
  templateParam: Record<string, string>
): Promise<boolean> {
  if (!smsConfig.accessKeyId || !smsConfig.accessKeySecret) {
    logger.info(`[SMS模拟] 发送到 ${phone}: 模板=${template}, 参数=${JSON.stringify(templateParam)}`);
    return true;
  }

  logger.warn('普通短信模板发送尚未接入阿里云官方 SDK', { phone, template, templateParam });
  return false;
}

export async function sendVerificationCode(phone: string): Promise<VerificationSendResult> {
  if (!smsConfig.accessKeyId || !smsConfig.accessKeySecret) {
    const length = smsConfig.verificationCodeLength;
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const verifyCode = Math.floor(min + Math.random() * (max - min + 1)).toString();
    logger.info(`[SMS模拟] 发送验证码到 ${phone}: ${verifyCode}`);
    return {
      success: true,
      verifyCode,
    };
  }

  if (!smsConfig.signName || !smsConfig.verificationTemplateCode) {
    throw new AppError('短信验证码签名或模板未配置', 500, '00001');
  }

  if (!Number.isInteger(smsConfig.verificationCodeLength) || smsConfig.verificationCodeLength < 4 || smsConfig.verificationCodeLength > 8) {
    throw new AppError('短信验证码长度配置无效', 500, '00001');
  }

  if (smsConfig.verificationValidTimeSeconds <= 0 || smsConfig.verificationIntervalSeconds <= 0) {
    throw new AppError('短信验证码时效配置无效', 500, '00001');
  }

  try {
    const request = new SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: smsConfig.signName,
      templateCode: smsConfig.verificationTemplateCode,
      templateParam: JSON.stringify({
        code: '##code##',
        min: String(Math.ceil(smsConfig.verificationValidTimeSeconds / 60)),
      }),
      codeLength: smsConfig.verificationCodeLength,
      validTime: smsConfig.verificationValidTimeSeconds,
      interval: smsConfig.verificationIntervalSeconds,
      returnVerifyCode: true,
    });

    const response = await getSMSClient().sendSmsVerifyCodeWithOptions(request, new RuntimeOptions({}));
    const data = response.body as AliyunCommonResponse;

    if (!isAliyunSuccess(data)) {
      logger.error('验证码短信发送失败', {
        phone,
        code: data.code,
        message: data.message,
        requestId: data.requestId,
        model: data.model,
      });
      return {
        success: false,
        error: `${data.code || 'UNKNOWN'}: ${data.message || '短信发送失败'}`,
      };
    }

    return {
      success: true,
      requestId: data.requestId,
      bizId: data.model?.bizId,
      outId: data.model?.outId,
      verifyCode: data.model?.verifyCode,
    };
  } catch (error: unknown) {
    logAliyunError('SendSmsVerifyCode', phone, error);
    return {
      success: false,
      error: getAliyunErrorMessage(error),
    };
  }
}

export async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  if (!smsConfig.accessKeyId || !smsConfig.accessKeySecret) {
    return false;
  }

  try {
    const request = new CheckSmsVerifyCodeRequest({
      phoneNumber: phone,
      verifyCode: code,
    });

    const response = await getSMSClient().checkSmsVerifyCodeWithOptions(request, new RuntimeOptions({}));
    const data = response.body;
    return data?.code === 'OK' && data?.model?.verifyResult === 'PASS';
  } catch (error: unknown) {
    logAliyunError('CheckSmsVerifyCode', phone, error);
    return false;
  }
}

export async function sendMedicationReminder(
  phone: string,
  medicationName: string,
  dosage: string,
  time: string
): Promise<boolean> {
  return sendSMS(phone, SMSTemplate.MEDICATION_REMINDER, {
    medication: medicationName,
    dosage,
    time,
  });
}

export async function sendMissedMedicationAlert(
  phone: string,
  medicationName: string,
  scheduledTime: string
): Promise<boolean> {
  return sendSMS(phone, SMSTemplate.MISS_MEDICATION, {
    medication: medicationName,
    time: scheduledTime,
  });
}

export async function sendAbnormalAlert(
  phone: string,
  metricName: string,
  value: string,
  threshold: string
): Promise<boolean> {
  return sendSMS(phone, SMSTemplate.ABNORMAL_ALERT, {
    metric: metricName,
    value,
    threshold,
  });
}

export function isSMSServiceAvailable(): boolean {
  return !!(
    smsConfig.accessKeyId &&
    smsConfig.accessKeySecret &&
    smsConfig.signName &&
    smsConfig.verificationTemplateCode
  );
}

export function getSMSConfig(): Readonly<Pick<SMSConfig, 'verificationCodeLength' | 'verificationValidTimeSeconds' | 'verificationIntervalSeconds'>> {
  return {
    verificationCodeLength: smsConfig.verificationCodeLength,
    verificationValidTimeSeconds: smsConfig.verificationValidTimeSeconds,
    verificationIntervalSeconds: smsConfig.verificationIntervalSeconds,
  };
}

export async function sendBatchMedicationReminders(
  reminders: Array<{
    phone: string;
    medicationName: string;
    dosage: string;
    time: string;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const reminder of reminders) {
    const result = await sendMedicationReminder(
      reminder.phone,
      reminder.medicationName,
      reminder.dosage,
      reminder.time
    );
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

export default {
  sendVerificationCode,
  verifySmsCode,
  sendMedicationReminder,
  sendMissedMedicationAlert,
  sendAbnormalAlert,
  isSMSServiceAvailable,
  sendBatchMedicationReminders,
  SMSTemplate,
};
