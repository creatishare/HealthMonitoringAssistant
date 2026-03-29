# API 规范文档

**版本**: v1.0.0
**日期**: 2026-03-29
**作者**: 技术架构师 Agent
**基础URL**: `https://api.healthapp.com/v1`

---

## 1. 基础信息

### 1.1 通用约定

- **协议**: HTTPS only (TLS 1.3)
- **数据格式**: JSON
- **字符编码**: UTF-8
- **时间格式**: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
- **日期格式**: YYYY-MM-DD

### 1.2 认证方式

使用 JWT (JSON Web Token) 进行认证：

```http
Authorization: Bearer <access_token>
```

Token 同时通过 HttpOnly Cookie 存储，防止 XSS 攻击。

### 1.3 统一响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "请求参数错误",
  "errors": [
    {
      "field": "phone",
      "message": "手机号格式不正确"
    }
  ]
}
```

**分页响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### 1.4 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功，无返回内容 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或Token过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如手机号已注册） |
| 422 | Unprocessable Entity | 业务逻辑错误 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 2. 错误码规范

### 2.1 错误码格式

错误码格式: `MODULE_ERROR_NUMBER`

- `MODULE`: 2位模块代码
- `ERROR`: 3位错误序号

### 2.2 模块代码

| 代码 | 模块 |
|------|------|
| 00 | 通用错误 |
| 01 | 认证模块 |
| 02 | 用户模块 |
| 03 | 健康记录模块 |
| 04 | 血药浓度模块 |
| 05 | 用药管理模块 |
| 06 | 预警模块 |
| 07 | OCR模块 |

### 2.3 详细错误码

#### 通用错误 (00xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 00001 | 服务器内部错误 | 500 |
| 00002 | 请求参数错误 | 400 |
| 00003 | 请求过于频繁 | 429 |
| 00004 | 资源不存在 | 404 |
| 00005 | 方法不允许 | 405 |

#### 认证错误 (01xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 01001 | 手机号格式不正确 | 400 |
| 01002 | 验证码错误或已过期 | 400 |
| 01003 | 密码格式不正确 | 400 |
| 01004 | 手机号已注册 | 409 |
| 01005 | 手机号未注册 | 404 |
| 01006 | 密码错误 | 401 |
| 01007 | Token已过期 | 401 |
| 01008 | Token无效 | 401 |
| 01009 | 刷新Token已过期 | 401 |

#### 用户错误 (02xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 02001 | 用户不存在 | 404 |
| 02002 | 用户档案不存在 | 404 |
| 02003 | 档案数据验证失败 | 422 |

#### 健康记录错误 (03xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 03001 | 记录不存在 | 404 |
| 03002 | 记录日期格式错误 | 400 |
| 03003 | 指标值超出合理范围 | 422 |
| 03004 | 无权限访问此记录 | 403 |

#### 血药浓度错误 (04xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 04001 | 药物类型不支持 | 400 |
| 04002 | 采血时间格式错误 | 400 |
| 04003 | 浓度值超出合理范围 | 422 |
| 04004 | 服药时间与采血时间冲突 | 422 |

#### 用药管理错误 (05xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 05001 | 药品不存在 | 404 |
| 05002 | 提醒时间格式错误 | 400 |
| 05003 | 服药记录不存在 | 404 |
| 05004 | 不能修改已完成的记录 | 422 |
| 05005 | 提醒时间不能为过去时间 | 422 |

#### 预警错误 (06xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 06001 | 预警不存在 | 404 |
| 06002 | 预警已处理 | 422 |

#### OCR错误 (07xxx)

| 错误码 | 错误信息 | HTTP状态码 |
|--------|----------|------------|
| 07001 | 图片上传失败 | 500 |
| 07002 | 图片格式不支持 | 400 |
| 07003 | 图片大小超过限制 | 400 |
| 07004 | OCR识别失败 | 422 |
| 07005 | 未识别到有效指标 | 422 |

---

## 3. 接口列表

### 3.1 认证模块

#### POST /auth/register
用户注册

**请求参数**:
```json
{
  "phone": "13800138000",
  "password": "aB123456",
  "verificationCode": "123456"
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号，11位数字 |
| password | string | 是 | 密码，6-20位，必须包含字母和数字 |
| verificationCode | string | 是 | 短信验证码，6位数字 |

**响应示例**:
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

---

#### POST /auth/login
用户登录

**请求参数**:
```json
{
  "phone": "13800138000",
  "password": "aB123456"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

---

#### POST /auth/refresh
刷新访问令牌

**请求头**:
```http
Authorization: Bearer <refresh_token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 86400
  }
}
```

---

#### POST /auth/logout
用户登出

**请求头**:
```http
Authorization: Bearer <access_token>
```

**响应示例**:
```json
{
  "code": 200,
  "message": "登出成功",
  "data": null
}
```

---

#### POST /auth/verification-code
发送验证码

**请求参数**:
```json
{
  "phone": "13800138000",
  "type": "register"
}
```

**type 说明**:
- `register`: 注册
- `reset-password`: 重置密码

**响应示例**:
```json
{
  "code": 200,
  "message": "验证码已发送",
  "data": {
    "expireIn": 300
  }
}
```

---

### 3.2 用户模块

#### GET /users/profile
获取用户档案

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "张三",
    "gender": "male",
    "birthDate": "1960-05-15",
    "height": 170,
    "currentWeight": 65.5,
    "dialysisType": "hemodialysis",
    "dryWeight": 62.0,
    "baselineCreatinine": 150,
    "diagnosisDate": "2020-03-15",
    "primaryDisease": "diabetic_nephropathy",
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-03-20T10:15:00.000Z"
  }
}
```

