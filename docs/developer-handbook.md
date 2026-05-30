# 开发者手册 (Developer Handbook)

> 本文档面向后续继续开发的 Agent/开发者。阅读本文件后，你应该能够立即理解项目架构、开发约定和当前状态。

---

## 1. 项目速览

**HealthMonitoringAssistant** 是一个面向肾衰竭（CKD）及肾移植术后患者的个人健康数据管理 Web 应用。

- **当前阶段**: MVP v1.0.0 已完成，功能增强阶段，内测前
- **目标用户**: 肾衰竭患者、肾移植术后患者、其他肾病患者
- **核心定位**: 健康数据记录与管理工具，**不提供医疗诊断**
- **最近开发方向**: HTTPS 与域名生产化、检查报告到期提醒、付费商业化方案（规划中）

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

### 5.4 肾移植术后风险提示原则

当前项目已开始支持肾移植用户的“个人基线 + 趋势变化 + 红旗规则”提示，但仍是第一版。

已落地：
- Dashboard API 返回 `hasTransplant`、`transplantDate`、`baselineCreatinine`。
- Dashboard 对肾移植用户默认核心指标为：肌酐、他克莫司、收缩压。
- 肌酐较个人基线上升 `>10%` 显示黄色提醒，`>25%` 显示红色提醒。
- 最近 3 次肌酐连续上升显示趋势提醒。
- 他克莫司不再使用写死的 `5-15 ng/mL` 通用范围，页面和 PDF 均提示以移植医生设定目标范围为准。

未落地：
- `eGFR`、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV 病毒载量。
- 他克莫司医生目标范围配置。
- 稳定期连续 3 次检查结果中位数自动生成个人基线。
- 按术后阶段（1 月内、1-3 月、3-12 月、1 年后）生成复查频率提醒。

医疗红线：
- 只能做风险提示、复查提醒和联系医生提醒。
- 禁止输出排异、感染、药物毒性等诊断结论。
- 禁止给出免疫抑制剂调药建议。

---

## 6. 开放待办 (按优先级)

### P0 - 最高优先级

#### 1. Dashboard 血压打卡卡片文字溢出 — 已修复
**问题**：今日打卡的血压卡片中，数值（如 "120/70"）在小屏手机（iPhone SE 375px 等）上会超出卡片边界。

**修复方案**：将血压卡片改为独占整行（`col-span-2`），上方保留体重和尿量各占一列。字号使用 `text-2xl md:text-3xl`，配合整行宽度不再溢出。

**涉及文件**：`src/frontend/src/pages/Dashboard.tsx`

#### 2. Dashboard 血压打卡卡片颜色不一致（新待办）
**问题**：血压卡片当前使用固定蓝色底框（`bg-primary` + 白色文字），而体重和尿量卡片使用 `getCheckInClasses()` 根据状态动态变色（正常=绿色 `bg-green-50 text-success`，警告=黄色，异常=红色）。视觉上不协调。

**状态**：代码已修改为使用 `getCheckInClasses(today.checkIn.bloodPressure.status)`，但尚未构建部署到服务器。

**涉及文件**：`src/frontend/src/pages/Dashboard.tsx`

**下次开发时**：构建并部署前端镜像 `docker rmi ... && docker-compose build --no-cache frontend`，验证血压卡片颜色是否与体重/尿量保持一致。
**问题**：今日打卡的血压卡片中，数值（如 "120/70"）在小屏手机（iPhone SE 375px 等）上会超出卡片边界。

**修复方案**：将血压卡片改为独占整行（`col-span-2`），蓝色底框 (`bg-primary`) + 白色文字，上方保留体重和尿量各占一列。字号使用 `text-2xl md:text-3xl`，配合整行宽度不再溢出。

**涉及文件**：`src/frontend/src/pages/Dashboard.tsx` — 今日打卡区域

**部署注意事项**：前端 Docker 构建有缓存，修改后必须 `docker rmi healthmonitoringassistant_frontend:latest && docker-compose build --no-cache frontend`

