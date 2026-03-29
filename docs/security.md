# 安全规范文档

**版本**: v1.0.0
**日期**: 2026-03-29
**作者**: 技术架构师 Agent

---

## 1. 概述

本文档定义肾衰竭健康监测 Web 应用的安全规范，确保系统符合中国网络安全法和个人信息保护法（PIPL）要求，保护用户医疗数据安全。

### 1.1 安全目标

- 保护用户敏感医疗数据不被泄露
- 防止未授权访问和数据篡改
- 确保系统可用性和数据完整性
- 符合法律法规要求

### 1.2 适用范围

- 前端应用（React SPA）
- 后端 API（Node.js + Express）
- 数据库（PostgreSQL）
- 缓存系统（Redis）
- 第三方服务集成

---

## 2. 认证与授权

### 2.1 JWT 认证策略

#### Token 设计

```typescript
// Access Token 负载
interface AccessTokenPayload {
  sub: string;        // 用户ID (UUID)
  iat: number;        // 签发时间
  exp: number;        // 过期时间 (24小时)
  type: 'access';
}

// Refresh Token 负载
interface RefreshTokenPayload {
  sub: string;        // 用户ID (UUID)
  iat: number;        // 签发时间
  exp: number;        // 过期时间 (7天)
  type: 'refresh';
  jti: string;        // 唯一标识，用于吊销
}
```

#### Token 存储

```typescript
// 服务器端设置 Cookie
res.cookie('accessToken', accessToken, {
  httpOnly: true,           // 防止 XSS
  secure: true,             // 仅 HTTPS
  sameSite: 'strict',       // CSRF 防护
  maxAge: 24 * 60 * 60 * 1000,  // 24小时
  domain: '.healthapp.com'
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7天
  path: '/auth/refresh'  // 仅刷新接口可用
});
```

#### Token 吊销机制

```typescript
// 使用 Redis 存储吊销的 Token
// key: token:jti:{jti}, value: 吊销时间, ttl: token剩余有效期

async function revokeToken(jti: string, exp: number): Promise<void> {
  const ttl = exp - Math.floor(Date.now() / 1000);
  await redis.setex(`token:jti:${jti}`, ttl, Date.now().toString());
}

async function isTokenRevoked(jti: string): Promise<boolean> {
  const result = await redis.get(`token:jti:${jti}`);
  return result !== null;
}
```

### 2.2 权限控制

#### 数据隔离原则

```typescript
// 所有数据库查询必须包含 user_id 过滤
// 错误示例：
const record = await prisma.healthRecord.findUnique({
  where: { id: recordId }
});

// 正确示例：
const record = await prisma.healthRecord.findFirst({
  where: {
    id: recordId,
    userId: currentUserId  // 必须验证所有权
  }
});
```

#### 中间件实现

```typescript
// auth.middleware.ts
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.accessToken || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未提供认证令牌'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload;

    // 检查 Token 是否被吊销
    if (payload.jti && await isTokenRevoked(payload.jti)) {
      return res.status(401).json({
        code: 401,
        message: '令牌已失效'
      });
    }

    req.userId = payload.sub;
    next();
  } catch (error) {
    return res.status(401).json({
      code: 401,
      message: '无效的认证令牌'
    });
  }
}
```

---

## 3. 数据安全

### 3.1 密码安全

#### 存储策略

```typescript
import bcrypt from 'bcrypt';

// 密码哈希配置
const SALT_ROUNDS = 12;  // cost factor >= 12

// 创建密码哈希
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// 验证密码
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

#### 密码复杂度要求

```typescript
// 密码验证规则
const PASSWORD_RULES = {
  minLength: 6,
  maxLength: 20,
  requireLetter: true,    // 必须包含字母
  requireNumber: true,    // 必须包含数字
  requireSpecial: false,  // 不强制特殊字符（考虑老年用户）
  preventCommon: true     // 防止常见密码
};

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < PASSWORD_RULES.minLength) {
    return { valid: false, message: `密码长度不能少于${PASSWORD_RULES.minLength}位` };
  }
  if (password.length > PASSWORD_RULES.maxLength) {
    return { valid: false, message: `密码长度不能超过${PASSWORD_RULES.maxLength}位` };
  }
  if (PASSWORD_RULES.requireLetter && !/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含字母' };
  }
  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }

  return { valid: true };
}
```

### 3.2 敏感数据加密

#### 数据库字段加密

```typescript
import crypto from 'crypto';