---

#### PUT /users/profile
更新用户档案

**请求参数**:
```json
{
  "name": "张三",
  "gender": "male",
  "birthDate": "1960-05-15",
  "height": 170,
  "currentWeight": 65.5,
  "dialysisType": "hemodialysis",
  "dryWeight": 62.0,
  "baselineCreatinine": 150,
  "diagnosisDate": "2020-03-15",
  "primaryDisease": "diabetic_nephropathy"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 姓名 |
| gender | string | 否 | 性别: male/female |
| birthDate | string | 否 | 出生日期 |
| height | number | 否 | 身高(cm) |
| currentWeight | number | 否 | 当前体重(kg) |
| dialysisType | string | 否 | 透析类型: none/hemodialysis/peritoneal |
| dryWeight | number | 否 | 干体重(kg)，透析患者必填 |
| baselineCreatinine | number | 否 | 基线肌酐值 |
| diagnosisDate | string | 否 | 诊断日期 |
| primaryDisease | string | 否 | 原发疾病 |

---

### 3.3 健康记录模块

#### GET /health-records
获取健康记录列表

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |
| metric | string | 否 | 指定指标: creatinine/urea/potassium等 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "recordDate": "2024-03-25",
        "creatinine": 180,
        "urea": 12.5,
        "potassium": 5.2,
        "sodium": 140,
        "phosphorus": 1.8,
        "uricAcid": 420,
        "hemoglobin": 105,
        "bloodSugar": 5.8,
        "weight": 65.5,
        "bloodPressureSystolic": 135,
        "bloodPressureDiastolic": 85,
        "urineVolume": 800,
        "notes": "透析后记录",
        "createdAt": "2024-03-25T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

#### POST /health-records
创建健康记录

**请求参数**:
```json
{
  "recordDate": "2024-03-25",
  "creatinine": 180,
  "urea": 12.5,
  "potassium": 5.2,
  "sodium": 140,
  "phosphorus": 1.8,
  "uricAcid": 420,
  "hemoglobin": 105,
  "bloodSugar": 5.8,
  "weight": 65.5,
  "bloodPressureSystolic": 135,
  "bloodPressureDiastolic": 85,
  "urineVolume": 800,
  "notes": "透析后记录"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 单位 | 正常范围 |
|------|------|------|------|----------|
| recordDate | string | 是 | - | 记录日期 |
| creatinine | number | 否 | μmol/L | 44-133 |
| urea | number | 否 | mmol/L | 2.6-7.5 |
| potassium | number | 否 | mmol/L | 3.5-5.3 |
| sodium | number | 否 | mmol/L | 136-145 |
| phosphorus | number | 否 | mmol/L | 0.87-1.45 |
| uricAcid | number | 否 | μmol/L | 男150-416/女89-357 |
| hemoglobin | number | 否 | g/L | 120-160 |
| bloodSugar | number | 否 | mmol/L | 3.9-6.1 |
| weight | number | 否 | kg | - |
| bloodPressureSystolic | number | 否 | mmHg | <140 |
| bloodPressureDiastolic | number | 否 | mmHg | <90 |
| urineVolume | number | 否 | ml/24h | - |
| notes | string | 否 | - | 备注 |

---

#### GET /health-records/:id
获取单条记录详情

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "recordDate": "2024-03-25",
    "creatinine": 180,
    "urea": 12.5,
    "potassium": 5.2,
    "sodium": 140,
    "phosphorus": 1.8,
    "uricAcid": 420,
    "hemoglobin": 105,
    "bloodSugar": 5.8,
    "weight": 65.5,
    "bloodPressureSystolic": 135,
    "bloodPressureDiastolic": 85,
    "urineVolume": 800,
    "notes": "透析后记录",
    "createdAt": "2024-03-25T09:00:00.000Z",
    "updatedAt": "2024-03-25T09:00:00.000Z"
  }
}
```

---

#### PUT /health-records/:id
更新健康记录

**请求参数**: 同创建接口，所有字段可选

---

#### DELETE /health-records/:id
删除健康记录

**响应示例**:
```json
{
  "code": 204,
  "message": "删除成功",
  "data": null
}
```

---

#### GET /health-records/trends
获取趋势数据（用于图表）

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| metrics | string | 是 | 指标列表，逗号分隔: creatinine,urea |
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "metrics": ["creatinine", "urea"],
    "startDate": "2024-01-01",
    "endDate": "2024-03-25",
    "data": [
      {
        "date": "2024-01-15",
        "creatinine": 150,
        "urea": 10.2
      },
      {
        "date": "2024-02-15",
        "creatinine": 165,
        "urea": 11.5
      },
      {
        "date": "2024-03-15",
        "creatinine": 180,
        "urea": 12.5
      }
    ]
  }
}
```

