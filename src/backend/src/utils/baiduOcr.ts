import logger from '../utils/logger';

// 百度OCR配置
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY || '';
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY || '';

// Token缓存
let accessTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * 获取百度OCR Access Token
 */
export async function getAccessToken(): Promise<string> {
  // 检查缓存的token是否有效（提前5分钟过期）
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return accessTokenCache.token;
  }

  try {
    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_OCR_API_KEY}&client_secret=${BAIDU_OCR_SECRET_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Token请求失败: ${response.status}`);
    }

    const data = await response.json() as {
      error?: string;
      error_description?: string;
      access_token: string;
      expires_in: number;
    };

    if (data.error) {
      throw new Error(`Token获取失败: ${data.error_description}`);
    }

    // 缓存token
    accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    logger.info('百度OCR Access Token 获取成功');
    return data.access_token;
  } catch (error) {
    logger.error('获取百度OCR Token失败:', error);
    throw error;
  }
}

/**
 * 调用百度高精度文字识别API
 * @param imageBase64 图片Base64编码
 */
export async function recognizeText(imageBase64: string): Promise<{
  words_result: Array<{ words: string; probability?: { average: number } }>;
  words_result_num: number;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        image: imageBase64,
        language_type: 'CHN_ENG',
        detect_direction: 'true',
        paragraph: 'true',
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OCR识别请求失败: ${response.status}`);
  }

  const data = await response.json() as {
    error_code?: number;
    error_msg?: string;
    words_result: Array<{ words: string; probability?: { average: number } }>;
    words_result_num: number;
  };

  if (data.error_code) {
    throw new Error(`OCR识别失败: ${data.error_msg} (code: ${data.error_code})`);
  }

  return {
    words_result: data.words_result,
    words_result_num: data.words_result_num,
  };
}

/**
 * 调用百度医疗报告识别API
 * @param imageBase64 图片Base64编码
 */
export async function recognizeMedicalReport(imageBase64: string): Promise<{
  words_result: Array<{ words: string; probability?: { average: number } }>;
  words_result_num: number;
}> {
  const accessToken = await getAccessToken();

  // 使用医疗报告专用API
  const response = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/health_report?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        image: imageBase64,
      }),
    }
  );

  if (!response.ok) {
    // 如果医疗报告API不可用，降级到通用高精度识别
    logger.warn('医疗报告API不可用，降级到通用OCR');
    return recognizeText(imageBase64);
  }

  const data = await response.json() as {
    error_code?: number;
    error_msg?: string;
    words_result?: Array<{ words: string; probability?: { average: number } }>;
    words_result_num?: number;
  };

  if (data.error_code) {
    // 降级到通用OCR
    logger.warn(`医疗报告API错误: ${data.error_msg}，降级到通用OCR`);
    return recognizeText(imageBase64);
  }

  return {
    words_result: data.words_result || [],
    words_result_num: data.words_result_num || 0,
  };
}

/**
 * 读取图片文件并转换为Base64
 */
export function imageFileToBase64(filePath: string): string {
  const fs = require('fs');
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString('base64');
}

/**
 * 检查OCR配置是否完整
 */
export function isOCRConfigValid(): boolean {
  return !!(BAIDU_OCR_API_KEY && BAIDU_OCR_SECRET_KEY);
}
