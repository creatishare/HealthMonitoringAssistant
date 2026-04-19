# 开发者手册 (Developer Handbook)

> 本文档面向后续继续开发的 Agent/开发者。阅读本文件后，你应该能够立即理解项目架构、开发约定和当前状态。

---

## 1. 项目速览

**HealthMonitoringAssistant** 是一个面向肾衰竭（CKD）及肾移植术后患者的个人健康数据管理 Web 应用。

- **当前阶段**: MVP v1.0.0 已完成，功能增强阶段，内测前
- **目标用户**: 肾衰竭患者、肾移植术后患者、其他肾病患者
- **核心定位**: 健康数据记录与管理工具，**不提供医疗诊断**
- **最近开发方向**: Dashboard 指标个性化展示（进行中）、付费商业化方案（规划中）

---

## 2. 技术栈速查

### 前端 (`src/frontend/`)
- React 18 + TypeScript + Vite
- Tailwind CSS (darkMode: 'class')
- Zustand (状态管理) + persist (持久化)
- Recharts (图表)
- React Router v6
- Axios (API 请求)
- React Hot Toast (通知)
- Playwright (E2E 测试)

### 后端 (`src/backend/`)
- Node.js 18 + Express 4
- Prisma 5 + PostgreSQL 14
- JWT (认证) + bcrypt (密码)
- 阿里云 SMS (验证码)
- 百度 AI OCR (化验单识别)

---

## 3. 启动开发环境

```bash
# 1. 数据库（确保 PostgreSQL 运行，数据库已创建）
cd src/backend
npx prisma migrate dev
npx prisma generate

# 2. 后端 (端口 3001)
npm run dev

# 3. 前端 (新终端，端口 3000)
cd src/frontend
npm start
```

### 创建 E2E 测试用户
```bash
curl -X POST http://localhost:3001/api/auth/verification-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138099","type":"register"}'

curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138099","password":"Test1234","verificationCode":"123456"}'
```

---

## 4. 关键开发约定

### 4.1 API 响应格式

后端统一返回 `{ code, message, data }` 信封。Axios 拦截器已配置为直接返回 `response.data`。

```typescript
// 正确用法：response 本身就是 { code, message, data }
const response = await healthRecordApi.getList()
const records = response.data?.list ?? []   // 注意是 .data.list，不是直接 .list
```

### 4.2 错误处理

**后端**：必须使用 `AppError`，不要用裸 `Error`：
```typescript
import { AppError } from '../utils/errors'
throw new AppError('手机号已注册', 409, '00001')  // message, statusCode, errorCode
```

**前端**：Axios 拦截器在 401 时会触发 `unauthorized` 事件，AuthStore 监听此事件自动登出。

### 4.3 深色模式

- 通过 `themeStore` 在 `<html>` 元素上切换 `.dark` 类
- Tailwind 配置：`darkMode: 'class'`
- **绝不使用硬编码颜色**如 `bg-white`、`text-black`
- 必须使用映射到 CSS 变量的 Tailwind 类：
  - 背景: `bg-gray-bg` (页面), `bg-gray-card` (卡片/底栏)
  - 文字: `text-gray-text-primary`, `text-gray-text-secondary`, `text-gray-text-helper`
  - 边框: `border-gray-border`
- CSS 变量定义在 `src/index.css` 的 `:root` 和 `.dark` 中

### 4.4 新增页面步骤

1. 在 `src/pages/` 创建页面组件
2. 在 `App.tsx` 中导入并添加路由
3. 如需底部导航入口：修改 `BottomNav.tsx`
4. 如需 Dashboard 入口：在 `Dashboard.tsx` 中添加按钮/卡片

### 4.5 组件样式规范

- 使用 Tailwind utility classes，不单独写 CSS 文件
- 卡片: `className="card"` 或 `className="bg-gray-card rounded-card p-4 shadow-card"`
- 按钮: `className="btn-primary"` / `className="btn-secondary"`
- 输入框: `className="input-field w-full"`
- 安全区适配: `safe-bottom` (底部), `safe-top` (顶部)

