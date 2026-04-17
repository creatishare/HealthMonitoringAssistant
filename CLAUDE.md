# Claude Code SubAgent 配置

## 项目概述

肾衰竭健康监测Web应用 - MVP版本已完成，当前处于功能增强阶段。

## 当前项目状态 (2026-04-18)

### 已完成的核心功能
1. **用户认证** — 手机号注册/登录、JWT Token、刷新令牌、忘记密码
2. **用户引导** — 首次登录后选择用户类型（肾衰竭/肾移植/其他）
3. **健康记录** — 体重、血压、尿量打卡；化验单指标记录（肌酐、尿素氮、血钾、尿酸、血红蛋白、他克莫司浓度）
4. **OCR识别** — 百度AI医疗票据识别，自动提取化验数据
5. **用药管理** — 19种常用药物底部选择器（含规格联动）、用药提醒、服药记录
6. **Dashboard** — 今日打卡、用药提醒、异常预警、趋势图表（Recharts）
7. **本地健康洞察** — 纯前端规则引擎：趋势分析、异常标记、用药依从性统计、模板摘要
8. **隐私政策** — 10章节完整隐私政策页面，注册流程强制勾选同意
9. **深色模式** — 系统级主题切换，CSS变量驱动
10. **SMS验证码** — 阿里云Dypnsapi20170525集成

### 最近完成的改动
- **2026-04-17**: SMS验证修复、数据库enum修复、`AppError`业务错误处理、authStore token提取修复
- **2026-04-18**: 常用药物BottomSelector（19种药物+规格联动）、隐私政策页面、注册时隐私政策勾选、Playwright E2E测试框架、深色模式底栏修复、本地健康洞察引擎

### 开放待办 (P1)

| # | 任务 | 说明 | 状态 |
|---|------|------|------|
| 1 | **UI响应式适配** | 当前所有页面限制 `max-width: 480px`，仅适配手机端。需评估并实施平板/桌面端响应式方案。这是**最高优先级待办**。 | ❌ 未开始 |
| 2 | **生产环境部署** | 部署到阿里云ECS，生产Redis替换内存Map存储验证码 | ❌ 未开始 |
| 3 | **健康洞察增强** | 接入每日打卡数据（血压、体重）到洞察引擎；图表联动 | ❌ 未开始 |
| 4 | **检查报告到期提醒** | 基于用户类型和上次检查日期，智能提醒复查时间 | ❌ 未开始 |

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript + Vite | 18.x / 5.x |
| 样式 | Tailwind CSS | 3.x (darkMode: 'class') |
| 状态管理 | Zustand + persist | 4.x |
| 图表 | Recharts | 2.x |
| 后端 | Node.js + Express | 18 LTS / 4.x |
| ORM | Prisma | 5.x |
| 数据库 | PostgreSQL | 14 |
| 缓存 | Redis (开发中内存Map) | 7.x |
| 测试 | Playwright E2E | — |

---

## 前端架构约定

### 1. 目录结构

```
src/frontend/src/
├── components/
│   ├── common/           # Layout.tsx, BottomNav.tsx
│   └── ui/               # 可复用UI组件
├── pages/                # 路由页面组件（每个页面对应一个路由）
│   ├── Dashboard.tsx
│   ├── HealthInsights.tsx   ← 新增：健康洞察页面
│   ├── MedicationForm.tsx   ← 含BottomSelector
│   ├── PrivacyPolicy.tsx
│   ├── Register.tsx         ← 含隐私政策勾选
│   └── ...
├── services/
│   ├── api.ts            # Axios封装 + API方法
│   └── insights/         # 健康洞察引擎（纯本地）
│       ├── engine.ts
│       ├── types.ts
│       ├── referenceRanges.ts
│       ├── trendAnalyzer.ts
│       ├── ruleEngine.ts
│       └── summaryGenerator.ts
├── stores/
│   ├── authStore.ts      # 认证状态
│   └── themeStore.ts     # 深色模式
├── App.tsx               # 路由定义
└── index.css             # CSS变量 + 全局样式
```

### 2. 主题与样式约定

**CSS变量驱动深色模式** (`src/index.css`)：
```css
:root {
  --color-bg: #F5F5F5;
  --color-card: #FFFFFF;
  --color-text-primary: #262626;
  --color-text-secondary: #595959;
  --color-border: #D9D9D9;
}
.dark {
  --color-bg: #141414;
  --color-card: #1F1F1F;
  --color-text-primary: #E6E6E6;
  --color-text-secondary: #B3B3B3;
  --color-border: #434343;
}
```

