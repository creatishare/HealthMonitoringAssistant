# 数据库设计文档

**版本**: v1.0.0
**日期**: 2026-03-29
**作者**: 技术架构师 Agent
**数据库**: PostgreSQL 14+

---

## 1. 概述

本文档定义肾衰竭健康监测应用的数据库设计，包括表结构、索引、关系和约束。

### 1.1 设计原则

- **数据完整性**: 使用外键约束和检查约束
- **可扩展性**: 预留扩展字段，使用 JSONB 存储灵活数据
- **性能优化**: 合理的索引设计，支持常用查询模式
- **安全性**: 敏感字段加密存储

### 1.2 命名规范

- 表名: 小写，复数形式，下划线分隔 (e.g., `health_records`)
- 字段名: 小写，下划线分隔 (e.g., `created_at`)
- 索引名: `idx_{table}_{column}`
- 外键名: `fk_{table}_{referenced_table}`
- 检查约束: `chk_{table}_{condition}`

---

## 2. ER 图

```
┌─────────────────┐       ┌──────────────────┐
│     users       │       │  user_profiles   │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │◄──────┤ user_id (PK/FK)  │
│ phone (UQ)      │  1:1  │ name             │
│ password_hash   │       │ gender           │
│ status          │       │ birth_date       │
│ created_at      │       │ dialysis_type    │
│ updated_at      │       │ dry_weight       │
│ deleted_at      │       │ ...              │
└────────┬────────┘       └──────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                      关联表                                  │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │health_records│  │drug_concentration│  │ medications  │  │
│  ├──────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │ id (PK)      │  │ id (PK)          │  │ id (PK)      │  │
│  │ user_id (FK) │  │ user_id (FK)     │  │ user_id (FK) │  │
│  │ record_date  │  │ drug_type        │  │ name         │  │
│  │ creatinine   │  │ concentration    │  │ dosage       │  │
│  │ urea         │  │ sampling_time    │  │ frequency    │  │
│  │ ...          │  │ ...              │  │ status       │  │
│  └──────────────┘  └──────────────────┘  └──────┬───────┘  │
│                                                  │          │
│  ┌──────────────┐  ┌──────────────────┐         │ 1:N      │
│  │    alerts    │  │   lab_reports    │         │          │
│  ├──────────────┤  ├──────────────────┤         ▼          │
│  │ id (PK)      │  │ id (PK)          │  ┌──────────────┐  │
│  │ user_id (FK) │  │ user_id (FK)     │  │medication_logs│  │
│  │ level        │  │ image_url        │  ├──────────────┤  │
│  │ message      │  │ ocr_result       │  │ id (PK)      │  │
│  │ is_read      │  │ status           │  │ medication_id│  │
│  └──────────────┘  └──────────────────┘  │ scheduled_time│  │
│                                          │ status       │  │
└──────────────────────────────────────────┴──────────────┘  │
                                                             │
```

---

## 3. 表结构定义

### 3.1 用户模块

#### users - 用户表

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(11) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT chk_users_phone CHECK (phone ~ '^1[3-9]\d{9}$')
);

