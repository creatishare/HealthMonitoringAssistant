export const TRANSPLANT_RISK_DISCLAIMER =
  '本提示仅基于已记录数据做复查提醒，不能替代移植医生的判断；请按医嘱处理。';

export const CREATININE_WARNING_CHANGE = 0.1;
export const CREATININE_CRITICAL_CHANGE = 0.25;

export type TransplantRiskLevel = 'info' | 'warning' | 'critical';
export type TransplantRiskTone = 'green' | 'yellow' | 'red' | 'gray';

export type TransplantRiskMissingField =
  | 'baselineCreatinine'
  | 'creatinine'
  | 'egfr'
  | 'urineProteinCreatinineRatio'
  | 'urineAlbuminCreatinineRatio'
  | 'tacrolimus'
  | 'tacrolimusTargetRange'
  | 'bkVirusCopies'
  | 'cmvVirusCopies'
  | 'ebvVirusCopies';

export interface TransplantRiskRecord {
  recordDate: string;
  creatinine?: number | null;
  egfr?: number | null;
  tacrolimus?: number | null;
  urineProteinCreatinineRatio?: number | null;
  urineAlbuminCreatinineRatio?: number | null;
  bkVirusCopies?: number | null;
  cmvVirusCopies?: number | null;
  ebvVirusCopies?: number | null;
}

export interface TransplantRiskInput {
  userType?: 'kidney_failure' | 'kidney_transplant' | 'other' | null;
  hasTransplant?: boolean | null;
  transplantDate?: string | null;
  baselineCreatinine?: number | null;
  tacrolimusTargetMin?: number | null;
  tacrolimusTargetMax?: number | null;
  records: TransplantRiskRecord[];
}

export interface TransplantRiskResult {
  level: TransplantRiskLevel;
  tone: TransplantRiskTone;
  title: string;
  message: string;
  suggestedAction: string;
  missingFields: TransplantRiskMissingField[];
  disclaimer: string;
  creatinineChangePercent?: number;
  latestRecordDate?: string;
  primaryReason: 'not_transplant' | 'missing_data' | 'creatinine_change' | 'creatinine_trend' | 'tacrolimus_target' | 'stable';
}

const MISSING_FIELD_LABELS: Record<TransplantRiskMissingField, string> = {
  baselineCreatinine: '个人基线肌酐',
  creatinine: '肌酐',
  egfr: 'eGFR',
  urineProteinCreatinineRatio: '尿蛋白/肌酐比',
  urineAlbuminCreatinineRatio: '尿白蛋白/肌酐比',
  tacrolimus: '他克莫司',
  tacrolimusTargetRange: '他克莫司目标范围',
  bkVirusCopies: 'BK病毒载量',
  cmvVirusCopies: 'CMV病毒载量',
  ebvVirusCopies: 'EBV病毒载量',
};

function isPresentNumber(value?: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getSortedRecords(records: TransplantRiskRecord[]) {
  return [...records].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
}

function getLatestNumber(records: TransplantRiskRecord[], key: keyof TransplantRiskRecord) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const value = records[index][key];
    if (isPresentNumber(value as number | null | undefined)) {
      return value as number;
    }
  }
  return null;
}

function getLatestDate(records: TransplantRiskRecord[]) {
  return records.length > 0 ? records[records.length - 1].recordDate : undefined;
}

function getLastCreatinineValues(records: TransplantRiskRecord[], limit = 3) {
  const values: number[] = [];

  for (let index = records.length - 1; index >= 0 && values.length < limit; index -= 1) {
    const value = records[index].creatinine;
    if (isPresentNumber(value)) {
      values.unshift(value);
    }
  }

  return values;
}