**关键规则**：
- Tailwind配置 `darkMode: 'class'`，通过 `themeStore` 在 `<html>` 上切换 `.dark` 类
- **绝不使用硬编码颜色**：所有背景/文字使用 `bg-gray-card`、`text-gray-text-primary` 等映射到CSS变量的类
- 底部导航栏：`bg-gray-card` + `dark:shadow-none dark:border-t dark:border-gray-border`
- 卡片阴影：`shadow-card`（浅色）/ 深色模式下通常不需要额外阴影

### 3. API响应格式

后端统一返回 `{ code, message, data }` 信封：
```typescript
// Axios拦截器已解包：response.data = { code, message, data }
// 使用时注意层级：response.data.data 才是真正的数据
const response = await healthRecordApi.getList()
const records = response.data?.list ?? []   // 注意是 .data.list
```

**AuthStore token提取**：`response.data` 是 `{ code, message, data }`，token在 `response.data.data.tokens` 中。

### 4. 路由结构 (`App.tsx`)

```
公开路由（无需登录）:
/login, /register, /forgot-password, /privacy-policy

需登录但无需完成引导:
/onboarding

认证路由（需登录 + 引导完成）:
/             → Dashboard
/records      → 健康记录列表
/records/new  → 新建记录
/records/:id  → 记录详情
/charts       → 趋势图表
/medications  → 用药列表
/medications/new → 新增用药
/alerts       → 预警消息
/profile      → 个人资料
/settings     → 系统设置
/insights     → 健康洞察 ← 新增
```

### 5. BottomSelector 组件规范

`MedicationForm.tsx` 中实现的底部弹出选择器：
- 层级：`z-[60]`（必须高于 BottomNav 的 `z-50`）
- 高度：`max-h-[60vh]` + `pb-20`（避免被底部导航栏截断）
- 动画：`animate-slide-up`
- 暗色模式兼容：使用 `bg-gray-card`、`text-gray-text-primary`

---

## 后端架构约定

### 1. 目录结构

```
src/backend/src/
├── server.ts             # Express入口
├── routes/               # 路由定义
├── controllers/          # 请求处理
├── services/             # 业务逻辑
├── middleware/           # 认证、错误处理
├── utils/
│   └── errors.ts         # AppError: 业务错误带HTTP状态码
├── prisma/               # schema + migrations
└── tests/
    └── integration.test.ts
```

### 2. 错误处理

**必须使用 `AppError`**，不要用裸 `Error`：
```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = '00000'
  ) {}
}

// 使用示例
throw new AppError('手机号已注册', 409, '00001')
throw new AppError('验证码错误', 400, '00002')
```

### 3. SMS验证码

- 开发环境：内存 `Map<string, { code, expiresAt }>` 存储
- 生产环境：必须替换为Redis（**待办**）
- API：阿里云 `Dypnsapi20170525` → `CheckSmsVerifyCode`（服务端验证）

### 4. 数据库关键模型

```prisma
model User {
  id                  String    @id @default(uuid())
  phone               String    @unique
  password            String
  name                String?
  userType            UserType? // KIDNEY_FAILURE | KIDNEY_TRANSPLANT | OTHER
  onboardingCompleted Boolean   @default(false)
  // ...
}

model HealthRecord {
  id            String   @id @default(uuid())
  userId        String
  recordDate    DateTime
  creatinine    Float?
  urea          Float?
  potassium     Float?
  uricAcid      Float?
  hemoglobin    Float?
  weight        Float?
  bloodPressureSystolic    Int?
  bloodPressureDiastolic   Int?
  urineVolume   Int?
  tacrolimus    Float?
  // ...
}

model Medication {
  id              String   @id @default(uuid())
  userId          String
  name            String
  specification   String?
  dosage          Float
  dosageUnit      String
  frequency       String
  reminderTimes   String[]
  status          String   // active | paused
}

model MedicationLog {
  id            String   @id @default(uuid())
  medicationId  String
  userId        String
  scheduledTime DateTime
  status        String   // taken | missed | skipped | pending
  actualTime    DateTime?
}
```

---

## 健康洞察引擎 (`src/services/insights/`)

### 设计原则
1. **纯本地计算**：零外部API调用，所有分析在前端完成
2. **描述性而非诊断性**：只输出事实描述（"肌酐较上周上升12%"），不输出医疗判断
3. **强制免责声明**：每条Insight必须包含 `disclaimer` 字段
4. **异常分级**：
   - `critical`：偏离参考范围30%以上，或血钾≥6.0/<3.0
   - `warning`：超出参考范围但在30%以内
   - 检测到critical时，固定建议"尽快联系主治医生"

