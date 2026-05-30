# Next Agent 待办清单

> 更新时间：2026-05-30
>
> 目的：把近期优化规划拆成可以逐项完成的小任务。后续 agent 不要一次性开启所有任务；每次只选择一个任务，读对应文件，完成、验证、记录后再进入下一项。

## 使用规则

1. 每次只做一个任务包。不要同时改洞察、录入、移植字段、预警和部署。
2. 开始任何任务前先读：
   - `AGENTS.md`
   - `docs/developer-handbook.md`
   - `docs/dev-log.md` 最新条目
   - 本文件当前任务包
3. 先执行 `git status --short`，确认工作区是否已有他人改动。不要回滚无关改动。
4. 每项开发必须按 TDD/回归测试方式推进：
   - 能先写失败测试时，先写测试再实现。
   - 已有实现的补救任务，必须补自动化回归测试覆盖本次问题。
   - 最终记录必须写明测试命令和结果，不能只写“已手动验证”。
5. 任务完成后至少运行相关测试、构建或类型检查：
   - 后端健康记录校验：`cd src/backend && npm test`
   - 前端任务：`cd src/frontend && npm run build`
   - 后端任务：`cd src/backend && npm run build`
   - 涉及 Prisma：还需运行 `cd src/backend && npx prisma generate`
6. 医疗安全边界必须遵守：
   - 只做记录、趋势、复查提醒、联系医生提醒。
   - 不输出排异、感染、药物毒性等诊断结论。
   - 不建议用户自行调整药物剂量。

---

## 推荐执行顺序

1. ~~P1-08 健康记录输入校验与趋势指标白名单~~ — 已完成（2026-05-30）
2. ~~P1-01 健康洞察接入日常数据~~ — 已完成（2026-05-30）
3. ~~P1-02 统一健康记录录入体验~~ — 已完成（2026-05-30）
4. ~~P1-03 移植用户个人基线引导~~ — 已完成（2026-05-30）
5. ~~P1-04 健康记录字段扩展 migration~~ — 已完成（2026-05-30）
6. P1-05 移植风险规则抽离与报告接入
7. P1-06 预警动作化
8. P0-02 HTTPS 与域名生产化

---

## 2026-05-28 代码审计新增待办

### P0-03 OCR 识别所有权校验 — 已完成

**问题**：`src/backend/src/services/ocr.service.ts` 的 `recognizeImage(imageId)` 只按图片 ID 查询 `LabReport`，没有带 `userId`。控制器已拿到当前用户，但未传入服务层。

**建议**：改为 `recognizeImage(userId, imageId)`，用 `findFirst({ where: { id: imageId, userId } })` 校验所有权。确认、读取 OCR 结果已有所有权校验，保持一致。

**验收标准**：其他用户无法识别不属于自己的 `imageId`；后端 build 通过。

**完成记录**：2026-05-28 已修复，控制器传入当前 `userId`，服务层按 `id + userId` 查询报告；`cd src/backend && npm run build` 通过。

### P0-04 Refresh Token 签名验证与轮换加固 — 已完成

**问题**：刷新令牌逻辑手动 base64 解 payload 后查 DB，没有先做 `jwt.verify()` 签名验证，也没有校验 token 类型。

**建议**：复用或重写 `verifyRefreshToken()`，流程为签名验证、jti 存在、未吊销、未过期、用户有效、吊销旧令牌、签发新令牌。

**验收标准**：伪造 payload 的 refresh token 无法刷新；旧 refresh token 轮换后不可再次使用。

**完成记录**：2026-05-29 已修复。`src/backend/src/utils/jwt.ts` 为 access/refresh JWT 增加 `type` 声明，`verifyRefreshToken()` 先校验签名和类型，再校验 `jti`、DB 记录、过期/吊销和用户一致性；`src/backend/src/services/auth.service.ts` 改为复用该验证逻辑，并在刷新时原子吊销旧 token 后签发新 token。`cd src/backend && npm run build` 通过。

### P0-05 生产限流改为 Redis/共享存储 — 已完成

**问题**：验证码和认证限流使用进程内 Map，多副本部署或重启后失效。

