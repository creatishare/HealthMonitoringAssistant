/**
 * 肾衰竭健康监测应用 - 共享类型定义
 * @version 1.0.0
 * @date 2026-03-29
 *
 * 此文件包含前后端共享的 TypeScript 类型定义
 * 由技术架构师 Agent 生成
 */

// ============================================================================
// 基础类型
// ============================================================================

/** 唯一标识符 */
export type UUID = string;

/** 日期字符串格式 (YYYY-MM-DD) */
export type DateString = string;

/** ISO 8601 时间字符串 */
export type ISODateTime = string;

/** 时间字符串格式 (HH:mm) */
export type TimeString = string;

// ============================================================================
// 用户相关类型
// ============================================================================

/** 性别 */
export type Gender = 'male' | 'female';

/** 透析类型 */
export type DialysisType = 'none' | 'hemodialysis' | 'peritoneal';

/** 原发疾病 */
export type PrimaryDisease =
  | 'diabetic_nephropathy'
  | 'hypertensive_nephropathy'
  | 'chronic_glomerulonephritis'
  | 'other';

/** 用户基础信息 */
export interface User {
  id: UUID;
  phone: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  profile?: UserProfile;
}

/** 用户档案 */
export interface UserProfile {
  userId: UUID;
  name?: string;
  gender?: Gender;
  birthDate?: DateString;
  height?: number; // cm
  currentWeight?: number; // kg
  dialysisType: DialysisType;
  dryWeight?: number; // 干体重(kg)，透析患者使用
  baselineCreatinine?: number; // 基线肌酐值(μmol/L)
  diagnosisDate?: DateString;
  primaryDisease?: PrimaryDisease;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** 用户档案表单数据（用于创建/更新） */
export interface UserProfileFormData {
  name?: string;
  gender?: Gender;
  birthDate?: DateString;
  height?: number;
  currentWeight?: number;
  dialysisType?: DialysisType;
  dryWeight?: number;
  baselineCreatinine?: number;
  diagnosisDate?: DateString;
  primaryDisease?: PrimaryDisease;
}

// ============================================================================
// 健康记录类型
// ============================================================================

/** 健康指标记录 */
export interface HealthRecord {
  id: UUID;
  userId: UUID;
  recordDate: DateString; // YYYY-MM-DD

  // 肾功能指标
  creatinine?: number; // 血清肌酐 (μmol/L)，正常范围: 44-133
  urea?: number; // 尿素氮 (mmol/L)，正常范围: 2.6-7.5

  // 电解质指标
  potassium?: number; // 血钾 (mmol/L)，正常范围: 3.5-5.3
  sodium?: number; // 血钠 (mmol/L)，正常范围: 136-145
  phosphorus?: number; // 血磷 (mmol/L)，正常范围: 0.87-1.45

  // 其他血液指标
  uricAcid?: number; // 尿酸 (μmol/L)，男性: 150-416, 女性: 89-357
  hemoglobin?: number; // 血红蛋白 (g/L)，正常范围: 120-160
  bloodSugar?: number; // 血糖 (mmol/L)，正常范围: 3.9-6.1

  // 日常监测指标
  weight?: number; // 体重 (kg)
  bloodPressureSystolic?: number; // 收缩压 (mmHg)，正常: <140
  bloodPressureDiastolic?: number; // 舒张压 (mmHg)，正常: <90
  urineVolume?: number; // 尿量 (ml/24h)