// AES-256-GCM 加密配置
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;  // 32字节密钥
const ALGORITHM = 'aes-256-gcm';

interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

// 加密函数
function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

// 解密函数
function decrypt(data: EncryptedData): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(data.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### 需要加密的字段

| 表名 | 字段 | 加密方式 |
|------|------|----------|
| users | phone | 哈希（用于查询）+ 加密（存储） |
| user_profiles | name | AES-256 加密 |
| health_records | notes | AES-256 加密（可能包含敏感信息） |
| medication_logs | notes | AES-256 加密 |

### 3.3 传输安全

#### TLS 配置

```nginx
# nginx ssl 配置
server {
    listen 443 ssl http2;
    server_name api.healthapp.com;

    # SSL 证书
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 强制 TLS 1.3
    ssl_protocols TLSv1.3;
    ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 其他安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

---

## 4. 输入验证

### 4.1 验证中间件

```typescript
// validation.middleware.ts
import { body, param, query, validationResult } from 'express-validator';

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: 400,
      message: '请求参数错误',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
}

// 常用验证规则
export const validators = {
  phone: body('phone')
    .isMobilePhone('zh-CN')
    .withMessage('手机号格式不正确'),

  password: body('password')
    .isLength({ min: 6, max: 20 })
    .withMessage('密码长度必须在6-20位之间')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('密码必须包含字母和数字'),

  uuid: (field: string) => param(field)
    .isUUID()
    .withMessage(`${field}格式不正确`),

  date: (field: string) => body(field)
    .isDate()
    .withMessage(`${field}日期格式不正确`),

  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ]
};
```

### 4.2 SQL 注入防护

使用 Prisma ORM 自动防护 SQL 注入：

```typescript
// 安全 - Prisma 自动转义
const records = await prisma.healthRecord.findMany({
  where: {
    userId: userId,
    recordDate: {
      gte: startDate,
      lte: endDate
    }
  }
});

// 危险 - 原始查询必须小心
// 如需使用 $queryRaw，确保使用参数化查询
const result = await prisma.$queryRaw`
  SELECT * FROM health_records
  WHERE user_id = ${userId}
  AND record_date >= ${startDate}
`;
```

### 4.3 XSS 防护

#### 前端防护

```typescript
// 使用 DOMPurify 清理用户输入
import DOMPurify from 'dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],  // 不允許任何 HTML 标签
    ALLOWED_ATTR: []
  });
}

// React 自动转义（但属性需要小心）
// 安全
<div>{userInput}</div>

// 危险
dangerouslySetInnerHTML={{ __html: userInput }}
```

#### 后端防护

```typescript
// 对所有用户输入进行转义存储
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 在保存到数据库前清理
const sanitizedNotes = sanitizeInput(req.body.notes);
```

---

## 5. 速率限制

### 5.1 API 速率限制

```typescript
// rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// 通用 API 限制
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 60 * 1000,  // 1分钟
  max: 100,  // 每用户每分钟100次
  keyGenerator: (req) => req.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试'
    });
  }
});

// 认证接口限制
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 60 * 1000,  // 1分钟
  max: 5,  // 每IP每分钟5次
  skipSuccessfulRequests: true,  // 成功请求不计数
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: '登录尝试次数过多，请稍后再试'
    });
  }
});