**建议**：验证码存储和限流桶统一接入 Redis。生产环境 Redis 连接失败应明确报错，不应静默退回内存。

**验收标准**：后端重启后未过期验证码仍可验证；多实例共享发送频率限制。

**完成记录**：2026-05-29 已修复。`src/backend/src/middleware/security.middleware.ts` 的 `createRateLimiter()` 在生产环境改用 Redis Lua 脚本原子执行 `INCR + PTTL/PEXPIRE` 固定窗口限流，key 使用 SHA-256 后缀避免明文手机号/IP 入 key；开发环境保留内存 Map。生产 Redis 不可用时返回 503，不静默放行或回退。`cd src/backend && npm run build` 通过；smoke test 确认开发环境第三次请求返回 429、生产 Redis 不可用时返回 503。

### P1-07 日期/时区工具统一 — 已完成

**问题**：用药模块使用 `Asia/Shanghai` 日期工具，但 Dashboard 今日打卡、趋势查询和部分前端页面仍使用 `new Date().toISOString().split('T')[0]`，午夜边界容易查错日期。

**建议**：前后端都抽共享的应用日期工具，健康记录、Dashboard、趋势、用药统计统一按应用时区取日界线。

**验收标准**：Asia/Shanghai 午夜前后，今日打卡、趋势、用药计划日期一致。

**完成记录**：2026-05-29 已修复。后端新增 `src/backend/src/utils/app-date.ts`，前端新增 `src/frontend/src/utils/appDate.ts`；Dashboard 今日打卡、报告默认区间、趋势查询、健康洞察、OCR/健康记录默认日期、用药统计和部分日期展示均改为应用时区。`cd src/backend && npm run build`、`cd src/frontend && npm run build` 通过；smoke test 确认 UTC 16:00 前后会按 Asia/Shanghai 切换应用日期。

### P1-08 健康记录输入校验与趋势指标白名单 — 已完成

**问题**：健康记录创建/更新基本直接透传 body，趋势接口允许任意 `metrics` 动态拼 Prisma 查询。

**建议**：接入 `utils/validators.ts` 中的数值范围校验，建立允许查询的健康指标白名单，对未知字段返回 400。

**验收标准**：非法日期、非法数值、未知趋势指标都返回明确 400，不暴露 Prisma 错误。

**完成记录**：2026-05-30 已修复。`src/backend/src/services/health-record.service.ts` 新增健康记录字段/趋势指标白名单、创建/更新输入清洗、严格日期范围校验、整数字段校验和分页参数校验；`src/backend/src/utils/validators.ts` 收紧日期校验并补充指标中文提示与他克莫司录入安全上限；`src/backend/src/controllers/health-record.controller.ts` 对趋势查询参数类型做格式校验；新增 `src/backend/src/tests/health-record-validation.test.ts` 覆盖非法日期、非法数值、未知字段、未知列表指标和未知趋势指标。`cd src/backend && npm test`、`cd src/backend && npm run build` 通过。

### P1-09 清理他克莫司固定参考范围

**问题**：部分页面和血药浓度服务仍残留固定 `5-15 ng/mL`，与移植用户“医生目标范围”原则不一致。

**建议**：`RecordForm.tsx`、`RecordDetail.tsx`、`drug-concentration.service.ts` 改为医生目标范围提示；正式范围等 P1-04 新增配置字段后再判断。

**验收标准**：移植相关页面不再把他克莫司 `5-15` 显示为通用正常范围。

### P1-10 ProfileEdit 接入统一 API 层

**问题**：`ProfileEdit.tsx` 直接 `fetch('/api/users/profile')`，绕过 axios 401 拦截和统一错误处理。

**建议**：改用 `userApi.getProfile()` / `userApi.updateProfile()`，保存后同步必要的 authStore 用户字段。

**验收标准**：ProfileEdit 401 能触发登录过期处理；保存后档案和首页用户信息一致。

### P1-11 测试与部署脚本整理