---

### 3.4 血药浓度模块

#### GET /drug-concentrations
获取血药浓度记录列表

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| drugType | string | 否 | 药物类型过滤 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "recordDate": "2024-03-20",
        "drugType": "cyclosporine",
        "drugName": "环孢素软胶囊",
        "concentration": 850,
        "samplingTime": "C2",
        "lastDoseTime": "2024-03-20T06:00:00.000Z",
        "bloodDrawTime": "2024-03-20T08:00:00.000Z",
        "referenceRange": [700, 1200],
        "isInRange": true,
        "notes": "服药后2小时",
        "createdAt": "2024-03-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

---

#### POST /drug-concentrations
创建血药浓度记录

**请求参数**:
```json
{
  "recordDate": "2024-03-20",
  "drugType": "cyclosporine",
  "drugName": "环孢素软胶囊",
  "concentration": 850,
  "samplingTime": "C2",
  "lastDoseTime": "2024-03-20T06:00:00.000Z",
  "bloodDrawTime": "2024-03-20T08:00:00.000Z",
  "notes": "服药后2小时"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| recordDate | string | 是 | 记录日期 |
| drugType | string | 是 | 药物类型: cyclosporine/tacrolimus/sirolimus/other |
| drugName | string | 是 | 药物具体名称 |
| concentration | number | 是 | 浓度值(ng/mL) |
| samplingTime | string | 是 | 采样时间: C0(服药前)/C2(服药后2小时) |
| lastDoseTime | string | 是 | 上次服药时间(ISO 8601) |
| bloodDrawTime | string | 是 | 采血时间(ISO 8601) |
| notes | string | 否 | 备注 |

**参考值范围**:
| 药物 | C0范围 | C2范围 |
|------|--------|--------|
| cyclosporine | 100-200 | 700-1200 |
| tacrolimus | 5-15 | - |
| sirolimus | 5-15 | - |

---

#### GET /drug-concentrations/trends
获取血药浓度趋势（关联用药记录）

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| drugType | string | 是 | 药物类型 |
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "drugType": "cyclosporine",
    "drugName": "环孢素",
    "referenceRange": {
      "C0": [100, 200],
      "C2": [700, 1200]
    },
    "concentrations": [
      {
        "date": "2024-01-15",
        "value": 150,
        "samplingTime": "C0",
        "isInRange": true
      },
      {
        "date": "2024-02-15",
        "value": 850,
        "samplingTime": "C2",
        "isInRange": true
      }
    ],
    "medicationLogs": [
      {
        "date": "2024-01-15",
        "status": "taken",
        "scheduledTime": "08:00",
        "actualTime": "08:05"
      }
    ]
  }
}
```

