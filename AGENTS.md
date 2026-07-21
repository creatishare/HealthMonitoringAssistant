# Codex SubAgent 配置

## 项目概述

肾衰竭健康监测Web应用 - MVP版本已完成，当前处于功能增强阶段。

## 当前项目状态 (2026-05-30)

### 已完成的核心功能
1. **用户认证** — 手机号注册/登录、JWT Token、刷新令牌、忘记密码
2. **用户引导** — 首次登录后选择用户类型（肾衰竭/肾移植/其他）+ 原发疾病类型
3. **健康记录** — 体重、血压、尿量打卡；化验单指标记录（肌酐、尿素氮、血钾、尿酸、血红蛋白、血糖、血钠、血磷、他克莫司浓度）
4. **OCR识别** — 百度AI医疗票据识别，自动提取化验数据
5. **用药管理** — 19种常用药物底部选择器（含规格联动）、用药提醒、服药记录
6. **Dashboard** — 今日打卡、用药提醒、异常预警、趋势图表（Recharts）
7. **本地健康洞察** — 纯前端规则引擎：趋势分析、异常标记、用药依从性统计、模板摘要
8. **隐私政策** — 10章节完整隐私政策页面，注册流程强制勾选同意
9. **深色模式** — 系统级主题切换，CSS变量驱动
10. **SMS验证码** — 阿里云Dypnsapi20170525集成
11. **付费方案规划** — 完整商业化方案文档（Freemium + 支付宝/微信支付），待内测通过后实施

### 最近完成的改动
- **2026-04-17**: SMS验证修复、数据库enum修复、`AppError`业务错误处理、authStore token提取修复
- **2026-04-18**: 常用药物BottomSelector（19种药物+规格联动）、隐私政策页面、注册时隐私政策勾选、Playwright E2E测试框架、深色模式底栏修复、本地健康洞察引擎、付费方案规划文档
- **2026-04-22**: Dashboard 洞察按钮文字换行修复（`whitespace-nowrap`）、消息通知红点位置修复（`right-0.5 top-0.5`）、首页副标题移除产品规划文案改为仅显示日期、Settings 深色模式/消息通知开关修复（`w-13` → `w-12`，`translate-x-6` → `translate-x-5`）
- **2026-04-25**: 修复用药提醒跨天状态不更新（后端返回 `scheduledAt`，前端直接回传；记录服药改幂等 update/create；Dashboard 跨午夜刷新）、修复消息中心不补发过期用药提醒（`getAlerts`/`getUnreadAlertCount` 查询前同步 missed 服药日志和预警）、修复线上旧后端没有 `scheduledAt` 时点击“服用”提示成功但状态不变（前端兜底改用 UTC 同一提醒时刻）、新增报告导出接口 `/reports/follow-up`、修复 PDF 中文乱码（pdfkit 注册中文字体 + Docker CJK 字体）、重构“我的/用药/健康记录”页面为截图风格，新增提醒设置、隐私与安全、帮助中心独立页面。
- **2026-05-18**: Dashboard 指标趋势交互重构为“核心 / 推荐 / 全部”，移除旧“更多/收起”；肾移植用户新增基于 `baselineCreatinine` 的肌酐风险提示（>10% 黄色复查，>25% 红色联系移植医生，连续 3 次上升提示复诊核对）；后端预警规则同步拆成 10%/25% 两档；Dashboard API 返回 `hasTransplant` / `transplantDate` / `baselineCreatinine`；Charts 和 PDF 报告移除他克莫司固定 5-15 参考范围，改为医生目标范围提示；Profile 独立“近30天健康报告”模块，移植用户突出个人基线、趋势偏移、血药浓度、复诊提醒。
- **2026-05-30**: 完成健康记录输入校验与趋势指标白名单（含后端回归测试）；健康洞察接入 records 中的血压、尿量、体重、血糖、他克莫司趋势，补充日常数据完整度摘要；统一 `/records`、`/records/new`、编辑页健康记录表单，移除记录表单/详情中的他克莫司固定 `5-15`；移植用户 onboarding/Profile/Dashboard 增加个人基线引导，ProfileEdit 改用统一 `userApi`；新增健康记录正式 `heartRate`、eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV 病毒载量字段，以及用户档案他克莫司医生目标范围；移植风险规则抽离到前后端独立模块并接入 Dashboard、HealthInsights、预警和 PDF 医生摘要；预警动作化已完成，Dashboard/Alerts 支持查看记录、查看用药、生成报告、标为已读；Vitest 单测入口排除 Playwright E2E。
- **2026-06-05**: 完成 P0-02 HTTPS 与域名生产化仓库配置：根目录 `docker-compose.yml` 暴露 80/443 并挂载 `nginx/ssl`、`nginx/www`；`nginx/default.conf` 启用 HTTP ACME challenge、301 HTTPS 跳转、443 TLS、HSTS 和 mixed-content 防护；保留 `/api/` → `backend:3001/` 去前缀代理；新增 `infrastructure/scripts/test-https-config.sh` 回归检查；更新部署、运维、快速部署和 dev-log 文档，记录实际生产路径、验证命令和回滚步骤。
- **2026-07-20**: 前端设计评审整改：修复 8 文件 75 处失效类名 `text-gray-secondary/helper`（正确类名是嵌套结构 `text-gray-text-secondary/helper`，`text-gray-hint` 也不存在）；`--color-text-helper` 调深至 `#5b6478`（5.9:1）、warning `#A06200`、success `#1F7A4D`，均达 WCAG AA；医疗提示/免责声明字号下限 14px；新增 `utils/chartTheme.ts` 统一 Recharts 深浅色 tick/tooltip（13px），Dashboard 趋势图最多 2 指标 + 单位不同自动双 Y 轴 + Legend；新建 `components/ui/`（BackButton 44px 统一返回样式、SegmentedControl、Spinner、ConfirmDialog）并替换全站复制粘贴块，`window.confirm`/`alert` 已替换为 ConfirmDialog；RecordDetail 编辑/删除按钮提升至 44px；修复 Records 列表假时间、Medications 按钮阴影色残留、版本号不一致（统一 v1.0.0）、Alerts 卡片圆角跳变；删除 tailwind.config 未使用的 spacing token；`docs/design-system.md` 回写至 v2.0.0（与实现对齐）。

