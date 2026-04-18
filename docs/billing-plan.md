# HealthMonitoringAssistant 付费功能开发指导方案

> **版本**: v1.0.0  
> **状态**: 待开发（内测通过后启动）  
> **目标**: 为 HealthMonitoringAssistant 提供可落地的商业化付费方案，兼顾技术实现与医疗合规。

---

## 1. 概述与目标

### 1.1 核心决策
- **商业模式**: Freemium（免费基础版 + 高级会员订阅）
- **定价锚点**: 年费折扣需明显（如买10个月送2个月），贴合中老年用户消费习惯
- **合规底线**: 绝不触碰"医疗诊断"红线，付费功能仅限于**数据管理工具属性**
- **分阶段实施**: 先验证付费意愿，再接入真实支付，降低前期合规风险

### 1.2 适用场景
- 本文档适用于应用完成**内测**、确认核心功能和用户留存达标后启动的开发工作
- 开发前须确认：已完成公司注册/ICP备案，或暂时以"捐赠/支持"模式替代正式支付

---

## 2. 商业模式设计

### 2.1 功能分层

| 模块 | 免费版 | 高级版 (Premium) |
|---|---|---|
| **基础记录** | 体重/血压/尿量打卡，最近 30 天历史 | 无限历史记录，支持按日期搜索 |
| **化验指标** | 最多录入 3 条化验记录 | 无限条数，完整趋势图表 |
| **用药管理** | 最多添加 3 种药物提醒 | 无限药物，含**用药冲突检测** |
| **OCR识别** | 每月 3 次 | 无限次识别 |
| **健康洞察** | 基础文本摘要 | 深度分析报告 + 复查建议 |
| **数据导出** | 不支持 | PDF 报告 / Excel 导出 |
| **复查提醒** | 不支持 | 智能提醒（基于用户类型+上次日期） |
| **云端备份** | 仅本地存储 | 加密云端同步 + 跨设备恢复 |
| **家庭共享** | 不支持 | 最多关联 3 位家属账号 |

### 2.2 定价策略建议

| 方案 | 价格 | 说明 |
|---|---|---|
| 月付 | ¥18/月 | 降低尝鲜门槛 |
| 年付 | ¥158/年 | 相当于 ¥13.1/月，7.3折，主推方案 |
| 终身 | ¥398/一次性 | 针对极度依赖的长期患者 |

**促销策略**：
- 首次订阅提供 **7 天免费试用**（需绑定支付方式）
- 肾移植纪念日/世界肾脏日（3月12日）推出限时折扣

---

## 3. 技术架构设计

### 3.1 数据库模型扩展 (Prisma)

在 `src/backend/prisma/schema.prisma` 中追加以下模型：

```prisma
// 订阅计划定义（可配置化，便于后期调整价格）
model Plan {
  id          String   @id @default(uuid())
  tier        String   @unique // premium / platinum
  name        String   // 高级会员
  description String?
  priceMonth  Int      // 月付价格，单位：分（人民币最小单位）
  priceYear   Int      // 年付价格，单位：分
  features    Json     // [{ "id": "ocr", "limit": -1 }, ...] - -1 代表无限
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

// 用户订阅状态
model Subscription {
  id                   String   @id @default(uuid())
  userId               String   @unique
  planId               String
  tier                 String   // free | premium | platinum
  status               String   // trial | active | past_due | cancelled | expired
  
  // 周期管理
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean  @default(false)
  autoRenew            Boolean  @default(true)
  
  // 试用管理
  trialEndsAt          DateTime?
  trialReminderSent    Boolean  @default(false) // 试用到期前24h提醒
  
  // 支付渠道记录
  paymentMethod        String?  // alipay | wechatpay
  paymentMethodId      String?  // 第三方支付协议号（用于自动续费）
  
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  user                 User     @relation(fields: [userId], references: [id])
  plan                 Plan     @relation(fields: [planId], references: [id])
  payments             Payment[]
}

// 支付流水
model Payment {
  id              String   @id @default(uuid())
  userId          String
  subscriptionId  String?
  
  amount          Int      // 支付金额，单位：分
  currency        String   @default("CNY")
  channel         String   // alipay | wechatpay
  
  status          String   // pending | success | failed | refunded | closed
  outTradeNo      String   @unique // 商户系统生成的唯一订单号 (HMA-20260418-RANDOM)
  transactionId   String?  @unique // 支付宝/微信返回的流水号
  
  paidAt          DateTime?
  refundedAt      DateTime?
  refundAmount    Int?     // 退款金额，单位：分
  
  metadata        Json?    // 第三方原始回调数据存档
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
  user            User          @relation(fields: [userId], references: [id])
  
  @@index([userId, status])
  @@index([outTradeNo])
}

// 用量配额日志（用于按次限制，如 OCR 次数）
model UsageLog {
  id        String   @id @default(uuid())
  userId    String
  feature   String   // ocr | export_pdf | family_member
  quantity  Int      @default(1)
  period    String   // 格式：YYYY-MM，用于月限统计
  createdAt DateTime @default(now())
  
  @@unique([userId, feature, period])
  @@index([userId, feature, period])
}
```

