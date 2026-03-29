# 第三方服务快速配置指南

本指南帮助你在5分钟内完成第三方服务的配置。

---

## 配置清单

### 1. 百度AI OCR（化验单识别）

**必须配置**：
```bash
BAIDU_OCR_APP_ID="你的AppID"
BAIDU_OCR_API_KEY="你的API Key"
BAIDU_OCR_SECRET_KEY="你的Secret Key"
```

**快速获取**：
1. 访问 https://ai.baidu.com/
2. 登录 → 控制台 → 文字识别 → 创建应用
3. 复制 AppID / API Key / Secret Key

---

### 2. 阿里云短信（验证码+提醒）

**必须配置**：
```bash
SMS_ACCESS_KEY="你的AccessKey ID"
SMS_SECRET_KEY="你的AccessKey Secret"
SMS_SIGN_NAME="肾健康助手"
SMS_TEMPLATE_CODE_VERIFICATION="SMS_xxxxxx"
```

**快速获取**：
1. 访问 https://www.aliyun.com/
2. 搜索「短信服务」→ 立即开通
3. 签名管理 → 添加签名 → 等待审核（2小时）
4. 模板管理 → 添加模板 → 等待审核
5. AccessKey管理 → 创建AccessKey

---

### 3. Web Push（浏览器推送）

**必须配置**：
```bash
VAPID_PUBLIC_KEY="你的公钥"
VAPID_PRIVATE_KEY="你的私钥"
```

**快速生成**：
```bash
npx web-push generate-vapid-keys
```

---

## 配置步骤

### Step 1: 复制环境变量文件

```bash
cp src/backend/.env.example src/backend/.env
```

### Step 2: 编辑 .env 文件

```bash
# 使用你喜欢的编辑器
vim src/backend/.env
# 或
nano src/backend/.env
# 或直接在IDE中编辑
```

### Step 3: 填入你的配置

根据上面的配置清单，填入从各平台获取的密钥。

### Step 4: 重启服务

```bash
# 后端
cd src/backend && npm run dev

# 前端（如果配置了Web Push）
cd src/frontend && npm run dev
```

---

## 验证配置

### 测试OCR

```bash
curl -X POST http://localhost:3001/api/ocr/recognize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "iVBORw0KGgo..."}'
```

### 测试短信

```bash
curl -X POST http://localhost:3001/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000", "type": "register"}'
```

查看后端日志，如果配置正确会看到「验证码短信已发送」的日志。

---

## 开发模式 vs 生产模式

### 开发模式（默认）

- OCR 返回模拟数据
- 短信记录到日志，不真正发送
- Web Push 记录到日志

**查看模拟数据**：查看后端控制台输出

### 生产模式

配置好密钥后，服务会自动切换到真实模式：
- OCR 调用百度AI API
- 短信通过阿里云发送
- Web Push 推送到浏览器

---

## 常见问题

**Q: 不想现在配置，可以先开发吗？**
A: 可以！所有服务都有模拟模式，不配置也能正常运行。

**Q: 配置后没生效？**
A: 重启后端服务，环境变量只在启动时读取。

**Q: 短信发送失败？**
A: 检查：
1. 签名是否审核通过
2. 模板CODE是否正确
3. AccessKey是否有短信服务权限

**Q: 需要多少钱？**
A:
- 百度OCR：每月5万次免费，足够使用
- 阿里云短信：新用户送100条，后续约0.045元/条
- Web Push：完全免费

---

## 下一步

配置完成后，建议：
1. 部署到云服务器（阿里云/腾讯云）
2. 配置生产环境域名和HTTPS
3. 测试真实短信和推送通知

详细文档参见：`docs/third-party-services.md`

---

*最后更新: 2026-03-30*