-- 索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 注释
COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.phone IS '手机号，11位数字';
COMMENT ON COLUMN users.password_hash IS 'bcrypt哈希后的密码';
COMMENT ON COLUMN users.status IS '账户状态: active-正常, suspended-冻结, deleted-已删除';
```

#### user_profiles - 用户档案表

```sql
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    birth_date DATE,
    height DECIMAL(5,2), -- cm
    current_weight DECIMAL(5,2), -- kg
    dialysis_type VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (dialysis_type IN ('none', 'hemodialysis', 'peritoneal')),
    dry_weight DECIMAL(5,2), -- 干体重(kg)，透析患者使用
    baseline_creatinine DECIMAL(6,2), -- 基线肌酐值(μmol/L)
    diagnosis_date DATE,
    primary_disease VARCHAR(50) CHECK (primary_disease IN ('diabetic_nephropathy', 'hypertensive_nephropathy', 'chronic_glomerulonephritis', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_user_profiles_dialysis_type ON user_profiles(dialysis_type);

-- 注释
COMMENT ON TABLE user_profiles IS '用户医疗档案表';
COMMENT ON COLUMN user_profiles.dialysis_type IS '透析类型: none-无, hemodialysis-血液透析, peritoneal-腹膜透析';
COMMENT ON COLUMN user_profiles.dry_weight IS '干体重(kg)，透析患者目标体重';
COMMENT ON COLUMN user_profiles.baseline_creatinine IS '基线肌酐值，用于趋势对比';
```

---

### 3.2 健康记录模块

#### health_records - 健康记录表

```sql
CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,

    -- 肾功能指标
    creatinine DECIMAL(6,2), -- 血清肌酐 (μmol/L)，正常: 44-133
    urea DECIMAL(5,2), -- 尿素氮 (mmol/L)，正常: 2.6-7.5

    -- 电解质指标
    potassium DECIMAL(4,2), -- 血钾 (mmol/L)，正常: 3.5-5.3
    sodium DECIMAL(5,2), -- 血钠 (mmol/L)，正常: 136-145
    phosphorus DECIMAL(4,2), -- 血磷 (mmol/L)，正常: 0.87-1.45

    -- 其他血液指标
    uric_acid DECIMAL(6,2), -- 尿酸 (μmol/L)，男: 150-416, 女: 89-357
    hemoglobin DECIMAL(5,2), -- 血红蛋白 (g/L)，正常: 120-160
    blood_sugar DECIMAL(4,2), -- 血糖 (mmol/L)，正常: 3.9-6.1

    -- 日常监测指标
    weight DECIMAL(5,2), -- 体重 (kg)
    blood_pressure_systolic INTEGER, -- 收缩压 (mmHg)，正常: <140
    blood_pressure_diastolic INTEGER, -- 舒张压 (mmHg)，正常: <90
    urine_volume INTEGER, -- 尿量 (ml/24h)

    -- 元数据
    notes TEXT,
    source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'ocr', 'import')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 约束
    CONSTRAINT chk_health_records_date CHECK (record_date <= CURRENT_DATE),
    CONSTRAINT chk_creatinine_range CHECK (creatinine IS NULL OR (creatinine > 0 AND creatinine < 5000)),
    CONSTRAINT chk_urea_range CHECK (urea IS NULL OR (urea > 0 AND urea < 100)),
    CONSTRAINT chk_potassium_range CHECK (potassium IS NULL OR (potassium > 0 AND potassium < 20)),
    CONSTRAINT chk_uric_acid_range CHECK (uric_acid IS NULL OR (uric_acid > 0 AND uric_acid < 2000)),
    CONSTRAINT chk_blood_pressure CHECK (
        (blood_pressure_systolic IS NULL AND blood_pressure_diastolic IS NULL) OR
        (blood_pressure_systolic > blood_pressure_diastolic)
    )
);

-- 索引
CREATE INDEX idx_health_records_user_id ON health_records(user_id);
CREATE INDEX idx_health_records_user_date ON health_records(user_id, record_date DESC);
CREATE INDEX idx_health_records_date ON health_records(record_date);
CREATE INDEX idx_health_records_created_at ON health_records(created_at DESC);

-- 复合索引（用于趋势查询）
CREATE INDEX idx_health_records_user_creatinine ON health_records(user_id, record_date DESC) WHERE creatinine IS NOT NULL;
CREATE INDEX idx_health_records_user_urea ON health_records(user_id, record_date DESC) WHERE urea IS NOT NULL;
CREATE INDEX idx_health_records_user_potassium ON health_records(user_id, record_date DESC) WHERE potassium IS NOT NULL;