#### 现有 User 模型需追加关联
```prisma
model User {
  // ... 现有字段不变 ...
  
  subscription Subscription?
  payments     Payment[]
  usageLogs    UsageLog[]
}
```

### 3.2 后端模块设计

在 `src/backend/src/` 下新建目录结构：

```
src/
├── modules/
│   ├── billing/           # 计费与订阅模块
│   │   ├── billing.controller.ts
│   │   ├── billing.service.ts     # 套餐查询、当前订阅状态
│   │   ├── billing.routes.ts
│   │   └── billing.validator.ts
│   ├── payment/           # 支付核心模块
│   │   ├── payment.controller.ts
│   │   ├── payment.service.ts     # 统一下单、回调处理、退款
│   │   ├── payment.routes.ts
│   │   └── payment.adapter.ts     # 支付宝/微信 SDK 适配器
│   └── quota/             # 用量配额模块
│       ├── quota.service.ts       # 检查/扣减/恢复配额
│       └── quota.middleware.ts    # 功能拦截中间件
├── middleware/
│   └── subscription.guard.ts      # 订阅状态守卫
└── workers/
    └── billing.worker.ts          # 定时任务：到期检测、续费提醒
```

### 3.3 关键接口设计

#### 2.3.1 套餐相关

```typescript
// GET /api/billing/plans
// 获取所有可用套餐
Response: {
  code: 0,
  data: {
    plans: [
      { id: 'premium', name: '高级会员', priceMonth: 1800, priceYear: 15800, features: [...] }
    ]
  }
}

// GET /api/billing/subscription
// 获取当前用户订阅状态（每次启动调用）
Response: {
  code: 0,
  data: {
    tier: 'free', // free | premium
    status: 'active',
    currentPeriodEnd: '2026-05-18T12:00:00Z',
    cancelAtPeriodEnd: false,
    features: { ocrLimit: 3, recordLimit: 3, ... } // 前端据此渲染权限边界
  }
}
```

#### 2.3.2 支付相关

```typescript
// POST /api/payments/create
// 创建支付订单
Body: {
  planId: 'premium',
  cycle: 'year', // month | year
  channel: 'alipay' // alipay | wechatpay
}
Response: {
  code: 0,
  data: {
    outTradeNo: 'HMA-20260418-8A2F9D',
    amount: 15800,
    payParams: { /* 支付宝 trade_no 或微信 prepay_id 等唤起参数 */ }
  }
}

// POST /api/payments/callback/:channel
// 支付回调（仅服务端，需验证签名）
// 支付宝：application/x-www-form-urlencoded
// 微信：application/xml

// GET /api/payments/:outTradeNo/status
// 前端轮询支付状态（或改 WebSocket）
Response: {
  code: 0,
  data: { status: 'success' | 'pending' | 'failed' }
}

// POST /api/billing/cancel
// 取消自动续费（立即生效逻辑改为"到期不续"）
Body: { cancelAtPeriodEnd: true }
```

---

## 4. 支付集成详细指南

### 4.1 渠道选型