---

## 5. 健康洞察引擎 (`src/services/insights/`)

### 5.1 设计原则
1. **纯本地计算**：零外部 API 调用
2. **描述性而非诊断性**：只陈述事实，不给医疗建议
3. **强制免责声明**：每条 Insight 必须包含 `disclaimer`
4. **异常分级**：critical / warning / info

### 5.2 模块职责
| 文件 | 职责 |
|------|------|
| `types.ts` | 类型定义 |
| `referenceRanges.ts` | 通用医学参考范围 |
| `trendAnalyzer.ts` | 趋势计算（均值、变化率、方向） |
| `ruleEngine.ts` | 异常检测 + 用药依从性 |
| `summaryGenerator.ts` | 模板化摘要生成 |
| `engine.ts` | 主入口，编排整个流程 |

### 5.3 扩展指南
- **新增指标**：在 `types.ts` 的 `MetricKey` 中添加 → 在 `referenceRanges.ts` 定义范围
- **新增分析维度**：在 `ruleEngine.ts` 添加检测函数 → 在 `engine.ts` 中编排 → 在 `HealthInsights.tsx` 中添加展示区块
- **红线**：禁止添加任何诊断建议、用药剂量调整、疾病推测

---

## 6. 开放待办 (按优先级)

### P0 - 最高优先级

#### 1. Dashboard 血压打卡卡片文字溢出（已知问题，待修复）
**问题**：今日打卡的血压卡片中，数值（如 "120/70"）在小屏手机（iPhone SE 375px 等）上会超出卡片边界。已尝试缩小字体（`text-metric` 28px → `text-xl` 20px），但在用户实际设备上仍溢出。

**涉及文件**：`src/frontend/src/pages/Dashboard.tsx` — 今日打卡区域

**可能原因**：
- `text-xl` (20px) 对 5 字符+斜杠的组合在小屏（~110px 可用宽度）仍太大
- Tailwind 自定义 `text-metric` 配置可能覆盖了 `text-xl`
- 浏览器/容器缓存导致修改未实际生效

**建议修复方向**（下次开发时选择其一）：
- 方案 A：血压数值改为 `text-sm` 或 `text-base`（14-16px），小屏够用
- 方案 B：血压不显示具体数值，改为图标 + 文字状态（如 "正常" / "偏高"），点击进入记录页查看详情
- 方案 C：把血压拆成两行显示（收缩压 120 / 舒张压 70），每行更小字号
- 方案 D：今日打卡从 3 列改为 2 列（血压单独占一行），给每列更多空间

**部署注意事项**：前端 Docker 构建有缓存，修改后必须 `docker rmi healthmonitoringassistant_frontend:latest && docker-compose build --no-cache frontend`

### P0 - 部署与基础设施
- ~~部署到阿里云 ECS / 腾讯云~~ ✅ 已完成（2026-04-19）
- 生产环境 Redis 替换内存 Map 存储验证码
- 配置 HTTPS + 域名
- 修复部署后 SMS 发送验证码 404 问题

### P1 - 功能增强
- **Dashboard 指标趋势个性化展示** — 根据 `userType`（肾衰竭/肾移植/其他）+ `primaryDisease`（糖尿病肾病/高血压肾病/慢性肾炎/其他）动态展示推荐关注指标。默认仅展示该类型核心指标，通过"更多"按钮展开全部 13 项。代码已部分实现（后端接口已加字段、前端逻辑已写），但交互体验未达预期，需重新设计后再合并。
- **商业化付费功能** — 内测通过后实施。完整方案见 `docs/billing-plan.md`。包含：Freemium订阅制（免费基础版 + 高级会员 ¥18/月 或 ¥158/年）、支付宝/微信支付集成、用量配额控制、订阅状态守卫。
- 健康洞察接入每日打卡数据（血压、体重）
- 检查报告到期提醒（基于用户类型 + 上次检查日期）
- PWA 离线支持（Service Worker）
- 用药冲突检测（基于已录入药物）
- 数据导出（PDF/Excel）

