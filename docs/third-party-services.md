# 第三方服务配置指南

本文档说明如何配置项目所需的第三方服务：百度AI OCR、阿里云短信服务。

## 配置状态总览

| 服务 | 状态 | 说明 |
|------|------|------|
| 百度AI OCR | ✅ 已集成 | 已实现真实的OCR调用，支持8项健康指标提取 |
| 阿里云短信 | ⏳ 待配置 | 需要申请签名和模板（生产环境使用） |
| Web Push | ✅ 已完成 | 浏览器原生推送，支持用药提醒 |

---

## 1. 百度AI OCR 配置

### 1.1 注册百度智能云账号

1. 访问 [百度智能云](https://cloud.baidu.com/)
2. 点击右上角「注册/登录」，使用百度账号登录
3. 完成实名认证（个人或企业）

### 1.2 创建OCR应用

1. 进入 [百度AI开放平台](https://ai.baidu.com/)
2. 点击「控制台」进入管理后台
3. 选择「文字识别」服务
4. 点击「创建应用」
5. 填写应用信息：
   - **应用名称**：肾健康助手OCR
   - **应用描述**：用于化验单识别
   - **应用类别**：医疗健康
6. 选择需要的能力（勾选）：
   - ✅ 通用文字识别（高精度版）
   - ✅ 医疗票据识别（如有）
7. 点击「立即创建」

### 1.3 获取API密钥

创建成功后，在应用详情页获取：

```
AppID: 你的AppID
API Key: 你的API Key
Secret Key: 你的Secret Key
```

### 1.4 配置到项目

编辑 `.env` 文件：

```bash
# 百度OCR配置
BAIDU_OCR_APP_ID="你的AppID"
BAIDU_OCR_API_KEY="你的API Key"
BAIDU_OCR_SECRET_KEY="你的Secret Key"
```

### 1.5 实现说明（v1.2.0已集成）

后端已实现完整的百度OCR集成：

- **Token管理**：`src/utils/baiduOcr.ts` 自动获取和缓存Access Token（有效期30天，提前5分钟刷新）
- **OCR服务**：`src/services/ocr.service.ts` 集成真实百度OCR调用
- **智能提取**：支持8项健康指标自动提取（肌酐、尿素氮、钾、钠、磷、尿酸、血红蛋白、血糖）
- **多阶段匹配**：
  - 第一阶段：匹配带单位的完整格式（如"肌酐 171 μmol/L"）
  - 第二阶段：匹配表格格式（如"肌酐    171"，自动使用默认单位）
  - 第三阶段：通用数值提取（根据数值范围推断指标类型）

**支持的化验单格式：**
- 医院标准化验单
- 体检机构报告（爱康国宾/美年大健康等）
- 手写/打印化验单

**手动获取token测试：**

```bash
curl -X POST "https://aip.baidubce.com/oauth/2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=你的API_KEY&client_secret=你的SECRET_KEY"
```

---

## 2. 阿里云短信服务配置（待配置）

> **注意**：当前版本短信功能默认禁用，使用应用内通知替代。如需启用短信，请完成以下配置。

### 禁用短信的配置

编辑 `.env` 文件：

```bash
# 禁用短信功能
SMS_ENABLED=false
ENABLE_SMS_NOTIFICATION=false
```

### 2.1 注册阿里云账号

1. 访问 [阿里云](https://www.aliyun.com/)
2. 点击「免费注册」，完成账号注册
3. 完成实名认证（个人或企业）

### 2.2 开通短信服务

1. 登录阿里云控制台
2. 搜索「短信服务」并进入
3. 点击「立即开通」（按量付费，无最低消费）
4. 同意服务协议，完成开通

### 2.3 申请短信签名

**路径：** 短信服务控制台 → 国内消息 → 签名管理 → 添加签名

填写签名信息：
- **签名类型**：
  - 验证码/通知类型（推荐，审核快）
  - 推广类型（需要企业资质）
- **签名名称**：肾健康助手
- **适用场景**：
  - 验证码：用户注册、登录验证
  - 通知：用药提醒、异常提醒
- **签名来源**：
  - 企事业单位全称/简称
  - 工信部备案的网站名称
  - APP应用名称（需已上线）
- **证明文件**：
  - 个人：身份证正反面
  - 企业：营业执照

**审核时间：** 通常2小时内

### 2.4 申请短信模板

**路径：** 短信服务控制台 → 国内消息 → 模板管理 → 添加模板

#### 模板1：验证码

- **模板类型**：验证码
- **模板名称**：注册登录验证码
- **模板内容**：
  ```
  您的验证码是${code}，5分钟内有效。如非本人操作，请忽略此短信。
  ```
- **申请说明**：用于用户注册和登录验证

#### 模板2：用药提醒

- **模板类型**：通知
- **模板名称**：用药提醒
- **模板内容**：
  ```
  提醒您：该服用${medication}了，剂量${dosage}。时间：${time}。
  ```
- **申请说明**：用于定时提醒用户服药

#### 模板3：漏服提醒

- **模板类型**：通知
- **模板名称**：漏服提醒
- **模板内容**：
  ```
  您错过了${time}的${medication}用药，请及时补服或咨询医生。
  ```
- **申请说明**：用于漏服药物的提醒

#### 模板4：异常指标提醒

- **模板类型**：通知
- **模板名称**：健康异常提醒
- **模板内容**：
  ```
  您的${metric}指标异常（${value}），超出正常范围(${threshold})，建议及时就医。
  ```
- **申请说明**：用于健康指标异常预警

**审核时间：** 通常2小时内

### 2.5 获取AccessKey

**路径：** 右上角头像 → AccessKey管理

1. 点击「创建AccessKey」
2. 完成身份验证（短信/邮箱）
3. 保存 AccessKey ID 和 AccessKey Secret
   ⚠️ **重要**：Secret只在创建时显示一次，请妥善保存

### 2.6 配置到项目

编辑 `.env` 文件：

```bash
# 阿里云短信服务配置
SMS_ACCESS_KEY="你的AccessKey ID"
SMS_SECRET_KEY="你的AccessKey Secret"
SMS_SIGN_NAME="肾健康助手"
SMS_TEMPLATE_CODE_VERIFICATION="SMS_xxxxxxxxx"
SMS_TEMPLATE_CODE_REMINDER="SMS_xxxxxxxxx"
SMS_TEMPLATE_CODE_MISS="SMS_xxxxxxxxx"
SMS_TEMPLATE_CODE_ALERT="SMS_xxxxxxxxx"
```

模板CODE在阿里云控制台 → 模板管理 中查看。

---

## 3. 费用说明

### 3.1 百度AI OCR

| 服务 | 免费额度 | 超出价格 |
|------|----------|----------|
| 通用文字识别 | 50,000次/月 | 0.005元/次 |
| 医疗票据识别 | 1,000次/月 | 0.02元/次 |

**估算**：每月100次化验单识别 ≈ 免费

### 3.2 阿里云短信

| 短信类型 | 单价（国内） |
|----------|-------------|
| 验证码 | 0.045元/条 |
| 通知类 | 0.045元/条 |
| 推广类 | 0.055元/条 |

**新用户优惠**：首次开通赠送100条免费短信

**估算**：
- 验证码：每月50条 × 0.045 = 2.25元
- 用药提醒：每天3次 × 30天 × 0.045 = 4.05元
- **总计**：约6-10元/月

---

## 4. 测试验证

### 4.1 测试OCR服务

```bash
# 启动后端服务
cd src/backend && npm run dev

# 使用curl测试OCR接口
curl -X POST http://localhost:3001/api/ocr/recognize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的JWT_TOKEN" \
  -d '{
    "imageBase64": "base64编码的图片"
  }'
```

### 4.2 测试短信服务

```bash
# 发送验证码
curl -X POST http://localhost:3001/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800138000",
    "type": "register"
  }'
```

---

## 5. 常见问题

### Q1: 百度OCR返回"Access token invalid"

- 检查API Key和Secret Key是否正确
- 检查服务器时间是否准确（时间偏差会导致token失效）
- 检查网络是否能访问百度云服务

### Q2: 阿里云短信返回"签名不合法"

- 确认签名已审核通过
- 确认签名与模板匹配
- 检查签名名称是否包含空格或特殊字符

### Q3: 短信发送成功但收不到

- 检查手机号是否被运营商拦截
- 检查是否被手机安全软件拦截
- 检查短信模板变量是否正确替换

### Q4: 费用超出预期

- 在阿里云控制台设置每日/每月发送上限
- 在百度云控制台设置QPS限制
- 使用测试手机号白名单功能

---

## 6. 相关文件

| 文件路径 | 说明 |
|---------|------|
| `src/backend/src/utils/baiduOcr.ts` | 百度OCR客户端模块 |
| `src/backend/src/services/ocr.service.ts` | OCR服务实现 |
| `src/backend/src/services/notification.service.ts` | 通知服务（含短信/Web Push） |
| `src/backend/src/workers/notification.worker.ts` | 通知任务Worker |
| `src/backend/.env.example` | 后端环境变量模板 |
| `infrastructure/.env.production` | 生产环境配置 |

---

## 7. 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.0 | 2026-03-30 | 初始文档 |
| v1.2.0 | 2026-04-05 | 更新OCR集成状态，添加短信禁用说明 |

---

*最后更新: 2026-04-05*