function isStrictlyRising(values: number[]) {
  return values.length >= 3 && values[0] < values[1] && values[1] < values[2];
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function getMissingFields(input: TransplantRiskInput, records: TransplantRiskRecord[]): TransplantRiskMissingField[] {
  const missing: TransplantRiskMissingField[] = [];

  if (!isPresentNumber(input.baselineCreatinine)) missing.push('baselineCreatinine');
  if (!isPresentNumber(getLatestNumber(records, 'creatinine'))) missing.push('creatinine');
  if (!isPresentNumber(getLatestNumber(records, 'egfr'))) missing.push('egfr');
  if (!isPresentNumber(getLatestNumber(records, 'urineProteinCreatinineRatio'))) missing.push('urineProteinCreatinineRatio');
  if (!isPresentNumber(getLatestNumber(records, 'urineAlbuminCreatinineRatio'))) missing.push('urineAlbuminCreatinineRatio');
  if (!isPresentNumber(getLatestNumber(records, 'tacrolimus'))) missing.push('tacrolimus');
  if (!isPresentNumber(input.tacrolimusTargetMin) || !isPresentNumber(input.tacrolimusTargetMax)) {
    missing.push('tacrolimusTargetRange');
  }
  if (!isPresentNumber(getLatestNumber(records, 'bkVirusCopies'))) missing.push('bkVirusCopies');
  if (!isPresentNumber(getLatestNumber(records, 'cmvVirusCopies'))) missing.push('cmvVirusCopies');
  if (!isPresentNumber(getLatestNumber(records, 'ebvVirusCopies'))) missing.push('ebvVirusCopies');

  return missing;
}

function formatMissingFields(fields: TransplantRiskMissingField[]) {
  return fields.map((field) => MISSING_FIELD_LABELS[field]).join('、');
}

export function analyzeTransplantRisk(input: TransplantRiskInput): TransplantRiskResult {
  const isTransplant = input.hasTransplant === true || input.userType === 'kidney_transplant';
  if (!isTransplant) {
    return {
      level: 'info',
      tone: 'gray',
      title: '暂无移植专项提示',
      message: '当前档案不是肾移植术后类型，暂不生成移植专项复查提醒。',
      suggestedAction: '如档案类型有误，请先更新个人档案。',
      missingFields: [],
      disclaimer: TRANSPLANT_RISK_DISCLAIMER,
      primaryReason: 'not_transplant',
    };
  }

  const records = getSortedRecords(input.records);
  const missingFields = getMissingFields(input, records);
  const latestCreatinine = getLatestNumber(records, 'creatinine');
  const latestTacrolimus = getLatestNumber(records, 'tacrolimus');
  const latestRecordDate = getLatestDate(records);

  if (isPresentNumber(input.baselineCreatinine) && isPresentNumber(latestCreatinine)) {
    const changeRate = (latestCreatinine - input.baselineCreatinine) / input.baselineCreatinine;
    const changePercent = Math.round(changeRate * 100);

    if (changeRate > CREATININE_CRITICAL_CHANGE) {
      return {
        level: 'critical',
        tone: 'red',
        title: '建议尽快联系移植医生',
        message: `最近肌酐较个人基线上升约${changePercent}%，建议尽快联系移植医生核对近期化验结果和身体状态。`,
        suggestedAction: '尽快联系移植医生，并携带近期化验结果复诊。',
        missingFields,
        disclaimer: TRANSPLANT_RISK_DISCLAIMER,
        creatinineChangePercent: changePercent,
        latestRecordDate,
        primaryReason: 'creatinine_change',
      };
    }

    if (changeRate > CREATININE_WARNING_CHANGE) {
      return {
        level: 'warning',
        tone: 'yellow',
        title: '建议复查并观察趋势',
        message: `最近肌酐较个人基线上升约${changePercent}%，建议按医嘱复查并关注连续变化。`,
        suggestedAction: '预约复查或联系移植门诊，复诊时带上近期化验单和用药记录。',
        missingFields,
        disclaimer: TRANSPLANT_RISK_DISCLAIMER,
        creatinineChangePercent: changePercent,
        latestRecordDate,
        primaryReason: 'creatinine_change',
      };
    }

    if (isStrictlyRising(getLastCreatinineValues(records))) {
      return {
        level: 'warning',
        tone: 'yellow',
        title: '建议复查并观察趋势',
        message: '最近3次肌酐呈连续上升趋势，建议复查并观察趋势。',
        suggestedAction: '复诊时重点核对报告日期、血压、尿量和用药记录。',
        missingFields,
        disclaimer: TRANSPLANT_RISK_DISCLAIMER,
        creatinineChangePercent: changePercent,
        latestRecordDate,
        primaryReason: 'creatinine_trend',
      };
    }
  }

  if (
    isPresentNumber(latestTacrolimus) &&
    isPresentNumber(input.tacrolimusTargetMin) &&
    isPresentNumber(input.tacrolimusTargetMax) &&
    (latestTacrolimus < input.tacrolimusTargetMin || latestTacrolimus > input.tacrolimusTargetMax)
  ) {
    const direction = latestTacrolimus < input.tacrolimusTargetMin ? '低于' : '高于';
    return {
      level: 'warning',
      tone: 'yellow',
      title: '血药浓度需按医生目标范围复核',
      message: `最近他克莫司记录为 ${formatNumber(latestTacrolimus)} ng/mL，${direction}医生设定目标范围 ${formatNumber(input.tacrolimusTargetMin)}-${formatNumber(input.tacrolimusTargetMax)} ng/mL，建议按医嘱复查或联系移植门诊确认。`,
      suggestedAction: '复诊时携带采血时间、末次服药时间和用药记录。',
      missingFields,
      disclaimer: TRANSPLANT_RISK_DISCLAIMER,
      latestRecordDate,
      primaryReason: 'tacrolimus_target',
    };
  }

  if (missingFields.length > 0) {
    return {
      level: 'info',
      tone: 'gray',
      title: '建议补充移植随访资料',
      message: `建议补充数据：${formatMissingFields(missingFields)}。资料越完整，复诊前的趋势整理越有参考价值。`,
      suggestedAction: '复诊前补充最近一次化验报告、医生目标范围和随访记录。',
      missingFields,
      disclaimer: TRANSPLANT_RISK_DISCLAIMER,
      latestRecordDate,
      primaryReason: 'missing_data',
    };
  }

  return {
    level: 'info',
    tone: 'green',
    title: '核心指标暂未见明显偏离',
    message: '肌酐相对个人基线较稳定。请继续按医嘱复查，并结合医生目标范围查看血药浓度、尿蛋白和病毒载量。',
    suggestedAction: '保持连续记录，复诊时带上近30天趋势和原始化验单。',
    missingFields: [],
    disclaimer: TRANSPLANT_RISK_DISCLAIMER,
    latestRecordDate,
    primaryReason: 'stable',
  };
}