-- 注释
COMMENT ON TABLE health_records IS '健康指标记录表';
COMMENT ON COLUMN health_records.source IS '数据来源: manual-手动录入, ocr-OCR识别, import-导入';
```

---

### 3.3 血药浓度模块

#### drug_concentration_records - 血药浓度记录表

```sql
CREATE TABLE drug_concentration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,

    -- 药物信息
    drug_type VARCHAR(20) NOT NULL CHECK (drug_type IN ('cyclosporine', 'tacrolimus', 'sirolimus', 'other')),
    drug_name VARCHAR(100) NOT NULL,

    -- 浓度数据
    concentration DECIMAL(8,2) NOT NULL, -- ng/mL
    sampling_time VARCHAR(5) NOT NULL CHECK (sampling_time IN ('C0', 'C2')), -- C0=服药前, C2=服药后2小时

    -- 时间信息
    last_dose_time TIMESTAMPTZ NOT NULL, -- 上次服药时间
    blood_draw_time TIMESTAMPTZ NOT NULL, -- 采血时间

    -- 参考范围（根据药物类型自动确定）
    reference_range_min DECIMAL(8,2) NOT NULL,
    reference_range_max DECIMAL(8,2) NOT NULL,
    is_in_range BOOLEAN NOT NULL,

    -- 元数据
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 约束
    CONSTRAINT chk_drug_concentration_positive CHECK (concentration > 0),
    CONSTRAINT chk_blood_draw_after_dose CHECK (blood_draw_time > last_dose_time),
    CONSTRAINT chk_reference_range CHECK (reference_range_min < reference_range_max)
);

-- 索引
CREATE INDEX idx_drug_concentration_user_id ON drug_concentration_records(user_id);
CREATE INDEX idx_drug_concentration_user_date ON drug_concentration_records(user_id, record_date DESC);
CREATE INDEX idx_drug_concentration_drug_type ON drug_concentration_records(drug_type);
CREATE INDEX idx_drug_concentration_user_drug ON drug_concentration_records(user_id, drug_type, record_date DESC);

-- 注释
COMMENT ON TABLE drug_concentration_records IS '血药浓度记录表';
COMMENT ON COLUMN drug_concentration_records.drug_type IS '药物类型: cyclosporine-环孢素, tacrolimus-他克莫司, sirolimus-雷帕霉素';
COMMENT ON COLUMN drug_concentration_records.sampling_time IS '采样时间: C0-服药前(谷浓度), C2-服药后2小时(峰浓度)';
COMMENT ON COLUMN drug_concentration_records.concentration IS '血药浓度值，单位: ng/mL';
```

---

### 3.4 用药管理模块

#### medications - 用药表

```sql
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 药品信息
    name VARCHAR(100) NOT NULL,
    specification VARCHAR(50), -- 规格，如 "25mg/粒"

    -- 用法用量
    dosage DECIMAL(6,2) NOT NULL, -- 每次剂量
    dosage_unit VARCHAR(20) NOT NULL, -- 剂量单位: 片、粒、mg、ml等
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('once_daily', 'twice_daily', 'three_daily', 'every_other_day', 'weekly')),

    -- 提醒设置
    reminder_times TIME[] NOT NULL, -- 提醒时间数组，如 ['08:00', '20:00']
    reminder_minutes_before INTEGER NOT NULL DEFAULT 5, -- 提前提醒分钟数

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'discontinued')),

    -- 元数据
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_medications_user_id ON medications(user_id);
CREATE INDEX idx_medications_user_status ON medications(user_id, status);
CREATE INDEX idx_medications_status ON medications(status) WHERE status = 'active';

-- 注释
COMMENT ON TABLE medications IS '用药提醒设置表';
COMMENT ON COLUMN medications.frequency IS '用药频率: once_daily-每日1次, twice_daily-每日2次, three_daily-每日3次, every_other_day-隔日一次, weekly-每周一次';
COMMENT ON COLUMN medications.reminder_times IS '提醒时间数组，24小时制';
```

#### medication_logs - 服药记录表

```sql
CREATE TABLE medication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,

    -- 时间信息
    scheduled_time TIMESTAMPTZ NOT NULL, -- 计划服药时间
    actual_time TIMESTAMPTZ, -- 实际服药时间

    -- 状态
    status VARCHAR(20) NOT NULL CHECK (status IN ('taken', 'missed', 'skipped')),

    -- 跳过原因
    skip_reason VARCHAR(255),

    -- 元数据
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 约束
    CONSTRAINT chk_actual_after_scheduled CHECK (actual_time IS NULL OR actual_time >= scheduled_time)
);

