// 手机号验证
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 验证码验证（6位数字）
export function isValidVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// 日期验证（YYYY-MM-DD）
export function isValidDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

// 时间验证（HH:mm）
export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

// 指标值范围验证
export function validateMetricRange(
  metric: string,
  value: number
): { valid: boolean; message?: string } {
  const ranges: Record<string, { min?: number; max?: number }> = {
    creatinine: { min: 0, max: 5000 },
    urea: { min: 0, max: 100 },
    potassium: { min: 0, max: 20 },
    sodium: { min: 50, max: 200 },
    phosphorus: { min: 0, max: 10 },
    uricAcid: { min: 0, max: 2000 },
    hemoglobin: { min: 0, max: 300 },
    bloodSugar: { min: 0, max: 50 },
    weight: { min: 0, max: 500 },
    bloodPressureSystolic: { min: 50, max: 300 },
    bloodPressureDiastolic: { min: 30, max: 200 },
    urineVolume: { min: 0, max: 10000 },
  };

  const range = ranges[metric];
  if (!range) return { valid: true };

  if (range.min !== undefined && value < range.min) {
    return { valid: false, message: `${metric}不能小于${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { valid: false, message: `${metric}不能大于${range.max}` };
  }

  return { valid: true };
}