### P0 - 部署与基础设施
- ~~部署到阿里云 ECS~~ ✅ 已完成（2026-04-19）
- ~~修复部署后 SMS / API 404~~ ✅ 已完成（2026-04-19：根因是 nginx `proxy_pass` 保留 `/api/` 前缀，后端路由无此前缀）
- 生产环境 Redis 替换内存 Map 存储验证码
- 配置 HTTPS + 域名

### P1 - 功能增强
- ~~Dashboard 指标趋势个性化展示~~ — ✅ 已完成第一版（2026-05-18）：按 `userType` + `primaryDisease` 分为“核心 / 推荐 / 全部”，移除旧“更多/收起”。
- ~~肾移植术后风险规则抽离~~ — ✅ 已完成（2026-05-30）：前后端独立规则模块已接入 Dashboard、HealthInsights、预警和 PDF 医生摘要；后续增强仍需遵守医学安全边界。
- **商业化付费功能** — 内测通过后实施。完整方案见 `docs/billing-plan.md`。包含：Freemium订阅制（免费基础版 + 高级会员 ¥18/月 或 ¥158/年）、支付宝/微信支付集成、用量配额控制、订阅状态守卫。
- ~~健康洞察接入每日打卡数据~~ — ✅ 已完成（2026-05-30）：血压、体重、尿量、血糖、他克莫司趋势和日常完整度摘要已接入。
- ~~预警动作化~~ — ✅ 已完成（2026-05-30）：Dashboard / Alerts 支持查看记录、查看用药、生成报告、标为已读。
- 检查报告到期提醒（基于用户类型 + 上次检查日期）
- PWA 离线支持（Service Worker）
- 用药冲突检测（基于已录入药物）
- 数据导出（PDF/Excel）

---

## 6. 当前功能状态（下次开发需知）

### 6.1 Dashboard 指标个性化展示（第一版已完成）

**涉及的文件**：
- `src/backend/src/services/dashboard.service.ts` — 已在 `user` 对象中返回 `userType`、`primaryDisease`、`hasTransplant`、`transplantDate`、`baselineCreatinine`
- `src/frontend/src/stores/dashboardStore.ts` — 已扩展类型，新增 `UserType` / `PrimaryDisease` 导出，并加入移植相关字段
- `src/frontend/src/pages/Dashboard.tsx`
- `src/frontend/src/pages/Charts.tsx`

**已完成的修改**：
  - `ALL_METRICS` 常量（13 个指标：肌酐、尿素氮、血钾、尿酸、他克莫司、血红蛋白、血糖、体重、收缩压、舒张压、血钠、血磷、尿量）
  - `getRecommendedMetrics()` 函数（按 userType + primaryDisease 推荐）
  - `getCoreMetrics()` 函数（每类用户默认核心 3 项）
  - `METRIC_SCOPE_OPTIONS` + `MetricScope`，用“核心 / 推荐 / 全部”替代旧“更多/收起”
  - 趋势数据查询已改为查询全部指标
  - Charts 页同步同一套分层选择

**肾移植特殊逻辑**：
- 核心指标：肌酐、eGFR、他克莫司。
- 移植用户趋势提醒不再强调通用正常范围，而是提示个人基线、连续变化和医生目标范围。
- 移植风险提示已抽离到 `src/frontend/src/services/transplantRisk/rules.ts` 与 `src/backend/src/services/transplant-risk.service.ts`。
- Dashboard、HealthInsights、预警服务和 PDF 医生摘要复用同一套风险输出：`level`、`title`、`message`、`suggestedAction`、`missingFields`、`disclaimer`。
- 他克莫司目标范围不写死，必须由医生配置；低于/高于目标范围时只提示复核采血时间、目标范围和按医嘱处理。

**验证**：
- `cd src/frontend && npm run build` 通过。
- `cd src/backend && npm run build` 通过。