-- 索引
CREATE INDEX idx_medication_logs_user_id ON medication_logs(user_id);
CREATE INDEX idx_medication_logs_medication_id ON medication_logs(medication_id);
CREATE INDEX idx_medication_logs_user_date ON medication_logs(user_id, scheduled_time DESC);
CREATE INDEX idx_medication_logs_scheduled ON medication_logs(scheduled_time);
CREATE INDEX idx_medication_logs_status ON medication_logs(status);

-- 复合索引（用于统计查询）
CREATE INDEX idx_medication_logs_user_med_date ON medication_logs(user_id, medication_id, scheduled_time DESC);

-- 注释
COMMENT ON TABLE medication_logs IS '服药记录表';
COMMENT ON COLUMN medication_logs.status IS '服药状态: taken-已服药, missed-漏服, skipped-跳过';
```

---

### 3.5 预警模块

#### alerts - 预警表

```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 分类
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
    type VARCHAR(20) NOT NULL CHECK (type IN ('metric', 'medication', 'system')),

    -- 关联数据（根据类型不同）
    record_id UUID REFERENCES health_records(id) ON DELETE SET NULL,
    metric VARCHAR(50), -- 指标名称，如 creatinine
    medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,
    medication_log_id UUID REFERENCES medication_logs(id) ON DELETE SET NULL,

    -- 内容
    message TEXT NOT NULL,
    suggestion TEXT,

    -- 状态
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    -- 元数据
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 约束
    CONSTRAINT chk_alert_read_consistency CHECK (is_read = FALSE OR read_at IS NOT NULL)
);

-- 索引
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_user_level ON alerts(user_id, level);
CREATE INDEX idx_alerts_user_read ON alerts(user_id, is_read);
CREATE INDEX idx_alerts_user_created ON alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_level ON alerts(level) WHERE level IN ('warning', 'critical');
CREATE INDEX idx_alerts_unread ON alerts(user_id, level) WHERE is_read = FALSE;

-- 注释
COMMENT ON TABLE alerts IS '预警记录表';
COMMENT ON COLUMN alerts.level IS '预警级别: info-提示, warning-警告, critical-严重';
COMMENT ON COLUMN alerts.type IS '预警类型: metric-指标异常, medication-用药相关, system-系统通知';
```

---

### 3.6 OCR 模块

#### lab_reports - 化验单记录表

```sql
CREATE TABLE lab_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 图片信息
    image_url TEXT NOT NULL,
    image_hash VARCHAR(64), -- 图片哈希，用于去重

    -- OCR结果
    ocr_raw_text TEXT, -- OCR原始文本
    ocr_result JSONB, -- 结构化OCR结果
    extracted_data JSONB, -- 提取的健康指标数据
    confidence_scores JSONB, -- 各字段置信度

    -- 状态
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

    -- 关联记录
    health_record_id UUID REFERENCES health_records(id) ON DELETE SET NULL,

    -- 元数据
    report_date DATE, -- 化验单上的日期
    hospital VARCHAR(100), -- 医院名称（如识别到）
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_lab_reports_user_id ON lab_reports(user_id);
CREATE INDEX idx_lab_reports_user_date ON lab_reports(user_id, report_date DESC);
CREATE INDEX idx_lab_reports_status ON lab_reports(status);
CREATE INDEX idx_lab_reports_health_record ON lab_reports(health_record_id);