**问题**：后端 `npm test` 当前不可用；`tsc` 会把 `src/tests` 编译进 `dist/tests`；Worker Dockerfile 启动路径仍指向 `dist/worker.js`，与实际构建产物不一致。

**建议**：要么配置 Jest + TypeScript，要么把现有测试脚本改为 `tsx` 显式运行；生产 Dockerfile 排除测试产物；修正 Worker 启动路径并统一漏服逻辑。

**验收标准**：`npm test` 有明确、可重复的结果；Worker 镜像能正常启动或被明确禁用。

---

## P1-01 健康洞察接入日常数据 — 已完成

### 用户价值

用户每天记录血压、尿量、体重后，需要马上看到这些记录带来的价值。当前洞察页主要分析化验指标和用药记录，日常打卡数据没有真正进入洞察，容易让用户觉得“我填了也没用”。

### 当前问题

- `src/frontend/src/pages/HealthInsights.tsx` 中 `checkIns` 仍为空数组。
- `src/frontend/src/services/insights/engine.ts` 只提取肌酐、尿素氮、血钾、尿酸、血红蛋白、体重。
- 洞察类型缺少血压、尿量、血糖、他克莫司等已经在记录表中存在的字段。
- 他克莫司不能继续使用固定 `5-15 ng/mL` 通用范围做异常判断。

### 建议范围

只改前端洞察相关代码，不做数据库 migration。

主要文件：

- `src/frontend/src/pages/HealthInsights.tsx`
- `src/frontend/src/services/insights/types.ts`
- `src/frontend/src/services/insights/engine.ts`
- `src/frontend/src/services/insights/referenceRanges.ts`
- `src/frontend/src/services/insights/ruleEngine.ts`
- `src/frontend/src/services/insights/summaryGenerator.ts`

### 实施步骤

1. 扩展 `MetricKey`：
   - `bloodSugar`
   - `systolic`
   - `diastolic`
   - `urineVolume`
   - `tacrolimus`
2. 在 `AnalysisInput.records` 中补齐这些字段。
3. 在 `extractMetricSeries()` 中从 `records` 提取：
   - `bloodPressureSystolic` → `systolic`
   - `bloodPressureDiastolic` → `diastolic`
   - `urineVolume`
   - `bloodSugar`
   - `tacrolimus`
4. `HealthInsights.tsx` 不再构造空 `checkIns`，或删除 `checkIns` 依赖，统一从 `records` 生成序列。
5. `referenceRanges.ts` 添加血压、尿量、血糖参考范围。
6. 他克莫司只允许生成趋势描述，不要用固定范围生成 warning/critical。
7. Summary 中增加日常数据完整度提示，例如：
   - 最近 14 天有 X 天记录血压。
   - 近 14 天尿量记录不足，建议持续记录以便复诊查看。
8. 保持每条 Insight 都有 `disclaimer`。

### 验收标准

- 洞察页能基于血压、尿量、体重生成趋势或完整度提示。
- 血钾 critical/warning 逻辑不被破坏。
- 他克莫司页面只说“趋势/医生目标范围”，不输出固定异常范围。
- 没有数据时仍保持友好空状态。
- `cd src/frontend && npm run build` 通过。

### 完成记录

2026-05-30 已修复。新增 `src/frontend/src/services/insights/engine.test.ts` 先覆盖日常指标趋势、血钾 critical、他克莫司 trend-only 和血压/尿量完整度摘要；随后扩展洞察引擎从 `records` 直接提取血压、尿量、血糖、他克莫司，`HealthInsights.tsx` 不再构造空 `checkIns`；他克莫司标记为 trend-only，不参与固定参考范围异常判断；摘要增加最近 14 天血压、体重、尿量记录完整度提示。Vitest 配置已排除 Playwright E2E，避免单测入口误收 `e2e/*.spec.ts`。`cd src/frontend && npm test -- --run`、`cd src/frontend && npm run build` 通过。

### 避坑

- 不要新增外部 AI 调用。
- 不要把他克莫司 `5-15` 范围重新加回异常判断。
- 不要把“感染、排异、药物毒性”写成结论。

---

## P1-02 统一健康记录录入体验 — 已完成

### 用户价值