---

### 3.5 用药管理模块

#### GET /medications
获取用药列表

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态过滤: active/paused/discontinued |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "环孢素软胶囊",
        "specification": "25mg/粒",
        "dosage": 4,
        "dosageUnit": "粒",
        "frequency": "twice_daily",
        "reminderTimes": ["08:00", "20:00"],
        "reminderMinutesBefore": 5,
        "status": "active",
        "createdAt": "2024-01-15T08:00:00.000Z",
        "updatedAt": "2024-01-15T08:00:00.000Z"
      }
    ]
  }
}
```

---

#### POST /medications
添加用药

**请求参数**:
```json
{
  "name": "环孢素软胶囊",
  "specification": "25mg/粒",
  "dosage": 4,
  "dosageUnit": "粒",
  "frequency": "twice_daily",
  "reminderTimes": ["08:00", "20:00"],
  "reminderMinutesBefore": 5
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 药品名称 |
| specification | string | 否 | 规格，如"25mg/粒" |
| dosage | number | 是 | 每次剂量 |
| dosageUnit | string | 是 | 剂量单位，如"粒"/"片"/"mg" |
| frequency | string | 是 | 频率: once_daily/twice_daily/three_daily/every_other_day/weekly |
| reminderTimes | string[] | 是 | 提醒时间，如["08:00", "20:00"] |
| reminderMinutesBefore | number | 否 | 提前提醒分钟数，默认5 |

---

#### PUT /medications/:id
更新用药设置

**请求参数**: 同创建接口，所有字段可选

---

#### DELETE /medications/:id
删除用药

---

#### POST /medications/:id/pause
暂停用药提醒

---

#### POST /medications/:id/resume
恢复用药提醒

---

#### GET /medications/logs
获取用药记录

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| medicationId | string | 否 | 指定药品过滤 |
| date | string | 否 | 指定日期 (YYYY-MM-DD) |
| status | string | 否 | 状态过滤: taken/missed/skipped |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "medicationId": "550e8400-e29b-41d4-a716-446655440003",
        "medication": {
          "name": "环孢素软胶囊",
          "dosage": 4,
          "dosageUnit": "粒"
        },
        "scheduledTime": "2024-03-25T08:00:00.000Z",
        "actualTime": "2024-03-25T08:05:00.000Z",
        "status": "taken",
        "notes": null,
        "createdAt": "2024-03-25T08:05:00.000Z"
      }
    ]
  }
}
```

---

#### POST /medications/logs
记录服药

**请求参数**:
```json
{
  "medicationId": "550e8400-e29b-41d4-a716-446655440003",
  "scheduledTime": "2024-03-25T08:00:00.000Z",
  "actualTime": "2024-03-25T08:05:00.000Z",
  "status": "taken",
  "notes": "饭后服用"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| medicationId | string | 是 | 药品ID |
| scheduledTime | string | 是 | 计划服药时间 |
| actualTime | string | 否 | 实际服药时间，未服可不填 |
| status | string | 是 | 状态: taken/missed/skipped |
| notes | string | 否 | 备注 |

---

#### GET /medications/today
获取今日用药提醒

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "date": "2024-03-25",
    "medications": [
      {
        "medicationId": "550e8400-e29b-41d4-a716-446655440003",
        "name": "环孢素软胶囊",
        "dosage": 4,
        "dosageUnit": "粒",
        "scheduledTime": "08:00",
        "status": "taken",
        "logId": "550e8400-e29b-41d4-a716-446655440004"
      },
      {
        "medicationId": "550e8400-e29b-41d4-a716-446655440005",
        "name": "钙片",
        "dosage": 1,
        "dosageUnit": "片",
        "scheduledTime": "12:00",
        "status": "pending"
      }
    ]
  }
}
```

---

#### GET /medications/statistics
获取用药统计

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "period": {
      "startDate": "2024-03-01",
      "endDate": "2024-03-25"
    },
    "overall": {
      "totalScheduled": 150,
      "totalTaken": 142,
      "totalMissed": 5,
      "totalSkipped": 3,
      "adherenceRate": 94.7
    },
    "byMedication": [
      {
        "medicationId": "550e8400-e29b-41d4-a716-446655440003",
        "name": "环孢素软胶囊",
        "scheduled": 50,
        "taken": 48,
        "missed": 2,
        "adherenceRate": 96.0
      }
    ]
  }
}
```