-- GIN索引用于JSONB查询
CREATE INDEX idx_lab_reports_ocr_result ON lab_reports USING GIN (ocr_result);
CREATE INDEX idx_lab_reports_extracted ON lab_reports USING GIN (extracted_data);

-- 注释
COMMENT ON TABLE lab_reports IS '化验单OCR记录表';
COMMENT ON COLUMN lab_reports.status IS '处理状态: pending-待处理, processing-处理中, completed-已完成, failed-失败';
COMMENT ON COLUMN lab_reports.ocr_result IS 'OCR原始结果，JSON格式存储';
```

---

### 3.7 系统模块

#### refresh_tokens - 刷新令牌表（用于Token吊销）

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_jti VARCHAR(255) NOT NULL UNIQUE, -- JWT ID
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 索引
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(token_jti);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE is_revoked = FALSE;

-- 注释
COMMENT ON TABLE refresh_tokens IS '刷新令牌表，用于Token管理和吊销';
```

#### audit_logs - 审计日志表

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,

    old_values JSONB,
    new_values JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- 分区（按时间分区，保留最近1年数据）
-- 注意：PostgreSQL 10+ 支持声明式分区

-- 注释
COMMENT ON TABLE audit_logs IS '审计日志表，记录敏感操作';
```

---

## 4. 视图

### 4.1 用户完整信息视图

```sql
CREATE VIEW user_full_info AS
SELECT
    u.id,
    u.phone,
    u.status,
    u.created_at,
    p.name,
    p.gender,
    p.birth_date,
    p.height,
    p.current_weight,
    p.dialysis_type,
    p.dry_weight,
    p.baseline_creatinine,
    p.diagnosis_date,
    p.primary_disease
FROM users u
LEFT JOIN user_profiles p ON u.id = p.user_id
WHERE u.deleted_at IS NULL;

COMMENT ON VIEW user_full_info IS '用户完整信息视图（不包含敏感字段）';
```

### 4.2 最新健康指标视图

```sql
CREATE VIEW latest_health_records AS
WITH latest_records AS (
    SELECT DISTINCT ON (user_id, metric)
        user_id,
        metric,
        value,
        record_date,
        unit
    FROM (
        SELECT
            user_id,
            'creatinine' as metric,
            creatinine as value,
            record_date,
            'μmol/L' as unit
        FROM health_records WHERE creatinine IS NOT NULL
        UNION ALL
        SELECT user_id, 'urea', urea, record_date, 'mmol/L'
        FROM health_records WHERE urea IS NOT NULL
        UNION ALL
        SELECT user_id, 'potassium', potassium, record_date, 'mmol/L'
        FROM health_records WHERE potassium IS NOT NULL
        UNION ALL
        SELECT user_id, 'uric_acid', uric_acid, record_date, 'μmol/L'
        FROM health_records WHERE uric_acid IS NOT NULL
        UNION ALL
        SELECT user_id, 'weight', weight, record_date, 'kg'
        FROM health_records WHERE weight IS NOT NULL
    ) combined
    ORDER BY user_id, metric, record_date DESC
)
SELECT * FROM latest_records;

COMMENT ON VIEW latest_health_records IS '每个用户最新各项指标视图';
```

### 4.3 用药统计视图

```sql
CREATE VIEW medication_adherence_stats AS
SELECT
    user_id,
    medication_id,
    DATE_TRUNC('month', scheduled_time) as month,
    COUNT(*) as total_scheduled,
    COUNT(*) FILTER (WHERE status = 'taken') as total_taken,
    COUNT(*) FILTER (WHERE status = 'missed') as total_missed,
    COUNT(*) FILTER (WHERE status = 'skipped') as total_skipped,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'taken') * 100.0 / COUNT(*),
        2
    ) as adherence_rate
FROM medication_logs
GROUP BY user_id, medication_id, DATE_TRUNC('month', scheduled_time);