// 验证码发送限制
export const verificationCodeLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:vcode:'
  }),
  windowMs: 60 * 1000,  // 1分钟
  max: 1,  // 每手机号每分钟1次
  keyGenerator: (req) => req.body.phone || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: '验证码发送过于频繁，请稍后再试'
    });
  }
});
```

### 5.2 应用层限制

```typescript
// 登录失败锁定
async function checkLoginLock(phone: string): Promise<{ locked: boolean; remainingTime?: number }> {
  const key = `login:fail:${phone}`;
  const failCount = await redis.incr(key);

  if (failCount === 1) {
    await redis.expire(key, 15 * 60);  // 15分钟过期
  }

  if (failCount >= 5) {
    const ttl = await redis.ttl(key);
    return { locked: true, remainingTime: ttl };
  }

  return { locked: false };
}

async function clearLoginFail(phone: string): Promise<void> {
  await redis.del(`login:fail:${phone}`);
}
```

---

## 6. 日志与审计

### 6.1 日志规范

```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'health-app-api',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 审计日志
export function auditLog(action: string, userId: string, details: Record<string, unknown>) {
  logger.info('AUDIT', {
    action,
    userId,
    details,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    userAgent: details.userAgent
  });
}
```

### 6.2 敏感操作审计

```typescript
// 需要记录审计日志的操作
const AUDIT_ACTIONS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_REGISTER: 'user:register',
  PASSWORD_CHANGE: 'user:password_change',
  PROFILE_UPDATE: 'user:profile_update',
  RECORD_CREATE: 'health_record:create',
  RECORD_UPDATE: 'health_record:update',
  RECORD_DELETE: 'health_record:delete',
  MEDICATION_CREATE: 'medication:create',
  MEDICATION_DELETE: 'medication:delete',
  DATA_EXPORT: 'data:export',
  ACCOUNT_DELETE: 'user:account_delete'
};

// 使用示例
app.post('/auth/login', async (req, res) => {
  const result = await loginUser(req.body);

  auditLog(AUDIT_ACTIONS.USER_LOGIN, result.userId, {
    phone: req.body.phone,
    success: result.success,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.json(result);
});
```

---

## 7. 隐私合规 (PIPL)

### 7.1 数据收集最小化

```typescript
// 只收集必要的数据
const REQUIRED_FIELDS = {
  registration: ['phone', 'password'],
  profile: ['dialysisType'],  // 仅医疗必需
  healthRecord: ['recordDate']  // 其他指标可选
};

// 明确禁止收集的敏感信息
const PROHIBITED_FIELDS = [
  'idCardNumber',      // 身份证号
  'socialSecurityNumber',
  'preciseLocation',   // 精确位置（除非用户主动分享）
  'contactList',       // 通讯录
  'biometricData'      // 生物识别数据
];
```

### 7.2 用户权利支持

#### 数据导出

```typescript
// 用户数据导出功能
async function exportUserData(userId: string): Promise<UserDataExport> {
  const [user, profile, records, medications, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.healthRecord.findMany({ where: { userId } }),
    prisma.medication.findMany({ where: { userId } }),
    prisma.medicationLog.findMany({ where: { userId } })
  ]);

  return {
    exportDate: new Date().toISOString(),
    user: {
      phone: maskPhone(user!.phone),
      createdAt: user!.createdAt
    },
    profile,
    healthRecords: records,
    medications,
    medicationLogs: logs
  };
}
```

#### 账号注销

```typescript
// 软删除实现
async function deactivateAccount(userId: string): Promise<void> {
  await prisma.$transaction([
    // 标记用户为已删除
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        phone: null,  // 清除手机号（唯一约束）
        status: 'deleted'
      }
    }),

    // 保留医疗记录（法规要求），但去标识化
    prisma.healthRecord.updateMany({
      where: { userId },
      data: { userId: 'ANONYMIZED' }
    }),

    // 删除敏感数据
    prisma.userProfile.delete({ where: { userId } }),
    prisma.medication.deleteMany({ where: { userId } })
  ]);

  // 记录审计日志
  auditLog(AUDIT_ACTIONS.ACCOUNT_DELETE, userId, { method: 'soft_delete' });
}
```

### 7.3 隐私政策要点

```markdown
## 隐私政策（摘要）

### 我们收集的信息
1. **账户信息**：手机号（用于登录和身份验证）
2. **健康数据**：您主动录入的健康指标、化验单数据
3. **用药信息**：您设置的用药提醒和服药记录