当前 `/records` 和 `/records/new` 是两套录入体验，字段和文案不一致。用户从 Dashboard 快捷入口进入旧表单，从底部导航进入新表单，容易困惑。统一表单可以降低老人用户每天打卡成本。

### 当前问题

- `src/frontend/src/pages/Records.tsx` 是新工作台式录入。
- `src/frontend/src/pages/RecordForm.tsx` 是旧表单。
- `RecordForm.tsx` 仍显示他克莫司 placeholder `5-15`。
- 心率只存在于 `Records.tsx`，编辑页和旧表单不一致。

### 建议范围

只做前端表单统一，不做 heartRate migration。心率仍临时写入 `notes`。

主要文件：

- `src/frontend/src/pages/Records.tsx`
- `src/frontend/src/pages/RecordForm.tsx`
- `src/frontend/src/pages/RecordDetail.tsx`
- 可新增：`src/frontend/src/components/health/HealthRecordForm.tsx`
- 可新增：`src/frontend/src/services/healthRecordFields.ts`

### 实施步骤

1. 抽出统一字段配置：
   - 日常指标：体重、尿量、收缩压、舒张压、心率。
   - 化验指标：肌酐、尿素氮、血钾、血钠、血磷、血红蛋白、血糖、尿酸、他克莫司。
2. 抽 `HealthRecordForm`：
   - 支持 `mode=daily | lab | full`。
   - 支持 `quickType=weight | bloodPressure | urineVolume`。
   - 支持编辑时带入已有记录。
3. `/records` 内嵌表单和 `/records/new` 复用同一个组件。
4. 编辑页继续可从最近记录进入。
5. 他克莫司 placeholder 改为“按医生目标范围记录”或“如：8.0”。
6. 心率读取/写入先沿用 notes 格式：`心率：72次/分`。
7. 保存成功后刷新最近记录；从 Dashboard 快捷入口进入时，保存后返回 Dashboard。

### 验收标准

- 从 Dashboard 的体重/尿量/血压快捷入口进入后，只显示对应字段。
- 从 `/records` 进入后，可以录日常指标和化验指标。
- 从 `/records/:id/edit` 进入后，可以编辑已有数据。
- 他克莫司不再出现固定 `5-15` placeholder。
- 心率仍能保存并在最近记录显示。
- `cd src/frontend && npm run build` 通过。

### 完成记录

2026-05-30 已修复。先新增 `src/frontend/src/services/healthRecordFields.test.ts` 覆盖统一字段顺序、Dashboard 快捷入口字段过滤、他克莫司 placeholder、心率 notes 读写与备注保留、列表/详情摘要一致性；再新增 `src/frontend/src/services/healthRecordFields.ts` 和 `src/frontend/src/components/health/HealthRecordForm.tsx`。`/records` 内嵌表单、`/records/new` 和 `/records/:id/edit` 已复用同一表单组件；`RecordDetail.tsx` 改用同一字段配置展示，心率从 notes 中单独展示且备注保留非心率内容；他克莫司不再显示固定 `5-15` 范围，改为医生目标范围提示。`cd src/frontend && npm test -- --run`、`cd src/frontend && npm run build` 通过。

### 避坑

- 不要在本任务里新增数据库字段。
- 不要丢失编辑记录时原有 `notes` 中的其他内容。如果处理复杂，至少不要覆盖非心率备注。
- 不要改变后端 API 响应信封处理方式。

---

## P1-03 移植用户个人基线引导 — 已完成

### 用户价值

移植用户的风险提示依赖个人稳定基线。当前首次引导只收集移植时间，不收集基线肌酐，很多用户会长期看到“需要建立个人基线”，但不知道怎么补。

### 当前问题

- `Dashboard.tsx` 的 `getTransplantRiskReminder()` 依赖 `baselineCreatinine`。
- `Onboarding.tsx` 只在移植用户处展示移植时间。
- `ProfileEdit.tsx` 虽有基线肌酐字段，但没有针对移植用户的任务式引导。
- `ProfileEdit.tsx` 直接 `fetch('/api/users/profile')`，没有用 `userApi`，绕过 axios 拦截器和统一错误处理。