---

### 3.6 预警模块

#### GET /alerts
获取预警列表

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| level | string | 否 | 级别过滤: info/warning/critical |
| isRead | boolean | 否 | 是否已读 |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "level": "warning",
        "type": "metric",
        "metric": "creatinine",
        "message": "肌酐较上次上升25%，建议及时就医",
        "suggestion": "请尽快联系您的主治医生进行复查",
        "isRead": false,
        "createdAt": "2024-03-25T09:30:00.000Z",
        "recordId": "550e8400-e29b-41d4-a716-446655440001"
      }
    ],
    "unreadCount": {
      "critical": 0,
      "warning": 1,
      "info": 2,
      "total": 3
    },
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

#### GET /alerts/unread-count
获取未读预警数量

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "critical": 0,
    "warning": 1,
    "info": 2,
    "total": 3
  }
}
```

---

#### PUT /alerts/:id/read
标记预警为已读

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

#### PUT /alerts/read-all
标记所有预警为已读

---

#### DELETE /alerts/:id
删除预警

---

### 3.7 OCR模块

#### POST /ocr/upload
上传化验单图片

**请求**: `Content-Type: multipart/form-data`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | File | 是 | 图片文件，支持jpg/png，最大5MB |

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "imageId": "550e8400-e29b-41d4-a716-446655440007",
    "imageUrl": "https://oss.healthapp.com/images/xxx.jpg",
    "status": "uploaded"
  }
}
```

---

#### POST /ocr/recognize
识别化验单

**请求参数**:
```json
{
  "imageId": "550e8400-e29b-41d4-a716-446655440007"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "imageId": "550e8400-e29b-41d4-a716-446655440007",
    "success": true,
    "rawText": "血清肌酐 180 μmol/L 参考范围 44-133...",
    "extracted": {
      "creatinine": {
        "value": 180,
        "unit": "μmol/L",
        "confidence": 0.95,
        "referenceRange": [44, 133]
      },
      "urea": {
        "value": 12.5,
        "unit": "mmol/L",
        "confidence": 0.92,
        "referenceRange": [2.6, 7.5]
      },
      "potassium": {
        "value": 5.2,
        "unit": "mmol/L",
        "confidence": 0.88,
        "referenceRange": [3.5, 5.3]
      }
    },
    "lowConfidence": ["phosphorus"],
    "recordDate": "2024-03-25",
    "hospital": "三甲医院"
  }
}
```

---

#### POST /ocr/confirm
确认并保存OCR结果

**请求参数**:
```json
{
  "imageId": "550e8400-e29b-41d4-a716-446655440007",
  "recordDate": "2024-03-25",
  "data": {
    "creatinine": 180,
    "urea": 12.5,
    "potassium": 5.2,
    "sodium": 140,
    "phosphorus": 1.8,
    "uricAcid": 420,
    "hemoglobin": 105
  },
  "notes": "2024年3月复查"
}
```

**响应示例**:
```json
{
  "code": 201,
  "message": "保存成功",
  "data": {
    "recordId": "550e8400-e29b-41d4-a716-446655440001",
    "alerts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "level": "warning",
        "message": "肌酐偏高，建议复查"
      }
    ]
  }
}
```

---

### 3.8 仪表盘模块