### 当前已知问题（下次开发优先处理）

- **旧心率 notes 兼容**：`HealthRecord.heartRate` 已是正式字段；旧记录中 `notes` 的 `心率：72次/分` 仍会在前端兜底提取展示。不要迁移或删除旧 notes，除非有单独数据迁移任务。
- **PDF 中文排查**：若重新导出的 PDF 仍乱码，先确认后端是否已重启并加载 `src/backend/src/services/report.service.ts` 最新代码；正常 PDF 应嵌入 `ArialUnicodeMS` / `NotoSansCJK`，不应只有 `/Helvetica`。
- **PDF 字体部署**：如果 PDF 只有约 2KB 且 `strings report.pdf | rg "BaseFont|ToUnicode"` 显示 `/Helvetica` / `/WinAnsiEncoding`，说明容器未加载中文字体。必须 `docker compose build --no-cache backend` 重建镜像，不能只 restart；`docker-compose.yml` 已设置默认 `PDF_FONT_PATH=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`。`report.service.ts` 会递归扫描 `/usr/share/fonts` 并优先使用 Noto/Source Han/WenQuanYi，生产环境不要依赖 Arial Unicode、STHeiti、微软雅黑、苹方等专有字体。
- **用药漏服预警**：不要只依赖 `reminderWorker`。`src/backend/src/services/alert.service.ts` 的 `syncMissedMedicationAlerts()` 会在消息列表/未读数查询前按 Asia/Shanghai 日期补建今天已超时 30 分钟的 missed 日志和 medication alert。
- **用药“服用”时间兼容**：新后端应返回 `scheduledAt`，前端直接回传。若线上旧后端没有 `scheduledAt`，`Dashboard.tsx` / `Medications.tsx` 会兜底用 Asia/Shanghai 日期 + UTC 同一提醒时刻（如 `08:00` → `T08:00:00.000Z`），避免写入成功但今日列表查不到。
- **肾移植风险规则边界**：统一风险规则已抽离并接入 Dashboard、HealthInsights、预警和 PDF；`eGFR`、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV 当前只作为复诊资料完整度/摘要字段，不做排异、感染、药物毒性等诊断判断。
- **本机 Prisma migrate CLI 空错误**：2026-05-30 `npx prisma migrate dev --name add-transplant-monitoring-fields` 和 `npx prisma migrate status` 在本地 `health_monitoring` 库上返回空的 `Schema engine error:`；schema validate/generate 通过。已用同一 migration SQL 通过 `psql` 事务应用并写入 `_prisma_migrations`。若后续仍空报错，优先排查本地 Prisma schema engine/数据库状态。
- **医学安全边界**：移植相关功能只能提示“复查 / 联系移植医生 / 按医嘱处理”，禁止输出排异、感染、药物毒性等诊断结论，禁止自动建议调药。