---

## 6. 当前未完成的代码改动（下次开发需知）

### 6.1 Dashboard 指标个性化展示（进行中，未达预期）

**涉及的文件**：
- `src/backend/src/services/dashboard.service.ts` — 已在 `user` 对象中返回 `userType` 和 `primaryDisease`
- `src/frontend/src/stores/dashboardStore.ts` — 已扩展类型，新增 `UserType` / `PrimaryDisease` 导出
- `src/frontend/src/pages/Dashboard.tsx` — 已添加：
  - `ALL_METRICS` 常量（13 个指标：肌酐、尿素氮、血钾、尿酸、他克莫司、血红蛋白、血糖、体重、收缩压、舒张压、血钠、血磷、尿量）
  - `getRecommendedMetrics()` 函数（按 userType + primaryDisease 推荐）
  - `showMoreMetrics` 状态 + "更多/收起"按钮
  - 趋势数据查询已改为查询全部指标

**问题记录**：
- 用户反馈"更多"按钮交互未达预期（推荐指标太多，手机端仍然占满屏幕）
- **下次开发方向**：需重新设计交互方案（如 Tab 分组：核心指标/全部指标、或按优先级仅展示 3 个核心 + 展开、或卡片式折叠）

### 6.2 Dashboard 血压打卡卡片文字溢出（已知问题，待修复）

**涉及的文件**：`src/frontend/src/pages/Dashboard.tsx`

**问题描述**：今日打卡中血压数值（如 "120/70"）在小屏手机上超出卡片边界。已尝试改为 `text-xl`（20px）但仍溢出。

**根本原因待确认**：
- Tailwind 自定义 `text-metric`（28px）配置优先级可能高于 `text-xl`
- 或浏览器/容器缓存导致 CSS 未更新（已确认 Docker 内文件是最新的，但渲染仍用旧样式）

**建议修复方向**：
- 方案 A：改为 `text-sm`（14px）或直接用 `text-[14px]` 内联样式
- 方案 B：血压不显示数值，改为状态文字（"正常"/"偏高"）+ 图标
- 方案 C：血压拆成两行（收缩压 120 / 舒张压 70）
- 方案 D：今日打卡改为 2 列布局，血压单独占一行

**验证方式**：修改后本地 `npm run build` 生成 dist，检查 `dist/assets/*.css` 中对应类名的实际字体大小。

### 6.3 新增文档
- `docs/billing-plan.md` — 付费商业化完整方案，内测通过后实施
- `docs/dev-log.md` — 开发日志
- `docs/server-operations.md` — 服务器运维手册

---

## 7. 已踩过的坑

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Prisma enum 迁移失败 | migration 先加了 TEXT 列，后 schema 改成 enum | 创建新 migration 创建 enum 并转换列 |
| Auth token 提取失败 | 误以为 `response.data` 是 data 字段 | 实际 `response.data` 是 `{code,message,data}`，需 `response.data.data.tokens` |
| SMS API 调用错误 | 误用 `VerifySmsCode` | 正确接口是 `CheckSmsVerifyCode` |
| BottomSelector 被截断 | z-index 不够，高度计算问题 | `z-50` → `z-[60]`, `max-h-[70vh]` → `max-h-[60vh]`, `pb-8` → `pb-20` |
| 隐私政策路由需公开 | 放在认证路由内导致未登录跳转 | 将 `/privacy-policy` 路由移到认证路由组之外 |
| 深色模式底栏白色 | 硬编码 `bg-white` | 改为 `bg-gray-card` + `dark:shadow-none dark:border-t` |
| 前端端口冲突 | 前端和后端都试图使用 3001 | 前端使用 3000，后端使用 3001 |
| Dashboard 新字段不生效 | 修改了后端代码但服务未重启 | `cd src/backend && npm run dev` |
| 指标个性化默认展示全部 | 后端未返回 userType 时回退逻辑展示全部 13 项 | 已改为默认仅展示 3 个核心指标（肌酐/尿素氮/血钾）|
| Docker 前端缓存不更新 | `docker-compose up -d --build` 使用缓存镜像 | 先 `docker rmi healthmonitoringassistant_frontend:latest` 再 `--no-cache` 重建 |
| 血压卡片文字溢出 | `text-metric` (28px) 在小屏 (~110px 宽度) 放不下 "120/70" | 尝试 `text-xl` (20px) 仍溢出，待进一步缩小或改布局 |