### 建议范围

只做前端引导和档案编辑可靠性，不做 migration。

主要文件：

- `src/frontend/src/pages/Onboarding.tsx`
- `src/frontend/src/pages/Dashboard.tsx`
- `src/frontend/src/pages/ProfileEdit.tsx`
- `src/frontend/src/pages/Profile.tsx`
- `src/frontend/src/services/api.ts`

### 实施步骤

1. 在移植用户 onboarding 第二步增加可选字段：
   - 稳定期基线肌酐 `baselineCreatinine`
   - 提示文案：如果不确定，可稍后在个人档案补充。
2. Dashboard 当移植用户缺少 `baselineCreatinine` 时，增加明确 CTA：
   - “填写个人基线”
   - 点击进入 `/profile/edit`，并可定位到疾病信息区域。
3. Profile 页健康档案卡中突出显示：
   - 基线肌酐是否已填写。
   - 移植时间是否已填写。
4. ProfileEdit 改用 `userApi.getProfile()` / `userApi.updateProfile()`。
5. 保存 ProfileEdit 后同步必要的 authStore 用户信息，至少保证 userType/primaryDisease 不出现旧值。

### 验收标准

- 移植用户首次引导可填写基线肌酐。
- 未填写基线肌酐的移植用户在 Dashboard 能明确跳转去补充。
- ProfileEdit 401 时能触发统一登录过期处理。
- `cd src/frontend && npm run build` 通过。

### 完成记录

2026-05-30 已修复。先新增 `src/frontend/src/services/transplantProfile.test.ts` 覆盖 onboarding 基线 payload、基线可留空、Dashboard CTA 判断、Profile 档案 checklist、ProfileEdit 日期/字段归一化；再新增 `src/frontend/src/services/transplantProfile.ts`。`Onboarding.tsx` 为移植用户增加可选稳定期基线肌酐；`Dashboard.tsx` 在移植用户缺少基线时提供“填写个人基线”CTA 跳转 `/profile/edit#disease-info`；`Profile.tsx` 突出移植时间和基线肌酐填写状态；`ProfileEdit.tsx` 改用 `userApi.getProfile()` / `userApi.updateProfile()`，保存后同步 authStore 的 name/userType/primaryDisease/onboardingCompleted，401 可走 axios 统一拦截；`src/backend/src/controllers/user.controller.ts` 补齐 onboarding 的 `baselineCreatinine` 通路，不新增数据库字段。`cd src/frontend && npm test -- --run`、`cd src/frontend && npm run build`、`cd src/backend && npm run build`、`cd src/backend && npm test` 通过。

### 避坑

- 基线肌酐不能强制必填，否则会阻塞不确定数据的用户。
- 文案不要说“没有基线就无法判断安全”，只说“报告会更有参考价值”。

---

## P1-04 健康记录字段扩展 migration

> 状态：已完成（2026-05-30）

### 用户价值

移植术后用户真正关心的不只有肌酐和血药浓度，还包括 eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、病毒载量等。心率目前写入 notes，无法做趋势和洞察。

### 当前问题

- `HealthRecord` 没有 `heartRate`。
- `HealthRecord` 没有 eGFR、尿蛋白、病毒载量等移植相关字段。
- 医生配置的他克莫司目标范围没有正式字段。

### 建议范围

本任务只做 schema、migration、API 数据通路和基础 UI 录入，不做复杂风险规则。

主要文件：

- `src/backend/prisma/schema.prisma`
- `src/backend/src/services/health-record.service.ts`
- `src/backend/src/controllers/health-record.controller.ts`
- `src/frontend/src/pages/Records.tsx`
- `src/frontend/src/pages/RecordForm.tsx` 或统一后的 `HealthRecordForm.tsx`
- `src/frontend/src/pages/RecordDetail.tsx`
- `src/frontend/src/pages/Charts.tsx`
- `src/frontend/src/pages/Dashboard.tsx`
- `src/frontend/src/stores/dashboardStore.ts`
- `src/frontend/src/services/insights/types.ts`