COMMENT ON VIEW medication_adherence_stats IS '用药依从性统计视图（按月）';
```

---

## 5. 函数和触发器

### 5.1 自动更新时间戳

```sql
-- 创建自动更新函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用到各表
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_records_updated_at
    BEFORE UPDATE ON health_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_reports_updated_at
    BEFORE UPDATE ON lab_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 预警标记已读时自动设置时间

```sql
CREATE OR REPLACE FUNCTION set_alert_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_alert_read_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION set_alert_read_at();
```

### 5.3 血药浓度自动判断是否在规定范围

```sql
CREATE OR REPLACE FUNCTION check_drug_concentration_range()
RETURNS TRIGGER AS $$
BEGIN
    NEW.is_in_range := (
        NEW.concentration >= NEW.reference_range_min
        AND NEW.concentration <= NEW.reference_range_max
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_drug_concentration_range
    BEFORE INSERT OR UPDATE ON drug_concentration_records
    FOR EACH ROW EXECUTE FUNCTION check_drug_concentration_range();
```

---

## 6. 初始化数据

### 6.1 常用药品数据

```sql
-- 常用肾病患者药品参考数据（仅作为前端下拉选项，不强制使用）
CREATE TABLE common_medications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    common_specifications VARCHAR(100)[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO common_medications (name, category, common_specifications) VALUES
-- 免疫抑制剂
('环孢素软胶囊', 'immunosuppressant', ARRAY['25mg/粒', '50mg/粒']),
('他克莫司胶囊', 'immunosuppressant', ARRAY['0.5mg/粒', '1mg/粒']),
('雷帕霉素片', 'immunosuppressant', ARRAY['1mg/片']),

-- 降压药
('氨氯地平片', 'antihypertensive', ARRAY['5mg/片']),
('缬沙坦胶囊', 'antihypertensive', ARRAY['80mg/粒']),

-- 磷结合剂
('碳酸镧咀嚼片', 'phosphate_binder', ARRAY['500mg/片']),
('司维拉姆片', 'phosphate_binder', ARRAY['800mg/片']),

-- 促红素
('重组人促红素注射液', 'esa', ARRAY['3000IU/支', '4000IU/支']),

-- 其他常用
('骨化三醇胶囊', 'vitamin_d', ARRAY['0.25μg/粒']),
('叶酸片', 'supplement', ARRAY['5mg/片']),
('碳酸钙片', 'supplement', ARRAY['600mg/片']);

COMMENT ON TABLE common_medications IS '常用药品参考表，用于前端下拉选择';
```

---

## 7. 备份策略

### 7.1 自动备份脚本

```bash
#!/bin/bash
# backup.sh

DB_NAME="health_db"
BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/health_db_${DATE}.sql"

# 创建备份
pg_dump -h localhost -U postgres -d ${DB_NAME} -F p -f ${BACKUP_FILE}

# 压缩
gzip ${BACKUP_FILE}

# 删除7天前的备份
find ${BACKUP_DIR} -name "health_db_*.sql.gz" -mtime +7 -delete

# 上传到对象存储（可选）
# ossutil cp ${BACKUP_FILE}.gz oss://healthapp-backup/
```

### 7.2 备份策略

| 备份类型 | 频率 | 保留时间 |
|---------|------|----------|
| 全量备份 | 每日凌晨2点 | 7天 |
| 增量备份 | 每小时 | 24小时 |
| 归档备份 | 每周日 | 30天 |

---

## 8. 性能优化建议

### 8.1 查询优化

```sql
-- 使用 EXPLAIN ANALYZE 分析慢查询
EXPLAIN ANALYZE
SELECT * FROM health_records
WHERE user_id = 'xxx'
AND record_date >= '2024-01-01'
ORDER BY record_date DESC;

-- 定期执行 VACUUM 和 ANALYZE
VACUUM ANALYZE health_records;
```

### 8.2 连接池配置

```typescript
// Prisma 连接池配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 连接池配置
  connectionLimit: 10,  // 最大连接数
  poolTimeout: 10,      // 连接超时(秒)
});
```

---

**文档结束**