| 渠道 | 场景 | SDK/文档 | 费率 | 备注 |
|---|---|---|---|---|
| **支付宝** | 手机网站支付 (H5) / 电脑网站支付 | `alipay-sdk` | ~0.6% | 需企业资质申请商户号 |
| **微信支付** | JSAPI (公众号/浏览器内) / H5 支付 | `wxpay-v3` | ~0.6% | 需开通 JSAPI 权限 |

**MVP 建议**：优先接入 **支付宝手机网站支付**，无需强依赖微信生态，H5 页面在各种浏览器兼容性最好。

### 4.2 接入流程

#### Step 1: 环境准备
- 注册企业/个体户
- 完成 ICP 备案
- 申请支付宝/微信支付商户号
- 配置应用公钥/私钥（支付宝）或 APIv3 密钥（微信）

#### Step 2: 依赖安装
```bash
# 后端
npm install alipay-sdk
npm install wechatpay-axios-plugin
```

#### Step 3: 配置管理 (`.env`)
```
# 支付宝
ALIPAY_APP_ID=your_app_id
ALIPAY_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
ALIPAY_PUBLIC_KEY=alipay_public_key
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do

# 微信
WECHAT_MCH_ID=your_mch_id
WECHAT_APIV3_KEY=your_apiv3_key
WECHAT_APP_ID=your_app_id
WECHAT_CERT_SERIAL_NO=your_cert_serial
WECHAT_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
```

#### Step 4: 核心流程伪代码

**创建订单 (payment.service.ts):**
```typescript
async createOrder(userId: string, planId: string, cycle: string, channel: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  const amount = cycle === 'year' ? plan.priceYear : plan.priceMonth
  const outTradeNo = `HMA-${Date.now()}-${random(6)}`
  
  // 1. 写入待支付记录
  await prisma.payment.create({
    data: { userId, amount, channel, outTradeNo, status: 'pending' }
  })
  
  // 2. 调用第三方下单
  let payParams
  if (channel === 'alipay') {
    payParams = await alipaySdk.exec('alipay.trade.wap.pay', {
      notify_url: `${BASE_URL}/api/payments/callback/alipay`,
      bizContent: { out_trade_no: outTradeNo, total_amount: amount/100, subject: plan.name }
    })
  } else if (channel === 'wechatpay') {
    payParams = await wechatPay.transactions_native({ ... })
  }
  
  return { outTradeNo, amount, payParams }
}
```

**支付回调处理 (payment.service.ts):**
```typescript
async handleCallback(channel: string, rawBody: any) {
  // 1. 严格验签（支付宝/微信提供官方 SDK 方法）
  const isValid = channel === 'alipay' 
    ? alipaySdk.checkNotifySign(rawBody) 
    : verifyWechatSignature(rawBody)
  if (!isValid) throw new AppError('签名验证失败', 400)
  
  // 2. 幂等处理：根据 outTradeNo 查询，已处理则直接返回 success
  const outTradeNo = channel === 'alipay' ? rawBody.out_trade_no : rawBody.out_trade_no
  const payment = await prisma.payment.findUnique({ where: { outTradeNo } })
  if (payment.status === 'success') return 'success'
  
  // 3. 更新支付记录
  await prisma.payment.update({
    where: { outTradeNo },
    data: { 
      status: 'success', 
      transactionId: rawBody.trade_no || rawBody.transaction_id,
      paidAt: new Date(),
      metadata: rawBody
    }
  })
  
  // 4. 激活/续费订阅（事务处理）
  await prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({ where: { userId: payment.userId } })
    const periodEnd = addMonths(new Date(), 1) // 或 12
    
    if (existing) {
      await tx.subscription.update({
        where: { userId: payment.userId },
        data: {
          status: 'active',
          currentPeriodEnd: periodEnd,
          currentPeriodStart: new Date(),
          planId: payment.planId
        }
      })
    } else {
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          tier: 'premium',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd
        }
      })
    }
  })
  
  return 'success'
}
```

### 4.3 自动续费机制