  // 元数据
  notes?: string;
  source?: 'manual' | 'ocr' | 'import';
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** 健康记录表单数据 */
export interface HealthRecordFormData {
  recordDate: DateString;
  creatinine?: number;
  urea?: number;
  potassium?: number;
  sodium?: number;
  phosphorus?: number;
  uricAcid?: number;
  hemoglobin?: number;
  bloodSugar?: number;
  weight?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  urineVolume?: number;
  notes?: string;
}

/** 健康指标参考范围 */
export interface MetricReferenceRange {
  metric: keyof Omit<HealthRecord, 'id' | 'userId' | 'recordDate' | 'notes' | 'source' | 'createdAt' | 'updatedAt'>;
  name: string;
  unit: string;
  min?: number;
  max?: number;
  gender?: 'male' | 'female' | 'all';
}

/** 趋势数据点 */
export interface TrendDataPoint {
  date: DateString;
  [metric: string]: number | DateString | undefined;
}

/** 趋势查询参数 */
export interface TrendQueryParams {
  metrics: string[];
  startDate: DateString;
  endDate: DateString;
}

/** 趋势查询结果 */
export interface TrendData {
  metrics: string[];
  startDate: DateString;
  endDate: DateString;
  data: TrendDataPoint[];
}

// ============================================================================
// 血药浓度类型
// ============================================================================

/** 药物类型 */
export type DrugType = 'cyclosporine' | 'tacrolimus' | 'sirolimus' | 'other';

/** 采样时间类型 */
export type SamplingTime = 'C0' | 'C2'; // C0=服药前, C2=服药后2小时

/** 血药浓度记录 */
export interface DrugConcentrationRecord {
  id: UUID;
  userId: UUID;
  recordDate: DateString;

  // 药物信息
  drugType: DrugType;
  drugName: string; // 药物具体名称

  // 浓度数据
  concentration: number; // ng/mL
  samplingTime: SamplingTime;

  // 时间信息
  lastDoseTime: ISODateTime; // 上次服药时间
  bloodDrawTime: ISODateTime; // 采血时间

  // 参考范围（根据药物类型自动确定）
  referenceRange: [number, number]; // [最小值, 最大值]
  isInRange: boolean; // 是否在参考范围内

  // 元数据
  notes?: string;
  createdAt: ISODateTime;
}

/** 血药浓度表单数据 */
export interface DrugConcentrationFormData {
  recordDate: DateString;
  drugType: DrugType;
  drugName: string;
  concentration: number;
  samplingTime: SamplingTime;
  lastDoseTime: ISODateTime;
  bloodDrawTime: ISODateTime;
  notes?: string;
}

/** 药物参考范围定义 */
export interface DrugReferenceRange {
  drugType: DrugType;
  drugName: string;
  C0?: [number, number]; // 服药前参考范围
  C2?: [number, number]; // 服药后2小时参考范围
}

/** 血药浓度趋势数据（关联用药记录） */
export interface DrugConcentrationTrend {
  drugType: DrugType;
  drugName: string;
  referenceRange: {
    C0?: [number, number];
    C2?: [number, number];
  };
  concentrations: Array<{
    date: DateString;
    value: number;
    samplingTime: SamplingTime;
    isInRange: boolean;
  }>;
  medicationLogs: Array<{
    date: DateString;
    status: MedicationLogStatus;
    scheduledTime: TimeString;
    actualTime?: TimeString;
  }>;
}

// ============================================================================
// 用药管理类型
// ============================================================================

/** 用药频率 */
export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_daily'
  | 'every_other_day'
  | 'weekly';

/** 用药状态 */
export type MedicationStatus = 'active' | 'paused' | 'discontinued';

/** 服药记录状态 */
export type MedicationLogStatus = 'taken' | 'missed' | 'skipped';

/** 用药提醒 */
export interface Medication {
  id: UUID;
  userId: UUID;

  // 药品信息
  name: string; // 药品名称
  specification?: string; // 规格，如 "50mg/片"

  // 用法用量
  dosage: number; // 每次剂量，如 2
  dosageUnit: string; // 剂量单位，如 "片"、"粒"、"mg"
  frequency: MedicationFrequency;

  // 提醒设置
  reminderTimes: TimeString[]; // 提醒时间，如 ["08:00", "20:00"]
  reminderMinutesBefore: number; // 提前提醒分钟数，默认 5

  // 状态
  status: MedicationStatus;