#### GET /dashboard
获取首页仪表盘数据

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "user": {
      "name": "张三",
      "greeting": "上午好"
    },
    "today": {
      "date": "2024-03-25",
      "checkIn": {
        "weight": {
          "recorded": true,
          "value": 65.5
        },
        "bloodPressure": {
          "recorded": false
        },
        "waterIntake": {
          "recorded": true,
          "value": 500
        }
      }
    },
    "medications": [
      {
        "medicationId": "550e8400-e29b-41d4-a716-446655440003",
        "name": "环孢素软胶囊",
        "dosage": "4粒",
        "scheduledTime": "08:00",
        "status": "taken"
      },
      {
        "medicationId": "550e8400-e29b-41d4-a716-446655440005",
        "name": "钙片",
        "dosage": "1片",
        "scheduledTime": "12:00",
        "status": "pending"
      }
    ],
    "alerts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "level": "warning",
        "message": "肌酐较上次上升25%，建议及时就医"
      }
    ],
    "recentMetrics": [
      {
        "name": "肌酐",
        "key": "creatinine",
        "value": 180,
        "unit": "μmol/L",
        "status": "high",
        "date": "2024-03-25"
      },
      {
        "name": "尿素氮",
        "key": "urea",
        "value": 12.5,
        "unit": "mmol/L",
        "status": "high",
        "date": "2024-03-25"
      }
    ]
  }
}
```

---

## 4. WebSocket 接口（实时通知）

### 4.1 连接

```javascript
const ws = new WebSocket('wss://api.healthapp.com/ws');

// 连接后发送认证
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: '<access_token>'
  }));
};
```

### 4.2 消息类型

#### 用药提醒
```json
{
  "type": "medication_reminder",
  "data": {
    "medicationId": "550e8400-e29b-41d4-a716-446655440003",
    "name": "环孢素软胶囊",
    "dosage": "4粒",
    "scheduledTime": "08:00"
  },
  "timestamp": "2024-03-25T08:00:00.000Z"
}
```

#### 预警通知
```json
{
  "type": "alert",
  "data": {
    "alertId": "550e8400-e29b-41d4-a716-446655440006",
    "level": "critical",
    "message": "血钾严重超标，请立即联系医生！"
  },
  "timestamp": "2024-03-25T09:30:00.000Z"
}
```

---

## 5. 速率限制

| 接口 | 限制 |
|------|------|
| 登录/注册 | 5次/分钟/IP |
| 发送验证码 | 1次/分钟/手机号 |
| 通用API | 100次/分钟/用户 |
| OCR识别 | 10次/小时/用户 |

---

## 6. 附录

### 6.1 枚举值定义

#### 透析类型 (DialysisType)
- `none`: 无透析
- `hemodialysis`: 血液透析
- `peritoneal`: 腹膜透析

#### 原发疾病 (PrimaryDisease)
- `diabetic_nephropathy`: 糖尿病肾病
- `hypertensive_nephropathy`: 高血压肾病
- `chronic_glomerulonephritis`: 慢性肾炎
- `other`: 其他

#### 药物类型 (DrugType)
- `cyclosporine`: 环孢素
- `tacrolimus`: 他克莫司
- `sirolimus`: 雷帕霉素
- `other`: 其他

#### 采样时间 (SamplingTime)
- `C0`: 服药前（谷浓度）
- `C2`: 服药后2小时（峰浓度）

#### 用药频率 (MedicationFrequency)
- `once_daily`: 每日1次
- `twice_daily`: 每日2次
- `three_daily`: 每日3次
- `every_other_day`: 隔日一次
- `weekly`: 每周一次

#### 用药状态 (MedicationStatus)
- `active`: 进行中
- `paused`: 已暂停
- `discontinued`: 已停用

#### 服药记录状态 (MedicationLogStatus)
- `taken`: 已服药
- `missed`: 漏服
- `skipped`: 跳过

#### 预警级别 (AlertLevel)
- `info`: 信息
- `warning`: 警告
- `critical`: 严重

#### 预警类型 (AlertType)
- `metric`: 指标异常
- `medication`: 用药相关
- `system`: 系统通知

---

**文档结束**