为保证订阅连续性，建议接入**周期扣款**（支付宝：周期扣款协议；微信：委托代扣）：

```
用户首次支付 → 签约自动续费 → 系统在 currentPeriodEnd 前 3 天发起扣款
  ↓ 扣款成功
延长 currentPeriodEnd +1 月/年
  ↓ 扣款失败
进入 past_due 宽限期（7天），期间保留高级权限并推送续费提醒
  ↓ 宽限期后仍未成功
降级为 free，保留数据但限制新功能
```

---

## 5. 权限与用量控制

### 5.1 订阅守卫中间件
```typescript
// middleware/subscription.guard.ts
export const subscriptionGuard = (requiredFeature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user.id
    const quota = await quotaService.check(userId, requiredFeature)
    
    if (!quota.allowed) {
      return res.status(402).json({
        code: 402,
        message: quota.reason, // 'FREE_LIMIT_REACHED' | 'SUBSCRIPTION_EXPIRED'
        data: { upgradeUrl: '/pricing' }
      })
    }
    
    // 在 req 上挂载用量信息，供后续扣减
    req.quota = quota
    next()
  }
}

// 使用示例
router.post('/ocr/upload', authMiddleware, subscriptionGuard('ocr'), ocrController.upload)
router.post('/records', authMiddleware, subscriptionGuard('health_record_create'), recordController.create)
```

### 5.2 前端权限适配
每次应用启动时，调用 `GET /api/billing/subscription` 获取当前权限边界：

```typescript
// stores/billingStore.ts (Zustand)
interface BillingState {
  tier: 'free' | 'premium'
  features: Record<string, number>
  usage: Record<string, number>
  checkAccess: (feature: string) => boolean
  showPaywall: (feature: string) => void // 唤起升级弹窗
}
```

在组件中使用：
```tsx
const ocrLimit = billingStore.features.ocrLimit
const usedOcr = billingStore.usage.ocrThisMonth

{usedOcr >= ocrLimit && billingStore.tier === 'free' && (
  <UpgradeOverlay onClick={() => billingStore.showPaywall('ocr')} />
)}
```

---

## 6. 合规与安全规范

### 6.1 医疗合规红线（不可触碰）

1. **禁止提供诊疗建议**：付费健康分析报告只能做"描述性数据分析"（如"肌酐较上月上升 12%"），严禁出现"建议调整药量""疑似肾炎复发"等诊断性结论。否则将被认定为变相互联网诊疗，面临处罚。
2. **禁止承诺疗效**：所有付费页面、宣传语均不得暗示"使用本产品可改善健康""降低并发症风险"。
3. **强制免责声明**：付费报告头部必须包含固定免责声明："本分析仅供参考，不能替代专业医疗诊断，如有不适请及时就医。"

### 6.2 支付合规

1. **ICP 备案**：在中国大陆提供付费服务，网站/域名必须完成 ICP 备案，否则无法申请支付商户号。
2. **营业执照**：个人开发者无法直接接入微信/支付宝官方 SDK，必须以企业或个体工商户主体申请。
3. **等保要求**：收集并存储用户健康敏感信息，建议通过**网络安全等级保护二级**认证（涉及支付流水及健康数据）。
4. **税务合规**：订阅收入需依法纳税，确保开具电子发票能力（支付宝/微信均有发票接口）。
5. **苹果 App Store 政策**：如果未来上架 iOS App，虚拟订阅服务必须使用**苹果 IAP** 并支付 15%-30% 分成，绕过 IAP 使用自有支付系统将导致下架。

### 6.3 数据与退款政策

- **用户协议**：必须在支付前展示《高级会员服务协议》，明确服务内容、自动续费规则、退款政策。
- **退款规则**：
  - 首次订阅 7 天内未使用核心付费功能，可申请全额退款。
  - 已使用付费功能或因个人原因要求退款，按剩余天数比例退还。
  - 支付宝/微信退款需调用原路退回接口，保留退款流水记录。
- **数据归属**：取消订阅后，历史数据**保留可读但不可新增**，重新订阅后恢复完整权限。

---

## 7. 前端页面设计 (待开发页面)