### 建议新增字段

`HealthRecord`：

- `heartRate Int?`
- `egfr Float?`
- `urineProteinCreatinineRatio Float?`
- `urineAlbuminCreatinineRatio Float?`
- `urineOccultBlood String?`
- `bkVirusCopies Float?`
- `cmvVirusCopies Float?`
- `ebvVirusCopies Float?`

`UserProfile` 或独立配置表：

- `tacrolimusTargetMin Float?`
- `tacrolimusTargetMax Float?`

### 实施步骤

1. 修改 Prisma schema。
2. 创建 migration：
   - `cd src/backend && npx prisma migrate dev --name add-transplant-monitoring-fields`
3. 运行：
   - `cd src/backend && npx prisma generate`
4. 后端 create/update/get/list/trends/recent metrics 补齐字段。
5. 前端录入表单加入新字段，但默认不要一次展示全部：
   - 日常：心率。
   - 化验扩展：eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血。
   - 移植专项：BK/CMV/EBV、他克莫司目标范围。
6. 迁移旧 notes 中心率：
   - 可先不做历史迁移。
   - 新记录优先写 `heartRate`。
   - 展示时如果 `heartRate` 为空，再从 notes 兜底提取。

### 验收标准

- Prisma migrate 和 generate 成功。
- 新字段可以创建、编辑、详情展示。
- 趋势接口可以查询新数值字段。
- 旧 records 中 notes 心率仍能展示。
- `cd src/backend && npm run build` 通过。
- `cd src/frontend && npm run build` 通过。

### 完成记录

2026-05-30 已完成。先补后端 `src/backend/src/tests/health-record-validation.test.ts`，覆盖正式 `heartRate`、尿潜血文本校验、新增数值字段创建和趋势白名单；前端补 `healthRecordFields.test.ts`、`transplantProfile.test.ts`、`insights/engine.test.ts`，覆盖正式心率字段、旧 notes 心率兜底、新增移植监测字段、他克莫司医生目标范围和 trend-only 洞察。新增 `HealthRecord.heartRate/egfr/urineProteinCreatinineRatio/urineAlbuminCreatinineRatio/urineOccultBlood/bkVirusCopies/cmvVirusCopies/ebvVirusCopies`，新增 `UserProfile.tacrolimusTargetMin/tacrolimusTargetMax`，并创建 `20260530122000_add_transplant_monitoring_fields` migration。健康记录 create/update/list/trends、Dashboard/Charts、健康洞察、Profile/ProfileEdit 和统一录入表单已接入。`cd src/backend && npx prisma validate`、`cd src/backend && npx prisma generate`、`cd src/backend && npm test`、`cd src/backend && npm run build`、`cd src/frontend && npm test -- --run`、`cd src/frontend && npm run build` 通过。

注意：本机 `npx prisma migrate dev --name add-transplant-monitoring-fields` 与 `npx prisma migrate status` 连接到 `health_monitoring` 后返回空的 `Schema engine error:`；已用同一份 migration SQL 通过 `psql` 事务应用到本地库，并写入 `_prisma_migrations`，列存在性已验证。后续若 Prisma CLI 继续空报错，优先排查本地 Prisma schema engine/数据库状态，而不是重复创建迁移。

### 避坑

- 不要在 migration 里删除旧 notes 心率。
- 病毒载量、尿蛋白等字段不要自动生成诊断。
- 他克莫司目标范围必须是用户/医生配置，不要写死。

---

## P1-05 移植风险规则抽离与报告接入

### 用户价值

当前移植风险逻辑散在 Dashboard 和后端 alert 中。字段扩展后需要统一规则，避免多个页面输出不一致，也避免未来继续堆在页面组件里。

### 前置条件

P1-04 已完成基础字段和数据通路。本任务可以直接基于 `heartRate`、`egfr`、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV、`tacrolimusTargetMin/Max` 做规则抽离，但仍然只输出复查/联系医生级别提醒。

### 建议范围

抽规则模块，接入 Dashboard、健康洞察和 PDF 报告。

主要文件：