**下次开发方向**：
- 进入 P1-06 预警动作化：Dashboard 和 Alerts 页根据 `recordId`、`metric`、`medicationId`、`medicationLogId` 展示查看记录、查看用药、生成报告、标为已读等动作。
- 若继续增强移植规则，仍只允许输出复查/联系移植医生/按医嘱处理，不输出排异、感染、药物毒性等诊断结论。

### 6.2 Dashboard 血压打卡卡片文字溢出 — 已修复

**涉及的文件**：`src/frontend/src/pages/Dashboard.tsx`

**问题描述**：今日打卡中血压数值（如 "120/70"）在小屏手机上超出卡片边界。已尝试改为 `text-xl`（20px）但仍溢出。

**修复方案**：将血压卡片改为独占整行（`col-span-2`），上方保留体重和尿量各占一列。字号 `text-2xl md:text-3xl`，整行宽度下不再溢出。

---

### 6.3 Dashboard 血压打卡卡片颜色不一致（新待办）

**涉及的文件**：`src/frontend/src/pages/Dashboard.tsx`

**问题描述**：血压卡片当前使用固定蓝色底框（`bg-primary` + 白色文字），而体重和尿量卡片使用 `getCheckInClasses()` 根据状态动态变色（正常=绿色 `bg-green-50 text-success`，警告=黄色，异常=红色）。视觉上不协调。

**已提交的代码修改**：已将血压卡片改为使用 `getCheckInClasses(today.checkIn.bloodPressure.status)`，但尚未构建部署到服务器。

**待办**：下次开发时构建并部署前端镜像，验证血压卡片颜色是否与体重/尿量保持一致。

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
| 血压卡片文字溢出 | `text-metric` (28px) 在小屏 (~110px 宽度) 放不下 "120/70" | 改为独占整行 `col-span-2` + `text-2xl md:text-3xl`，不再溢出 |
| nginx 容器访问不到前端文件 | `location /` 用 `root /usr/share/nginx/html` 指向 nginx 自身文件系统，frontend 容器的 dist 文件无法共享 | `location /` 改为 `proxy_pass http://frontend/;`，由 nginx 反向代理到 frontend 容器 |
| 后端 API 404（部署后） | nginx `proxy_pass http://backend:3001/api/` 保留了 `/api/` 前缀，但后端 `server.ts` 路由挂载在 `/auth`、`/users` 等（无 `/api` 前缀） | nginx `proxy_pass` 改为 `http://backend:3001/;`（去掉 `/api/` 后缀），转发时自动剥离前缀 |
| 运行中容器修改挂载文件失败 | `docker cp` 或 `docker exec sed` 修改容器内 volume 挂载的文件报错 "Resource busy" | 必须先 `docker-compose stop` 容器，修改后再 `docker-compose start` |
| git HTTP/2 网络错误 | 阿里云 ↔ GitHub 之间 `git fetch/push` 报错 "Error in the HTTP2 framing layer" | 服务器上设置 `git config --global http.version HTTP/1.1` |
| git reset 回退生产环境修改 | 服务器上 `git reset --hard origin/main` 后，之前手动修改的 nginx 配置被旧版本覆盖 | 本地确保 push 成功后再让服务器 pull；生产环境配置变更优先用 `sed` + `docker cp` 而非依赖 git 同步 |

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
| `src/stores/dashboardStore.ts` | Dashboard 数据（含 userType / primaryDisease / hasTransplant / transplantDate / baselineCreatinine） |
| `src/stores/themeStore.ts` | 主题/深色模式 |
| `src/components/common/Layout.tsx` | 页面布局 |
| `src/components/common/BottomNav.tsx` | 底部导航 |
| `src/pages/Dashboard.tsx` | 首页仪表盘（指标分层、肾移植肌酐基线提示） |
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
| `docs/next-agent-todos.md` | **下个 Agent 串行待办**：近期优化任务包、范围、验收标准、避坑提示 |
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
