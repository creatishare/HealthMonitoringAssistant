-- 创建测试账号和数据的 SQL 脚本
-- 日期已更新为 2026-03 近期，用于测试趋势图

-- 生成 UUID 的函数
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 插入测试用户
INSERT INTO users (id, phone, "passwordHash", status, "createdAt", "updatedAt")
VALUES (
    'test-user-001',
    '13800138000',
    '$2b$12$1QxJ2IQXPlbnMcYnR3NHJeTvNCFrEiZZ.fk9aR5gRPbq4hbvkFInu',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (phone) DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",
    status = 'active';

-- 2. 插入用户档案
INSERT INTO user_profiles (
    "userId", name, gender, "birthDate", height, "currentWeight",
    "dialysisType", "dryWeight", "baselineCreatinine", "diagnosisDate",
    "primaryDisease", "createdAt", "updatedAt"
)
VALUES (
    'test-user-001',
    '测试用户',
    'male',
    '1985-06-15'::date,
    175.0,
    70.5,
    'hemodialysis',
    68.0,
    450.0,
    '2020-03-10'::date,
    'chronic_glomerulonephritis',
    NOW(),
    NOW()
)
ON CONFLICT ("userId") DO UPDATE SET
    name = EXCLUDED.name,
    gender = EXCLUDED.gender;

-- 3. 删除旧的健康记录，插入新的2026年数据（更多数据，覆盖最近30天）
DELETE FROM health_records WHERE "userId" = 'test-user-001';

INSERT INTO health_records (id, "userId", "recordDate", creatinine, urea, potassium, sodium, phosphorus, "uricAcid", hemoglobin, "bloodSugar", weight, "bloodPressureSystolic", "bloodPressureDiastolic", "createdAt", "updatedAt", source)
VALUES
    -- 3月份数据（最近，用于测试趋势图）
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-01', 480, 18.5, 5.2, 138, 1.85, 420, 98, 5.8, 70.5, 145, 85, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-03', 475, 18.0, 5.1, 139, 1.82, 415, 99, 5.9, 70.2, 142, 83, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-05', 485, 19.0, 5.4, 137, 1.90, 428, 97, 5.7, 70.8, 148, 88, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-08', 465, 17.2, 5.0, 140, 1.72, 405, 102, 6.1, 69.8, 140, 80, NOW(), NOW(), 'ocr'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-10', 470, 17.5, 5.1, 138, 1.75, 410, 101, 6.0, 70.0, 143, 82, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-12', 490, 19.5, 5.6, 136, 1.95, 435, 95, 5.6, 71.0, 150, 90, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-15', 478, 18.2, 5.3, 139, 1.85, 418, 98, 5.8, 70.3, 144, 84, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-18', 482, 18.8, 5.4, 137, 1.88, 422, 97, 5.9, 70.6, 146, 86, NOW(), NOW(), 'ocr'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-20', 468, 17.0, 4.9, 141, 1.70, 402, 103, 6.2, 69.5, 138, 78, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-22', 488, 19.2, 5.5, 136, 1.92, 430, 96, 5.7, 71.2, 152, 92, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-25', 472, 17.8, 5.2, 138, 1.80, 412, 100, 6.0, 70.1, 141, 81, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-27', 480, 18.5, 5.3, 139, 1.86, 420, 98, 5.8, 70.4, 145, 85, NOW(), NOW(), 'ocr'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-29', 485, 19.0, 5.4, 137, 1.88, 425, 97, 5.9, 70.5, 147, 87, NOW(), NOW(), 'manual'),
    (uuid_generate_v4()::text, 'test-user-001', '2026-03-31', 475, 17.5, 5.1, 140, 1.78, 408, 101, 6.1, 69.9, 142, 82, NOW(), NOW(), 'manual');

-- 4. 删除旧药物记录，插入新的药物设置
DELETE FROM medications WHERE "userId" = 'test-user-001';

INSERT INTO medications (id, "userId", name, specification, dosage, "dosageUnit", frequency, "reminderTimes", "reminderMinutesBefore", status, "createdAt", "updatedAt")
VALUES
    ('med-001', 'test-user-001', '碳酸镧咀嚼片', '500mg/片', 2, '片', 'three_daily', ARRAY['08:00'::time, '12:00'::time, '18:00'::time], 5, 'active', NOW(), NOW()),
    ('med-002', 'test-user-001', '罗沙司他胶囊', '100mg/粒', 1, '粒', 'three_daily', ARRAY['09:00'::time], 10, 'active', NOW(), NOW()),
    ('med-003', 'test-user-001', '左卡尼汀', '1g/支', 1, '支', 'three_daily', ARRAY['09:30'::time], 0, 'active', NOW(), NOW()),
    ('med-004', 'test-user-001', '骨化三醇', '0.25μg/粒', 1, '粒', 'once_daily', ARRAY['21:00'::time], 5, 'active', NOW(), NOW()),
    ('med-005', 'test-user-001', '氨氯地平片', '5mg/片', 1, '片', 'once_daily', ARRAY['08:00'::time], 5, 'active', NOW(), NOW()),
    ('med-006', 'test-user-001', '阿司匹林肠溶片', '100mg/片', 1, '片', 'once_daily', ARRAY['20:00'::time], 0, 'active', NOW(), NOW());

-- 5. 删除旧用药记录，插入新的用药记录（2026-03-31 今日数据）
DELETE FROM medication_logs WHERE "userId" = 'test-user-001';

INSERT INTO medication_logs (id, "userId", "medicationId", "scheduledTime", "actualTime", status, notes, "createdAt")
VALUES
    -- 今天的用药记录（已服用的）
    (uuid_generate_v4()::text, 'test-user-001', 'med-001', '2026-03-31 08:00:00', '2026-03-31 08:05:00', 'taken', '随早餐服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-001', '2026-03-31 12:00:00', '2026-03-31 12:03:00', 'taken', '随午餐服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-005', '2026-03-31 08:00:00', '2026-03-31 08:02:00', 'taken', '按时服用', NOW()),
    -- 昨天的用药记录
    (uuid_generate_v4()::text, 'test-user-001', 'med-001', '2026-03-30 08:00:00', '2026-03-30 08:10:00', 'taken', '随早餐服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-001', '2026-03-30 12:00:00', '2026-03-30 12:05:00', 'taken', '随午餐服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-001', '2026-03-30 18:00:00', '2026-03-30 18:08:00', 'taken', '随晚餐服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-004', '2026-03-30 21:00:00', '2026-03-30 21:15:00', 'taken', '睡前服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-006', '2026-03-30 20:00:00', '2026-03-30 20:05:00', 'taken', '按时服用', NOW()),
    (uuid_generate_v4()::text, 'test-user-001', 'med-002', '2026-03-30 09:30:00', '2026-03-30 09:45:00', 'taken', '透析后服用', NOW());

-- 6. 删除旧预警，插入新的预警提醒
DELETE FROM alerts WHERE "userId" = 'test-user-001';

INSERT INTO alerts (id, "userId", type, level, message, suggestion, "isRead", "createdAt")
VALUES
    ('alert-001', 'test-user-001', 'medication', 'info', '请在用餐时服用碳酸镧咀嚼片', null, false, NOW()),
    ('alert-002', 'test-user-001', 'metric', 'warning', '您的肌酐值为 485 μmol/L，高于正常范围，请关注肾功能变化', '建议及时就医检查肾功能', false, NOW() - INTERVAL '1 day'),
    ('alert-003', 'test-user-001', 'metric', 'info', '您的血磷值为 1.88 mmol/L，建议调整饮食并按时服用降磷药', '减少高磷食物摄入，如奶制品、坚果等', false, NOW() - INTERVAL '2 days'),
    ('alert-004', 'test-user-001', 'medication', 'info', '您今晚21:00需要服用骨化三醇，请记得睡前服用', null, false, NOW()),
    ('alert-005', 'test-user-001', 'system', 'info', '建议您定期记录健康指标，有助于更好地管理病情', '可以每天记录血压、体重等指标', false, NOW() - INTERVAL '3 days');

-- 确认数据
SELECT '用户创建成功' as message, phone, status FROM users WHERE phone = '13800138000';
SELECT '档案创建成功' as message, name, gender, "dialysisType" FROM user_profiles WHERE "userId" = 'test-user-001';
SELECT '健康记录数量' as message, COUNT(*)::text as count FROM health_records WHERE "userId" = 'test-user-001';
SELECT '药物记录数量' as message, COUNT(*)::text as count FROM medications WHERE "userId" = 'test-user-001';
SELECT '用药记录数量' as message, COUNT(*)::text as count FROM medication_logs WHERE "userId" = 'test-user-001';