- 可新增：`src/frontend/src/services/transplantRisk/`
- 或新增后端：`src/backend/src/services/transplant-risk.service.ts`
- `src/frontend/src/pages/Dashboard.tsx`
- `src/frontend/src/pages/HealthInsights.tsx`
- `src/backend/src/services/alert.service.ts`
- `src/backend/src/services/report.service.ts`

### 实施步骤

1. 定义统一输入：
   - 用户类型
   - 移植时间
   - baselineCreatinine
   - tacrolimusTargetMin/Max
   - 最近记录列表
2. 定义统一输出：
   - `level: info | warning | critical`
   - `title`
   - `message`
   - `suggestedAction`
   - `missingFields`
   - `disclaimer`
3. 把 Dashboard 的 `getTransplantRiskReminder()` 移到规则模块。
4. 后端 alert 的肌酐基线规则复用同一阈值定义：
   - `>10%` warning
   - `>25%` critical
   - 连续 3 次上升 warning
5. PDF 报告加入：
   - 个人基线
   - 趋势偏移
   - 缺失字段清单
   - 医生目标范围提示
6. 健康洞察页加入移植专项摘要。

### 验收标准

- Dashboard、HealthInsights、PDF 对同一组数据输出级别一致。
- 缺少字段时输出“建议补充数据”，不假装判断。
- 所有文案都遵守医学边界。
- 前后端 build 通过。

### 避坑

- 禁止输出“疑似排异/感染/药物毒性”。
- 禁止建议调药。
- 不要把病毒载量等缺失字段当作正常。

---

## P1-06 预警动作化

### 用户价值

用户看到预警后，需要知道下一步做什么。当前 Dashboard 只展示消息文本，动作不足。给出“查看记录、标为已处理、生成报告、补录复查结果”等动作，会明显提升可用性。

### 当前问题

- Dashboard 预警只展示 `alert.message`。
- Alerts 页面可读/删除，但缺少关联记录动作。
- 后端 alert 已有 `recordId`、`metric`、`medicationId`、`medicationLogId` 字段，前端利用不足。

### 建议范围

先做前端动作和 API 返回字段，不改预警规则。

主要文件：

- `src/backend/src/services/dashboard.service.ts`
- `src/backend/src/services/alert.service.ts`
- `src/frontend/src/pages/Dashboard.tsx`
- `src/frontend/src/pages/Alerts.tsx`
- `src/frontend/src/services/api.ts`

### 实施步骤

1. Dashboard API alerts 返回：
   - `id`
   - `level`
   - `type`
   - `message`
   - `suggestion`
   - `recordId`
   - `metric`
   - `medicationId`
   - `medicationLogId`
2. Dashboard 预警卡显示 `suggestion`。
3. 根据类型显示动作：
   - metric + recordId：查看相关记录。
   - medication + medicationId：查看用药。
   - critical：生成复诊报告。
   - warning/info：标为已读。
4. Alerts 页面同样支持动作。
5. 标为已读后刷新 unread count 和 Dashboard 红点。

### 验收标准

- 用户能从预警直接跳到相关记录或用药。
- critical 预警能引导生成报告。
- 删除/已读逻辑不破坏 missed medication alert 的去重逻辑。
- 前后端 build 通过。

### 避坑

- 删除 medication alert 时仍要保留 `markMedicationAlertDismissed()` 行为，避免已处理漏服提醒反复出现。
- 不要把“生成报告”做成自动分享，必须由用户主动分享。

---

## P0-01 生产 Redis 验证码存储 — 已完成

### 用户价值

验证码存在内存中，后端重启会丢失，生产用户可能拿到验证码但无法注册/找回密码。这是登录注册可用性的 P0。

### 当前问题

- SMS 验证码开发环境使用内存 Map。
- 文档多处标记生产必须替换 Redis。

### 建议范围

只改验证码存储，不改 SMS API 行为。

主要文件：

- `src/backend/src/services/auth.service.ts`
- `src/backend/src/config/*`
- `src/backend/package.json`
- `docker-compose.yml`
- `.env.example` 或相关部署文档

### 实施步骤