  // 元数据
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** 用药表单数据 */
export interface MedicationFormData {
  name: string;
  specification?: string;
  dosage: number;
  dosageUnit: string;
  frequency: MedicationFrequency;
  reminderTimes: TimeString[];
  reminderMinutesBefore?: number;
}

/** 服药记录 */
export interface MedicationLog {
  id: UUID;
  userId: UUID;
  medicationId: UUID;

  // 关联的用药信息（查询时填充）
  medication?: Pick<Medication, 'name' | 'dosage' | 'dosageUnit'>;

  // 时间信息
  scheduledTime: ISODateTime; // 计划服药时间
  actualTime?: ISODateTime; // 实际服药时间

  // 状态
  status: MedicationLogStatus;

  // 跳过原因
  skipReason?: string;

  // 元数据
  notes?: string;
  createdAt: ISODateTime;
}

/** 服药记录表单数据 */
export interface MedicationLogFormData {
  medicationId: UUID;
  scheduledTime: ISODateTime;
  actualTime?: ISODateTime;
  status: MedicationLogStatus;
  skipReason?: string;
  notes?: string;
}

/** 今日用药提醒项 */
export interface TodayMedicationItem {
  medicationId: UUID;
  name: string;
  dosage: number;
  dosageUnit: string;
  scheduledTime: TimeString;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  logId?: UUID;
}

/** 今日用药数据 */
export interface TodayMedications {
  date: DateString;
  medications: TodayMedicationItem[];
}

/** 用药统计 */
export interface MedicationStatistics {
  period: {
    startDate: DateString;
    endDate: DateString;
  };
  overall: {
    totalScheduled: number;
    totalTaken: number;
    totalMissed: number;
    totalSkipped: number;
    adherenceRate: number; // 服药依从率 (%)
  };
  byMedication: Array<{
    medicationId: UUID;
    name: string;
    scheduled: number;
    taken: number;
    missed: number;
    adherenceRate: number;
  }>;
}

// ============================================================================
// 预警类型
// ============================================================================

/** 预警级别 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/** 预警类型 */
export type AlertType = 'metric' | 'medication' | 'system';

/** 预警记录 */
export interface Alert {
  id: UUID;
  userId: UUID;

  // 分类
  level: AlertLevel;
  type: AlertType;

  // 关联数据（根据类型不同）
  // metric 类型
  recordId?: UUID;
  metric?: string;

  // medication 类型
  medicationId?: UUID;
  medicationLogId?: UUID;

  // 内容
  message: string;
  suggestion: string;

  // 状态
  isRead: boolean;
  readAt?: ISODateTime;