### 使用方式
```typescript
import { generateInsightReport } from './services/insights/engine'

const report = generateInsightReport({
  userType: 'kidney_failure',
  records: [...],
  checkIns: [...],
  medicationLogs: [...]
}, 14) // 分析14天窗口
```

### 扩展指南
- 新增指标：在 `types.ts` 的 `MetricKey` 中添加，在 `referenceRanges.ts` 中定义参考范围
- 新增分析维度：在 `ruleEngine.ts` 中添加检测函数，在 `engine.ts` 中编排
- **绝对禁止**：添加任何诊断建议、用药剂量调整、疾病推测功能

---

## E2E测试

### Playwright配置
- 配置文件：`src/frontend/playwright.config.ts`
- 测试目录：`src/frontend/e2e/`
- 双项目：Desktop Chrome + Mobile Chrome (Pixel 5, 393x851)
- baseURL: `http://localhost:3000`

### 测试文件
- `auth.spec.ts` — 登录/注册/隐私政策勾选
- `medication-form.spec.ts` — 用药表单BottomSelector
- `settings.spec.ts` — 设置页→隐私政策导航
- `dashboard.spec.ts` — Dashboard加载

### 运行方式
```bash
cd src/frontend
npx playwright test          # 全部
npx playwright test --headed # 可视化
```

---

## 开发工作流

### 启动开发环境
```bash
# 后端 (端口3001)
cd src/backend
npm run dev

# 前端 (端口3000)
cd src/frontend
npm start
```

### 创建测试用户（用于E2E）
```bash
curl -X POST http://localhost:3001/api/auth/verification-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138099","type":"register"}'

curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138099","password":"Test1234","verificationCode":"123456"}'
```

### Git提交格式
```
feat: 新增功能
type: 修改描述

可选正文
```

---

## 安全清单（提交前必检）

- [ ] 无硬编码密钥（API密钥、数据库密码）
- [ ] 用户输入已验证
- [ ] 错误消息不泄露敏感数据
- [ ] 医疗相关功能已添加免责声明
- [ ] 深色模式样式已检查（无 `bg-white` 硬编码）
- [ ] TypeScript类型检查通过 (`npx tsc --noEmit`)
- [ ] 构建通过 (`npm run build`)

---

## 重要记忆

### 已踩过的坑
1. **Prisma enum迁移**：`UserType` enum缺失时，不能直接改schema，需创建migration修复
2. **Auth token提取**：后端返回 `{ code, message, data }`，Axios拦截器返回 `response.data`，AuthStore需从 `response.data` 中提取token
3. **SMS API**：阿里云 `CheckSmsVerifyCode` 是正确接口，`VerifySmsCode` 需要 `smsToken`
4. **BottomSelector截断**：`z-50` 不够，需 `z-[60]`；`max-h-[70vh]` 需改为 `max-h-[60vh]` + `pb-20`
5. **隐私政策路由**：必须放在认证路由**之外**，否则未登录用户点击会跳转到登录页

### 设计决策记录
- **不做AI大模型调用**：健康洞察使用纯本地规则引擎，规避医疗政策风险
- **480px限制**：MVP阶段优先手机端，响应式适配为明确待办
- **深色模式**：CSS变量方案，不是Tailwind默认dark模式

---

## 推荐的 MCP 配置

在 `~/.claude/settings.json` 中配置：

```json
{
  "mcp": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/sansanaixuexi/Desktop/HealthMonitoringAssistant"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost:5432/healthdb"]
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
```

---

## 文档索引

| 文档 | 路径 | 内容 |
|------|------|------|
| 产品需求 | `docs/prd.md` | 功能需求、用户故事 |
| API规范 | `docs/api-spec.md` | REST API详细定义 |
| 数据库设计 | `docs/database-schema.md` | Prisma schema说明 |
| 设计规范 | `docs/design-system.md` | 颜色、字体、组件规范 |
| 医学规范 | `docs/medical-spec.md` | 参考值范围、药物清单 |
| 安全清单 | `docs/security.md` | 安全要求与检查项 |
| 第三方服务 | `docs/third-party-services.md` | 阿里云SMS、百度OCR配置 |
| 架构设计 | `docs/architecture.md` | 系统架构图、选型理由 |
| GitHub协作 | `docs/github-workflow.md` | PR流程、分支策略 |

---

**免责声明**: 本应用提供的健康监测功能仅供参考，不能替代专业医疗诊断和治疗建议。如有身体不适，请及时就医。