### 当前进行中的工作（未完成）

#### 下一项建议：P1-09 清理他克莫司固定参考范围残留
**需求**：继续确认移植相关页面和血药浓度服务不再把他克莫司 `5-15 ng/mL` 显示或判断为通用正常范围，统一改为“医生目标范围/按医嘱处理”的描述。

**建议范围**：
- `src/frontend/src/pages/RecordForm.tsx`
- `src/frontend/src/pages/RecordDetail.tsx`
- `src/backend/src/services/drug-concentration.service.ts`
- 相关单测/构建

**验收标准**：
- 移植相关页面不再把他克莫司 `5-15` 显示为通用正常范围。
- 后端血药浓度服务不再基于固定 `5-15` 输出异常结论。
- 保持医学安全边界：只提示复核目标范围、联系移植医生、按医嘱处理，不建议调药。

### 开放待办 (按优先级)

| # | 优先级 | 任务 | 说明 | 状态 |
|---|--------|------|------|------|
| 1 | P0 | ~~SPA 路由刷新 404~~ | ✅ 已修复（2026-04-21）：前端容器添加自定义nginx配置 `try_files $uri $uri/ /index.html`。 | ✅ 已完成 |
| 2 | P0 | **生产环境Redis** | 验证码仍存内存Map，重启丢失。需切换到Redis。 | ❌ 未开始 |
| 3 | P0 | ~~血压打卡卡片文字溢出~~ | ✅ 已修复（2026-04-19）：改为动态状态色 + `whitespace-nowrap` + 统一卡片规格。 | ✅ 已完成 |
| 4 | P0 | ~~SMS 404修复~~ | ✅ 已修复（2026-04-19）：nginx 代理路径去掉 `/api/` 前缀，后端路由无此前缀。 | ✅ 已完成 |
| 5 | P1 | ~~Dashboard指标个性化~~ | ✅ 已完成（2026-05-18）：核心/推荐/全部分层，移植用户核心指标和基线提示已接入。 | ✅ 已完成 |
| 6 | P1 | **UI响应式适配** | ~~仅手机480px~~ ✅ 已完成（2026-04-19）：手机100%自适应+桌面左侧边栏 | ✅ 已完成 |
| 7 | P1 | **生产环境部署** | ~~待部署~~ ✅ 已完成（2026-04-19）：Docker Compose + nginx已部署到ECS | ✅ 已完成 |
| 8 | P1 | **iOS 日期输入框溢出** | ~~待修复~~ ✅ 已修复（2026-04-21）：`index.css` 添加 `-webkit-appearance: none` + `line-height: 1.5` 重置。 | ✅ 已完成 |
| 9 | P2 | ~~健康洞察增强~~ | ✅ 已完成（2026-05-30）：接入 records 中的血压、体重、尿量、血糖、他克莫司趋势，并补充日常记录完整度摘要。 | ✅ 已完成 |
| 10 | P2 | **检查报告到期提醒** | 基于用户类型和上次检查日期，智能提醒复查时间 | ❌ 未开始 |
| 11 | P2 | **商业化付费功能** | 内测通过后实施。完整方案见 `docs/billing-plan.md`。 | ❌ 未开始 |
| 12 | P2 | ~~心率正式字段~~ | ✅ 已完成（2026-05-30）：Prisma 增加 `heartRate`，新记录优先写正式字段，旧 notes 心率继续兜底展示。 | ✅ 已完成 |
| 13 | P1 | ~~肾移植风险规则抽离~~ | ✅ 已完成（2026-05-30）：前后端规则模块已抽离，并接入 Dashboard、HealthInsights、预警和 PDF 医生摘要。 | ✅ 已完成 |
| 14 | P1 | ~~预警动作化~~ | ✅ 已完成（2026-05-30）：Dashboard/Alerts 支持查看记录、查看用药、生成报告、标为已读。 | ✅ 已完成 |

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
│   └── ui/               # BackButton / SegmentedControl / Spinner / ConfirmDialog（2026-07-20 抽取，新页面必须复用）
├── pages/                # 路由页面组件（每个页面对应一个路由）
│   ├── Dashboard.tsx
│   ├── HealthInsights.tsx   ← 新增：健康洞察页面
│   ├── MedicationForm.tsx   ← 含BottomSelector
│   ├── ReminderSettings.tsx ← 提醒设置独立页
│   ├── PrivacySecurity.tsx  ← 隐私与安全 + 修改密码
│   ├── HelpCenter.tsx       ← 使用指南/FAQ
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
├── utils/
│   └── chartTheme.ts     # 图表主题：Recharts tick/tooltip 随深浅色切换（2026-07-20 新增）
├── App.tsx               # 路由定义
└── index.css             # CSS变量 + 全局样式
```

### 2. 主题与样式约定

**CSS变量驱动深色模式** (`src/index.css`，2026-07-20 与实现对齐)：
```css
:root {
  --color-bg: #f4f6fb;
  --color-card: rgba(255, 255, 255, 0.82);
  --color-text-primary: #1f2a44;
  --color-text-secondary: #5e6b85;
  --color-text-helper: #5b6478;   /* 白底约 5.9:1，达标 WCAG AA */
  --color-border: rgba(145, 161, 196, 0.26);
}
.dark {
  --color-bg: #0f1728;
  --color-card: rgba(18, 28, 48, 0.82);
  --color-text-primary: #eef3ff;
  --color-text-secondary: #b5c0d8;
  --color-text-helper: #7f8aa7;
  --color-border: rgba(139, 160, 206, 0.18);
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
/reminder-settings → 提醒设置
/privacy-security  → 隐私与安全（隐私政策入口 + 修改密码）
/help-center       → 帮助中心
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

### 1.1 报告导出

- 路由：`GET /reports/follow-up`
- 文件：
  - `src/backend/src/controllers/report.controller.ts`
  - `src/backend/src/routes/report.routes.ts`
  - `src/backend/src/services/report.service.ts`
- 默认导出近 30 天复诊 PDF，也支持 `startDate` / `endDate`。
- PDF 中文字体：
  - 本机优先使用 `/Library/Fonts/Arial Unicode.ttf`、`/System/Library/Fonts/Supplemental/Arial Unicode.ttf`、`/System/Library/Fonts/STHeiti Medium.ttc`
  - Docker 使用 Noto CJK 字体（Dockerfile 已安装）
  - 可用 `PDF_FONT_PATH` 覆盖字体路径
- 排查乱码：`strings 健康报告.pdf | rg "BaseFont|FontName|ToUnicode"`，正常应出现中文字体和 `ToUnicode`，若只有 `/Helvetica` 说明后端仍是旧进程或未加载字体。

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

### 测试纪律（TDD）
- 每一项开发都必须有自动化测试或明确的回归测试脚本，不能只做手动验证。
- 能先写失败测试时，先写测试再实现；修复既有问题时，必须补能复现问题的回归测试。
- 完成记录和最终回复必须写明运行过的测试命令与结果。
- 后端健康记录校验测试：`cd src/backend && npm test`。

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
- [ ] 本项开发对应的自动化测试已通过
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
6. **Tailwind 不存在 `w-13`**：Tailwind v3 内置只有 `w-12`(48px) 和 `w-14`(56px)，写了 `w-13` 不会生成 CSS，元素宽度为 0。Toggle 开关用 `w-12` + `translate-x-5` 组合。
7. **PDF 中文乱码**：`pdfkit` 默认 Helvetica 不支持中文。必须在 `report.service.ts` 注册中文字体；生产 Docker 必须安装 CJK 字体。若用户重新导出仍乱码，优先检查 PDF 是否还只有 `/Helvetica`。Debian 的 `fonts-noto-cjk` 常是 `.ttc` 字体集合，PDFKit 注册时需要指定 face（如 `NotoSansCJKsc-Regular`），否则可能报 `this.font.createSubset is not a function`。
8. **用药提醒跨天状态**：不要让前端用 `new Date().toISOString().split('T')[0]` 拼当天服药记录。后端 `getTodayMedications()` 已返回 `scheduledAt`，前端应直接回传。
9. **健康记录心率**：当前数据库已有正式 `HealthRecord.heartRate` 字段。新记录优先写正式字段；旧数据里的 `notes` 心率只做兜底展示，不要删除。
10. **Docker Compose .env 解析**：`.env` 密钥不能拆成多行。若 `docker compose` 报 `unexpected character "/" in variable name`，通常是上一行变量值换行导致密钥片段变成“变量名”；修成 `KEY=value` 单行或加引号。
11. **PDF 字体日志排查顺序**：先触发一次导出，再看 `docker compose logs backend | grep -i "PDF\\|字体\\|font\\|Noto"`；没触发导出时没有字体日志是正常的。用 `docker compose exec backend sh -lc 'find /usr/share/fonts -iname "*NotoSansCJK*"'` 判断字体是否在容器内。
12. **Prisma migrate 空报错**：2026-05-30 本机 `migrate dev/status` 对 `health_monitoring` 返回空的 `Schema engine error:`，但 `prisma validate/generate` 正常。不要重复创建同名迁移；先排查本地 schema engine 或数据库迁移状态。

### 设计决策记录
- **不做AI大模型调用**：健康洞察使用纯本地规则引擎，规避医疗政策风险
- **480px限制**：~~MVP阶段优先手机端，响应式适配为明确待办~~ ✅ 已完成（2026-04-19）：手机端100%自适应，桌面端左侧边栏
- **深色模式**：CSS变量方案，不是Tailwind默认dark模式

### 部署相关
- **Docker 前端缓存**：`docker-compose up -d --build` 不会重新构建已缓存的前端镜像。必须先 `docker rmi healthmonitoringassistant_frontend:latest`，再 `docker-compose build --no-cache frontend`
- **Docker 后端字体缓存**：PDF 字体相关修复必须 `docker compose build --no-cache backend && docker compose up -d backend`。只 `restart` 不会安装新字体，也不会更新 Dockerfile 检查。

---

## 推荐的 MCP 配置

在 `~/.Codex/settings.json` 中配置：

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
| **开发者手册** | `docs/developer-handbook.md` | **必读**：架构约定、启动指南、踩坑记录、待办清单 |
| **下个Agent待办** | `docs/next-agent-todos.md` | **串行执行**：近期优化任务包、范围、验收标准、避坑提示 |
| 产品需求 | `docs/prd.md` | 功能需求、用户故事 |
| API规范 | `docs/api-spec.md` | REST API详细定义 |
| 数据库设计 | `docs/database-schema.md` | Prisma schema说明 |
| 设计规范 | `docs/design-system.md` | 颜色、字体、组件规范 |
| 医学规范 | `docs/medical-spec.md` | 参考值范围、药物清单 |
| 安全清单 | `docs/security.md` | 安全要求与检查项 |
| 第三方服务 | `docs/third-party-services.md` | 阿里云SMS、百度OCR配置 |
| 架构设计 | `docs/architecture.md` | 系统架构图、选型理由 |
| GitHub协作 | `docs/github-workflow.md` | PR流程、分支策略 |
| **付费方案** | `docs/billing-plan.md` | **内测后实施**：Freemium模式、支付集成、合规要求 |

---

**免责声明**: 本应用提供的健康监测功能仅供参考，不能替代专业医疗诊断和治疗建议。如有身体不适，请及时就医。