### 7.1 价格方案页 (`/pricing`)
- 3 列卡片对比（免费 / 月付 / 年付），年付卡片突出"推荐"标签
- 清晰的功能对勾/叉号列表
- 底部 FAQ（如何取消、数据是否保留）

### 7.2 收银台页 (`/checkout`)
- 显示订单摘要（套餐、周期、实付金额）
- 支付方式切换（支付宝 / 微信支付）
- 同意《服务协议》复选框（强制勾选）

### 7.3 会员中心 (`/subscription`)
- 当前套餐、到期时间、自动续费开关
- 支付历史记录
- 取消订阅入口（引导至"到期不续"而非立即失效）

### 7.4 通用付费墙组件 (`PaywallModal`)
- 在免费用户触发限制时弹出
- 文案聚焦"功能价值"而非"你无权使用"
- 提供"暂不升级"关闭按钮，避免强制感

---

## 8. 实施路线图

| 阶段 | 任务 | 预估时间 | 前置条件 |
|---|---|---|---|
| **Phase 0** | 在"设置"页植入**捐赠按钮**（个人收款码），验证用户付费意愿 | 1 天 | 无 |
| **Phase 1** | 后端：完成 Schema 迁移 + Plan/Subscription/Payment 模块框架 | 2-3 天 | 内测完成 |
| **Phase 2** | 接入支付宝 SDK，完成下单-回调-激活全流程（沙箱环境） | 3-5 天 | 企业资质/沙箱账号 |
| **Phase 3** | 前端：Pricing 页、Checkout 页、Paywall 弹窗、用量显示 | 2-3 天 | Phase 1 完成 |
| **Phase 4** | 权限守卫：为 OCR、记录录入等功能接入 `subscriptionGuard` | 2 天 | Phase 3 完成 |
| **Phase 5** | 定时任务：到期检测、续费提醒、宽限期降级逻辑 | 2 天 | Phase 4 完成 |
| **Phase 6** | 退款接口、支付历史、会员中心页面 | 2 天 | Phase 5 完成 |
| **Phase 7** | 生产上线：切到支付宝/微信生产环境、ICP备案、等保评估 | 1-2 周 | 营业执照等 |

**MVP 最小可用版本**（内测用户收费）：只需完成 **Phase 1 + Phase 2 + Phase 3 + Phase 4**，即可实现"选择套餐 -> 支付宝付款 -> 解锁功能"的核心闭环。

---

## 9. 风险清单与应对

| 风险 | 可能性 | 影响 | 应对 |
|---|---|---|---|
| 用户付费意愿低 | 中 | 高 | Phase 0 先通过捐赠/打赏验证 |
| 支付接入资质门槛（公司注册） | 高 | 中 | 可先以"支持开发者"模式收款，再转正 |
| 苹果 App Store 强制 IAP | 中（仅做App时） | 高 | 未来上架 iOS 时，服务端需支持 Apple IAP 收据验证 |
| 被认定涉医违规 | 低 | 极高 | 严格遵守"描述性而非诊断性"原则，法律顾问审核文案 |
| 支付回调欺诈 | 低 | 高 | SDK自带签名验证，不放行任何验签失败请求 |
| 退款纠纷 | 中 | 中 | 明确退款规则写入协议，保留功能使用日志 |

---

## 10. 附录

### 10.1 相关技术文档
- [支付宝开放平台文档](https://opendocs.alipay.com/)
- [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
- [Prisma 关系指南](https://www.prisma.io/docs/orm/prisma-schema/relations)

### 10.2 提交前检查项
- [ ] 数据库迁移文件已生成并通过测试 (`npx prisma migrate dev`)
- [ ] 支付回调接口已做幂等处理
- [ ] 沙箱环境已跑通完整支付流程
- [ ] 退款接口已在沙箱测试
- [ ] 用户协议页面已上线并可在支付前查看
- [ ] 所有医疗相关文案已由非技术人员（模拟患者视角）通读，无诊断性语言

---

**免责声明**: 本方案涉及支付与医疗数据合规，建议在正式实施前咨询专业的法律顾问及网络安全服务机构。
