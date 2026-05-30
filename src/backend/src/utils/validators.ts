// 手机号验证
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 验证码验证（默认6位数字，长度可配置）
export function isValidVerificationCode(code: string, length: number = 6): boolean {
  if (!Number.isInteger(length) || length < 4 || length > 8) {
    length = 6;
  }
  const regex = new RegExp(`^\\d{${length}}$`);
  return regex.test(code);
}

// 日期验证（YYYY-MM-DD）
export function isValidDate(date: string): boolean {
  if (typeof date !== 'string') return false;

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;

  const d = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
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
  const labels: Record<string, string> = {
    creatinine: '肌酐',
    urea: '尿素氮',
    potassium: '血钾',
    sodium: '血钠',
    phosphorus: '血磷',
    uricAcid: '尿酸',
    hemoglobin: '血红蛋白',
    bloodSugar: '血糖',
    weight: '体重',
    bloodPressureSystolic: '收缩压',
    bloodPressureDiastolic: '舒张压',
    urineVolume: '尿量',
    heartRate: '心率',
    egfr: 'eGFR',
    urineProteinCreatinineRatio: '尿蛋白/肌酐比',
    urineAlbuminCreatinineRatio: '尿白蛋白/肌酐比',
    tacrolimus: '他克莫司',
    bkVirusCopies: 'BK病毒载量',
    cmvVirusCopies: 'CMV病毒载量',
    ebvVirusCopies: 'EBV病毒载量',
  };

  // 仅用于拦截明显非法录入值，不代表医学参考范围。
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
    heartRate: { min: 20, max: 250 },
    egfr: { min: 0, max: 200 },
    urineProteinCreatinineRatio: { min: 0, max: 10000 },
    urineAlbuminCreatinineRatio: { min: 0, max: 10000 },
    tacrolimus: { min: 0, max: 100 },
    bkVirusCopies: { min: 0, max: 1_000_000_000_000 },
    cmvVirusCopies: { min: 0, max: 1_000_000_000_000 },
    ebvVirusCopies: { min: 0, max: 1_000_000_000_000 },
  };

  const range = ranges[metric];
  if (!range) return { valid: true };
  const label = labels[metric] || metric;

  if (range.min !== undefined && value < range.min) {
    return { valid: false, message: `${label}不能小于${range.min}` };
  }

  if (range.max !== undefined && value > range.max) {
    return { valid: false, message: `${label}不能大于${range.max}` };
  }

  return { valid: true };
}