1. 检查当前验证码 Map 所在代码。
2. 增加 Redis client 配置：
   - `REDIS_URL`
   - 连接失败日志
3. 抽象验证码存储接口：
   - `setVerificationCode(phone, type, code, ttlSeconds)`
   - `getVerificationCode(phone, type)`
   - `deleteVerificationCode(phone, type)`
4. 开发环境可保留内存 fallback，但生产环境 Redis 失败应明确报错。
5. Docker Compose 添加 Redis 服务或接入外部 Redis。
6. 更新部署文档。

### 验收标准

- 后端重启后，Redis 中未过期验证码仍可验证。
- 验证成功后验证码删除。
- 过期验证码不可用。
- `cd src/backend && npm run build` 通过。

### 完成记录

2026-05-29 已完成：

- 新增 `src/backend/src/config/redis.ts`，生产环境要求可用 `REDIS_URL`，开发环境 Redis 不可用时回退内存。
- 新增 `src/backend/src/services/verification-code-store.ts`，按 `phone + type` 存取验证码，Redis key 使用 SHA-256 后缀避免明文手机号入 key。
- `auth.service.ts` 改为通过 store 检查发送间隔、保存验证码、验证后删除验证码。
- 未配置短信服务时，生产环境验证码接口明确失败；非生产环境保留模拟验证码流程，且不再把 OTP 写入日志。
- 已更新 `.env.example`、`src/backend/.env.example`、`docs/quick-deploy.md`。
- `cd src/backend && npm run build` 通过。
- Smoke test 确认：开发环境 Redis 不可用时回退内存；生产环境 Redis 不可用时抛 `AppError(statusCode=503, code=01011)`。

### 避坑

- 不要把验证码写进日志。
- 不要把 Redis 密码提交到仓库。
- 不要破坏阿里云 `CheckSmsVerifyCode` 当前调用逻辑。

---

## P0-02 HTTPS 与域名生产化

### 用户价值

健康数据产品必须给用户安全感。没有 HTTPS 或正式域名会影响信任，也可能影响分享、PWA、浏览器权限和部分移动端能力。

### 建议范围

部署和文档任务。不要和业务功能混做。

主要文件：

- `docs/deployment-guide.md`
- `docs/server-operations.md`
- `docs/quick-deploy.md`
- `infrastructure/`
- `docker-compose.yml`
- nginx 配置文件

### 实施步骤

1. 确认当前线上 nginx 配置和 ECS 部署路径。
2. 配置域名解析。
3. 配置 HTTPS 证书：
   - 阿里云证书或 Let's Encrypt。
4. nginx 强制 HTTP 跳转 HTTPS。
5. 检查 API 代理路径仍保持当前规则，不重新引入 `/api` 前缀 404。
6. 更新部署文档和回滚步骤。

### 验收标准

- 域名 HTTPS 可访问前端。
- SPA 刷新任意路由不 404。
- `/api/auth/verification-code` 等 API 正常。
- 浏览器无 mixed content。

### 避坑

- 不要只改本地 nginx 模板，必须确认生产实际使用的配置路径。
- 前端 Docker 缓存可能导致旧包未更新，必要时按文档 no-cache 构建。

---

## 后续产品增强候选

这些不是下一轮最优先，但可以作为内测后迭代：

1. 检查报告到期提醒：按用户类型、移植术后阶段、上次检查日期提醒复查。
2. OCR 识别结果置信度优化：低置信度字段强制用户核对。
3. 用药冲突/重复提醒：只做“请咨询医生确认”，不做自动判断。
4. PWA 离线支持：让用户在医院网络差时也能先记录，恢复网络后同步。
5. 报告 Excel 导出：给家属或医生做二次整理。

---

## 建议给下一个 agent 的任务提示模板

```text
请只完成 docs/next-agent-todos.md 中的 P1-01 健康洞察接入日常数据。
先阅读 AGENTS.md、docs/developer-handbook.md、docs/dev-log.md 最新条目和该任务包。
不要开始其他任务。完成后运行前端 build，并在最终回复里说明改了哪些文件、验证结果、剩余风险。
```