### 我们如何使用信息
- 提供健康数据记录和展示服务
- 生成健康趋势分析和预警
- 发送用药提醒通知

### 信息共享
- 我们不会将您的个人数据出售给第三方
- 仅在法律要求或保护您安全时披露数据

### 您的权利
- 访问、更正您的个人数据
- 导出您的健康数据
- 注销账户（数据将在保留期后删除）

### 数据安全
- 使用行业标准的加密技术保护数据
- 定期进行安全审计
```

---

## 8. 安全清单

### 8.1 开发阶段检查项

| 检查项 | 状态 | 说明 |
|--------|------|------|
| [ ] 所有 API 都有认证中间件保护 | | 除登录/注册外 |
| [ ] 所有用户输入都经过验证 | | 使用 express-validator |
| [ ] 密码使用 bcrypt 加密存储 | | cost factor >= 12 |
| [ ] 敏感数据使用 AES-256 加密 | | 如姓名、备注等 |
| [ ] 使用 HTTPS 传输所有数据 | | TLS 1.3 |
| [ ] 设置了适当的安全响应头 | | HSTS, CSP, X-Frame-Options |
| [ ] 实现了速率限制 | | 按 IP 和用户限制 |
| [ ] 实现了 SQL 注入防护 | | 使用 ORM 参数化查询 |
| [ ] 实现了 XSS 防护 | | 输入清理和输出转义 |
| [ ] 实现了 CSRF 防护 | | SameSite Cookie |
| [ ] 敏感操作有审计日志 | | 登录、修改、删除等 |
| [ ] 实现了 Token 吊销机制 | | 使用 Redis 存储黑名单 |

### 8.2 部署阶段检查项

| 检查项 | 状态 | 说明 |
|--------|------|------|
| [ ] 生产环境使用强密码 | | 数据库、Redis、JWT 密钥 |
| [ ] 密钥存储在环境变量 | | 不使用硬编码 |
| [ ] 数据库使用 SSL 连接 | | 加密传输 |
| [ ] 服务器防火墙配置 | | 只开放必要端口 |
| [ ] 日志不包含敏感信息 | | 脱敏处理 |
| [ ] 定期备份数据库 | | 加密存储备份 |
| [ ] 配置了监控告警 | | 异常行为检测 |

### 8.3 运维阶段检查项

| 检查项 | 频率 | 说明 |
|--------|------|------|
| [ ] 审查访问日志 | 每周 | 检查异常访问模式 |
| [ ] 更新依赖包 | 每月 | 修复安全漏洞 |
| [ ] 轮换加密密钥 | 每季度 | JWT 密钥、数据库密钥 |
| [ ] 安全渗透测试 | 每半年 | 第三方安全审计 |
| [ ] 备份恢复测试 | 每季度 | 验证备份有效性 |

---

## 9. 应急响应

### 9.1 安全事件分级

| 级别 | 描述 | 响应时间 | 示例 |
|------|------|----------|------|
| P0 | 严重 | 立即 | 数据泄露、系统入侵 |
| P1 | 高 | 1小时内 | 大量异常登录、DDoS |
| P2 | 中 | 4小时内 | 个别账户异常、漏洞发现 |
| P3 | 低 | 24小时内 | 低风险配置问题 |

### 9.2 应急响应流程

```
1. 发现/报告
   ↓
2. 评估定级 (P0-P3)
   ↓
3. 遏制影响
   - P0: 立即下线服务
   - P1: 封锁异常IP/账户
   - P2: 限制功能访问
   ↓
4. 根因分析
   ↓
5. 修复漏洞
   ↓
6. 验证修复
   ↓
7. 事后复盘
   ↓
8. 更新安全规范
```

### 9.3 联系信息

```yaml
security_team:
  email: security@healthapp.com
  phone: +86-xxx-xxxx-xxxx
  oncall: https://pagerduty.com/healthapp

escalation:
  level_1: 安全工程师
  level_2: 技术负责人
  level_3: CTO
```

---

**文档结束**