  // 元数据
  createdAt: ISODateTime;
}

/** 未读预警统计 */
export interface UnreadAlertCount {
  critical: number;
  warning: number;
  info: number;
  total: number;
}

/** 预警规则（用于后端规则引擎） */
export interface AlertRule {
  id: string;
  name: string;
  condition: string; // 条件表达式
  level: AlertLevel;
  messageTemplate: string;
  suggestionTemplate: string;
  enabled: boolean;
}

// ============================================================================
// OCR 类型
// ============================================================================

/** OCR 识别结果 */
export interface OCRResult {
  success: boolean;
  rawText: string;
  extracted: {
    [key: string]: {
      value: number;
      unit: string;
      confidence: number;
      referenceRange?: [number, number];
    };
  };
  lowConfidence: string[]; // 置信度低的字段名
  recordDate?: DateString;
  hospital?: string;
}

/** OCR 图片上传结果 */
export interface OCRUploadResult {
  imageId: UUID;
  imageUrl: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

/** OCR 确认保存数据 */
export interface OCRConfirmData {
  imageId: UUID;
  recordDate: DateString;
  data: Partial<HealthRecordFormData>;
  notes?: string;
}

// ============================================================================
// 仪表盘类型
// ============================================================================

/** 今日打卡项状态 */
export interface CheckInItem {
  recorded: boolean;
  value?: number;
}

/** 今日打卡数据 */
export interface TodayCheckIn {
  weight: CheckInItem;
  bloodPressure: CheckInItem;
  waterIntake: CheckInItem;
}

/** 最近指标卡片 */
export interface RecentMetricCard {
  name: string;
  key: string;
  value: number;
  unit: string;
  status: 'normal' | 'high' | 'low';
  date: DateString;
}

/** 仪表盘数据 */
export interface DashboardData {
  user: {
    name?: string;
    greeting: string;
  };
  today: {
    date: DateString;
    checkIn: TodayCheckIn;
  };
  medications: TodayMedicationItem[];
  alerts: Pick<Alert, 'id' | 'level' | 'message'>[];
  recentMetrics: RecentMetricCard[];
}

// ============================================================================
// API 响应类型
// ============================================================================

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** 分页查询参数 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** 字段错误 */
export interface FieldError {
  field: string;
  message: string;
}

/** 错误响应 */
export interface ErrorResponse {
  code: number;
  message: string;
  errors?: FieldError[];
}

// ============================================================================
// 认证类型
// ============================================================================

/** 登录凭证 */
export interface LoginCredentials {
  phone: string;
  password: string;
}

/** 注册数据 */
export interface RegisterData {
  phone: string;
  password: string;
  verificationCode: string;
}

/** 认证响应 */
export interface AuthResponse {
  userId: UUID;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** 用户信息（登录后返回） */
export interface AuthUser {
  id: UUID;
  phone: string;
  profile?: UserProfile;
}

// ============================================================================
// 常量定义
// ============================================================================

/** 健康指标参考范围常量 */
export const METRIC_REFERENCE_RANGES: MetricReferenceRange[] = [
  { metric: 'creatinine', name: '血清肌酐', unit: 'μmol/L', min: 44, max: 133 },
  { metric: 'urea', name: '尿素氮', unit: 'mmol/L', min: 2.6, max: 7.5 },
  { metric: 'potassium', name: '血钾', unit: 'mmol/L', min: 3.5, max: 5.3 },
  { metric: 'sodium', name: '血钠', unit: 'mmol/L', min: 136, max: 145 },
  { metric: 'phosphorus', name: '血磷', unit: 'mmol/L', min: 0.87, max: 1.45 },
  { metric: 'uricAcid', name: '尿酸', unit: 'μmol/L', min: 150, max: 416, gender: 'male' },
  { metric: 'uricAcid', name: '尿酸', unit: 'μmol/L', min: 89, max: 357, gender: 'female' },
  { metric: 'hemoglobin', name: '血红蛋白', unit: 'g/L', min: 120, max: 160 },
  { metric: 'bloodSugar', name: '血糖', unit: 'mmol/L', min: 3.9, max: 6.1 },
  { metric: 'bloodPressureSystolic', name: '收缩压', unit: 'mmHg', max: 140 },
  { metric: 'bloodPressureDiastolic', name: '舒张压', unit: 'mmHg', max: 90 },
];

/** 血药浓度参考范围常量 */
export const DRUG_REFERENCE_RANGES: DrugReferenceRange[] = [
  { drugType: 'cyclosporine', drugName: '环孢素', C0: [100, 200], C2: [700, 1200] },
  { drugType: 'tacrolimus', drugName: '他克莫司', C0: [5, 15] },
  { drugType: 'sirolimus', drugName: '雷帕霉素', C0: [5, 15] },
];

/** 用药频率显示文本 */
export const MEDICATION_FREQUENCY_TEXT: Record<MedicationFrequency, string> = {
  once_daily: '每日1次',
  twice_daily: '每日2次',
  three_daily: '每日3次',
  every_other_day: '隔日一次',
  weekly: '每周一次',
};

/** 预警级别显示文本 */
export const ALERT_LEVEL_TEXT: Record<AlertLevel, string> = {
  info: '提示',
  warning: '警告',
  critical: '严重',
};

/** 预警级别颜色 */
export const ALERT_LEVEL_COLOR: Record<AlertLevel, string> = {
  info: '#1890FF',
  warning: '#FAAD14',
  critical: '#F5222D',
};