---

## 9. 文件索引

### 前端关键文件
| 文件 | 说明 |
|------|------|
| `src/App.tsx` | 路由定义 |
| `src/index.css` | CSS 变量、全局样式 |
| `src/services/api.ts` | Axios 封装、API 方法 |
| `src/services/insights/engine.ts` | 健康洞察主入口 |
| `src/stores/authStore.ts` | 认证状态 |
| `src/stores/dashboardStore.ts` | Dashboard 数据（含 userType / primaryDisease） |
| `src/stores/themeStore.ts` | 主题/深色模式 |
| `src/components/common/Layout.tsx` | 页面布局 |
| `src/components/common/BottomNav.tsx` | 底部导航 |
| `src/pages/Dashboard.tsx` | 首页仪表盘（**指标个性化展示逻辑已部分实现，待继续**） |
| `src/pages/MedicationForm.tsx` | 用药表单（含 BottomSelector） |
| `src/pages/HealthInsights.tsx` | 健康洞察页面 |
| `src/pages/PrivacyPolicy.tsx` | 隐私政策页面 |
| `src/pages/Register.tsx` | 注册（含隐私政策勾选） |
| `tailwind.config.js` | Tailwind 配置（含自定义颜色、字体） |
| `playwright.config.ts` | E2E 测试配置 |

### 后端关键文件
| 文件 | 说明 |
|------|------|
| `src/server.ts` | Express 入口 |
| `src/utils/errors.ts` | AppError 定义 |
| `src/services/auth.service.ts` | 认证逻辑 |
| `src/services/dashboard.service.ts` | Dashboard 数据（**已加 userType / primaryDisease 字段，待重启生效**） |
| `src/services/health-record.service.ts` | 健康记录 CRUD |
| `src/services/medication.service.ts` | 用药管理 |
| `src/prisma/schema.prisma` | 数据库模型 |
| `src/middleware/auth.ts` | JWT 认证中间件 |
| `src/tests/integration.test.ts` | 集成测试 |

### 文档
| 文件 | 说明 |
|------|------|
| `CLAUDE.md` | **Agent 开发配置总览（必读）** |
| `docs/developer-handbook.md` | **开发者手册（必读）**：架构约定、启动指南、待办 |
| `docs/billing-plan.md` | **付费商业化方案**：Freemium模式、支付集成、合规要求 |
| `docs/architecture.md` | 系统架构设计 |
| `docs/api-spec.md` | API 详细规范 |
| `docs/database-schema.md` | 数据库设计 |
| `docs/design-system.md` | UI 设计规范 |
| `docs/medical-spec.md` | 医学参考值与药物清单 |
| `docs/security.md` | 安全要求 |
| `docs/third-party-services.md` | 第三方服务配置 |

---

## 9. 提交前检查清单

- [ ] `cd src/frontend && npx tsc --noEmit` — TypeScript 类型检查
- [ ] `cd src/frontend && npm run build` — 生产构建
- [ ] 无硬编码颜色（检查 `bg-white`, `text-black`, `shadow-white` 等）
- [ ] 深色模式样式已验证
- [ ] 无 `console.log`（生产代码）
- [ ] 医疗相关功能已添加免责声明
- [ ] 无硬编码密钥或敏感信息
- [ ] 新增路由已在 `App.tsx` 中注册
