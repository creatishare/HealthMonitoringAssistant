# 开发日志 (Development Log)

> 按日期记录每日开发内容、问题与解决方案、部署状态。
> **阅读提示**：Agent 开始新任务前，请先阅读本日志最新条目和"开放问题"章节。

---

## 2026-05-30 — 完成 P1-06 预警动作化

### 今日完成

1. **先补预警动作化回归测试**
   - 新增 `src/backend/src/tests/alert-action-fields.test.ts`：
     - 覆盖 `serializeAlertForClient()` 保留 `type`、`suggestion`、`recordId`、`metric`、`medicationId`、`medicationLogId` 等前端动作字段。
     - 覆盖 `formatDashboardAlert()` 不再裁剪 Dashboard 预警动作字段。
     - 确认响应序列化不暴露 `userId`。
   - 新增 `src/frontend/src/services/alertActions.test.ts`：
     - 覆盖 metric + recordId 生成“查看记录”动作。
     - 覆盖 medication + medicationId 生成“查看用药”动作。
     - 覆盖 critical 预警生成“生成报告”动作。
     - 覆盖未读预警生成“标为已读”，已读预警不再显示该动作。

2. **后端预警字段补齐**
   - `src/backend/src/services/alert.service.ts`
     - 新增 `serializeAlertForClient()`，列表接口返回前端动作所需字段。
     - 保留 medication alert 删除/删除已读时的 `markMedicationAlertDismissed()` 逻辑，避免漏服提醒反复补发。
   - `src/backend/src/services/dashboard.service.ts`
     - 新增 `formatDashboardAlert()`。
     - Dashboard API 的 `alerts` 现在返回 `id`、`level`、`type`、`message`、`suggestion`、`isRead`、`createdAt`、`recordId`、`metric`、`medicationId`、`medicationLogId`。

3. **前端动作入口**
   - 新增 `src/frontend/src/services/alertActions.ts`：
     - 统一把预警转换为 `record` / `medication` / `report` / `read` 动作。
   - 新增 `src/frontend/src/services/reportDownload.ts`：
     - 复用近 30 天报告下载、Blob 下载和 API 错误解析。
   - `src/frontend/src/pages/Dashboard.tsx`
     - 预警卡显示 `suggestion`。
     - 支持“查看记录”“查看用药”“生成报告”“标为已读”。
     - 标为已读后刷新 Dashboard，红点随未读状态更新。
   - `src/frontend/src/pages/Alerts.tsx`
     - 消息中心同样支持查看相关记录/用药、生成报告、标为已读、删除。
     - 生成报告只下载到本机，不自动分享。

### 验证

- 后端回归测试通过：
  ```bash
  cd src/backend && npm test
  ```
- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 前端单测通过：
  ```bash
  cd src/frontend && npm test -- --run --pool forks
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
  Vite 仍提示主 chunk 大于 500 kB，为既有体积提醒。

### 渲染验证说明

- 已尝试启动前端 dev server 做浏览器级烟测；`http://127.0.0.1:3000/` dev server 可启动。
- 本地 mock API 监听 `127.0.0.1:3001` 被当前沙箱 `EPERM` 拦截，无法提供可控预警数据。
- in-app Browser 随后拒绝访问 `127.0.0.1:3000`，因此本轮没有完成截图级 UI 验证。
- 结束时尝试停止 dev server，但沙箱内 `kill` 被拒绝，提权审批两次超时；如 3000 端口仍被占用，可手动停止对应 Vite 进程。

### 下一项建议

按 `docs/next-agent-todos.md` 推荐顺序，下一项进入 `P0-02 HTTPS 与域名生产化`。这是部署/文档任务，不要和业务功能混做。

---

## 2026-05-30 — 完成 P1-05 移植风险规则抽离与报告接入

### 今日完成

1. **先补移植风险规则回归测试**
   - 新增 `src/frontend/src/services/transplantRisk/rules.test.ts`：
     - 覆盖肌酐较个人基线 `>10%` warning、`>25%` critical。
     - 覆盖最近 3 次肌酐连续上升 warning。
     - 覆盖他克莫司低于/高于医生目标范围时只提示复核，不建议调药。
     - 覆盖缺失字段输出“建议补充数据”，不把缺失当正常。
     - 覆盖文案不包含“疑似排异 / 排异 / 感染 / 药物毒性 / 建议调药 / 调整剂量”。
   - 新增 `src/backend/src/tests/transplant-risk.test.ts`：
     - 覆盖后端同一套阈值、缺失字段、免责声明和医学安全文案。
     - 覆盖 PDF 医生摘要会写入移植专项提示、趋势偏移、他克莫司医生目标范围，并保持无诊断/调药措辞。
   - 更新 `src/frontend/src/services/insights/engine.test.ts`：
     - 覆盖健康洞察会生成 `type: 'transplant'` 的移植专项摘要。

2. **前端规则模块抽离并接入页面**
   - 新增 `src/frontend/src/services/transplantRisk/rules.ts`：
     - 统一输入：用户类型、移植时间、个人基线肌酐、他克莫司医生目标范围、最近记录列表。
     - 统一输出：`level`、`tone`、`title`、`message`、`suggestedAction`、`missingFields`、`disclaimer`。
     - 缺失字段包括个人基线肌酐、肌酐、eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、他克莫司、他克莫司目标范围、BK/CMV/EBV 病毒载量。
   - `src/frontend/src/pages/Dashboard.tsx`
     - 移除页面内原有 `getTransplantRiskReminder()` 逻辑，改为调用规则模块。
     - Dashboard 趋势数据映射为规则模块统一的 `recordDate` 输入。
   - `src/frontend/src/pages/HealthInsights.tsx`
     - 拉取用户档案，把移植时间、个人基线和他克莫司目标范围传入洞察引擎。
     - 新增“移植专项摘要”分组。
   - `src/frontend/src/services/insights/engine.ts` / `types.ts`
     - 洞察报告新增 `transplant` 类型，复用统一规则输出。

3. **后端规则模块抽离并接入预警/PDF**
   - 新增 `src/backend/src/services/transplant-risk.service.ts`，与前端保持同一阈值和医学边界。
   - `src/backend/src/services/alert.service.ts`
     - 移除旧的页面/服务内肌酐基线规则，改为复用 `analyzeTransplantRisk()`。
     - 取最近 3 条健康记录传入统一规则，支持连续 3 次肌酐上升 warning。
     - 他克莫司血药浓度预警文案改为核对采血时间和目标范围，不再出现调药建议。
   - `src/backend/src/services/report.service.ts`
     - PDF 医生摘要接入移植专项提示、建议动作、趋势偏移、缺失字段清单和医生目标范围。
     - 报告指标列表补充 eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV 病毒载量。

### 验证

- 后端回归测试通过：
  ```bash
  cd src/backend && npm test
  ```
- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 前端单测通过：
  ```bash
  cd src/frontend && npm test -- --run --pool forks
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
  Vite 仍提示主 chunk 大于 500 kB，为既有体积提醒。
- 医学安全文案扫描通过：
  ```bash
  rg -n "疑似排异|排异|感染|药物毒性|建议调药|调整剂量" src/frontend/src src/backend/src
  ```
  仅命中测试用例中的禁用词断言，运行代码未命中。

### 注意事项

- 一次普通 `cd src/frontend && npm test -- --run` 在 24 个测试全部通过后触发 Node/Vitest worker 的 V8 fatal 悬挂；改用 `--pool forks` 后干净通过。若后续复现，优先使用 forks pool 或升级 Vitest/Node 组合。
- 移植风险规则仍只输出复查、联系移植医生、按医嘱处理等行动提示；不要加入排异、感染、药物毒性等诊断结论，也不要建议自行调药。

### 下一项建议

进入 `P1-06 预警动作化`：让 Dashboard 和 Alerts 页基于 `recordId`、`metric`、`medicationId` 等字段展示“查看记录 / 查看用药 / 生成报告 / 标为已读”等动作。

---

## 2026-05-30 — 完成 P1-04 健康记录字段扩展 migration

### 今日完成

1. **先补字段扩展回归测试**
   - 更新 `src/backend/src/tests/health-record-validation.test.ts`：
     - 覆盖 `heartRate` 必须为整数。
     - 覆盖 `urineOccultBlood` 必须为字符串。
     - 使用 Prisma 方法 mock 验证创建记录可接收 `heartRate`、`egfr`、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV 病毒载量。
     - 验证趋势白名单允许查询 `heartRate`、`egfr`、尿蛋白/肌酐比和病毒载量等数值字段。
   - 更新前端 Vitest：
     - `src/frontend/src/services/healthRecordFields.test.ts` 覆盖正式 `heartRate` 字段、新增移植监测字段、旧 notes 心率兜底展示。
     - `src/frontend/src/services/transplantProfile.test.ts` 覆盖他克莫司医生目标范围进入 ProfileEdit payload。
     - `src/frontend/src/services/insights/engine.test.ts` 覆盖心率、eGFR、尿蛋白/肌酐比、BK 病毒载量仅生成趋势，不生成异常诊断。

2. **新增 Prisma 字段和 migration**
   - `src/backend/prisma/schema.prisma`
     - `HealthRecord` 新增：
       - `heartRate Int?`
       - `egfr Float?`
       - `urineProteinCreatinineRatio Float?`
       - `urineAlbuminCreatinineRatio Float?`
       - `urineOccultBlood String?`
       - `bkVirusCopies Float?`
       - `cmvVirusCopies Float?`
       - `ebvVirusCopies Float?`
     - `UserProfile` 新增：
       - `tacrolimusTargetMin Float?`
       - `tacrolimusTargetMax Float?`
   - 新增 migration：
     - `src/backend/prisma/migrations/20260530122000_add_transplant_monitoring_fields/migration.sql`
   - `npx prisma generate` 已成功。

3. **后端 API 数据通路补齐**
   - `src/backend/src/services/health-record.service.ts`
     - 健康记录白名单加入新增数值字段。
     - `heartRate` 加入整数字段校验。
     - `urineOccultBlood` 作为文本字段校验，不进入趋势查询。
     - `getTrends()` 可查询新增数值字段。
     - `getRecentMetrics()` 补充 eGFR、尿蛋白/肌酐比、心率等最近指标候选。
   - `src/backend/src/controllers/health-record.controller.ts`
     - 创建记录改为把完整 body 交给 service 白名单清洗，避免新增字段被 controller 丢弃。
   - `src/backend/src/services/user.service.ts` / `src/backend/src/controllers/user.controller.ts`
     - 用户档案读取/更新支持 `tacrolimusTargetMin` / `tacrolimusTargetMax`。
     - 若上下限同时填写且下限高于上限，返回业务错误。
   - `src/backend/src/services/dashboard.service.ts`
     - Dashboard 用户信息返回他克莫司目标范围字段。

4. **前端录入、详情、趋势和洞察接入**
   - `src/frontend/src/services/healthRecordFields.ts`
     - 日常指标中心率改为正式 `heartRate` 字段；旧 notes 中的 `心率：72次/分` 仍可兜底读取。
     - 化验字段新增 eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV 病毒载量。
     - 保存时不再把新心率写回 notes，但会清理旧心率备注行。
   - `src/frontend/src/components/health/HealthRecordForm.tsx`
     - 支持文本字段（尿潜血）和新增数值字段。
   - `src/frontend/src/pages/RecordDetail.tsx`
     - 心率优先读正式字段，空时再读 notes。
   - `src/frontend/src/pages/Dashboard.tsx` / `src/frontend/src/pages/Charts.tsx`
     - 趋势指标池加入心率、eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、BK/CMV/EBV。
     - 移植用户核心指标改为肌酐、eGFR、他克莫司；推荐指标加入尿蛋白和病毒载量。
   - `src/frontend/src/services/insights/*`
     - 新增字段进入本地洞察趋势序列。
     - eGFR、尿蛋白/肌酐比、病毒载量、心率均标记为 trend-only，不按通用参考范围生成异常结论。
   - `src/frontend/src/pages/ProfileEdit.tsx` / `src/frontend/src/pages/Profile.tsx`
     - 移植档案可填写并展示医生配置的他克莫司目标范围。

### 验证

- Prisma schema 校验通过：
  ```bash
  cd src/backend && npx prisma validate
  ```
- Prisma Client 生成通过：
  ```bash
  cd src/backend && npx prisma generate
  ```
- 后端回归测试通过：
  ```bash
  cd src/backend && npm test
  ```
- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 前端单测通过：
  ```bash
  cd src/frontend && npm test -- --run
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
  Vite 仍提示主 chunk 大于 500 kB，为既有体积提醒。
- 本地数据库迁移：
  - `npx prisma migrate dev --name add-transplant-monitoring-fields` 和 `npx prisma migrate status` 当前在本机 `health_monitoring` 库上返回 `Schema engine error:` 空错误。
  - 已使用同一份 migration SQL 通过 `psql` 事务应用到本地库，并写入 `_prisma_migrations`。
  - 已确认 `health_records` 存在 8 个新增字段，`user_profiles` 存在 `tacrolimusTargetMin` / `tacrolimusTargetMax`。

### 下一项建议

进入 `P1-05 移植风险规则抽离与报告接入`。新增字段已经可记录和趋势展示，但风险提示仍只应做“复查 / 联系医生 / 按医嘱处理”，不要输出诊断结论。

---

## 2026-05-30 — 完成 P1-03 移植用户个人基线引导

### 今日完成

1. **先补移植档案引导回归测试**
   - 新增 `src/frontend/src/services/transplantProfile.test.ts`。
   - 覆盖：
     - 移植用户 onboarding payload 会携带可选 `baselineCreatinine`。
     - 基线肌酐可留空，不阻塞初始化。
     - Dashboard 仅在移植用户缺少基线时展示“填写个人基线”CTA。
     - Profile 健康档案能区分移植时间和基线肌酐是否已填写。
     - ProfileEdit 能把后端日期和数值字段归一化为表单值。

2. **移植用户 onboarding 增加基线肌酐**
   - 文件：
     - `src/frontend/src/pages/Onboarding.tsx`
     - `src/frontend/src/services/transplantProfile.ts`
     - `src/frontend/src/services/api.ts`
     - `src/frontend/src/stores/authStore.ts`
   - 移植用户在基本信息步骤可选填写“稳定期基线肌酐 (μmol/L)”。
   - 文案明确“不确定可稍后补充；报告会更有参考价值”，不强制必填。
   - `authApi.completeOnboarding()` 和 authStore 类型补充 `baselineCreatinine`。

3. **Dashboard 与 Profile 增加补充入口**
   - `src/frontend/src/pages/Dashboard.tsx`
     - 移植用户缺少基线时，在现有基线提示卡中展示“填写个人基线”按钮。
     - 点击跳转 `/profile/edit#disease-info`。
   - `src/frontend/src/pages/Profile.tsx`
     - 健康档案区域新增“移植随访资料”状态块。
     - 显示移植时间、基线肌酐是否已填写，并提供补充入口。

4. **ProfileEdit 改用统一 API 层**
   - `src/frontend/src/pages/ProfileEdit.tsx`
     - `fetch('/api/users/profile')` 已替换为 `userApi.getProfile()` / `userApi.updateProfile()`。
     - 401 可走 axios 统一拦截并触发登录过期处理。
     - 保存后同步 authStore 的 `name`、`userType`、`primaryDisease`、`onboardingCompleted`，避免首页仍显示旧档案字段。
     - 疾病信息区域加 `id="disease-info"`，支持 Dashboard/Profile CTA 定位。

5. **后端 onboarding 字段通路补齐**
   - `src/backend/src/controllers/user.controller.ts`
     - `completeOnboarding` 补传 `baselineCreatinine` 到已存在的 `userService.completeOnboarding()`。
   - 不新增数据库字段、不新增 migration。

### 验证

- 前端单测通过：
  ```bash
  cd src/frontend && npm test -- --run
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 后端回归测试通过：
  ```bash
  cd src/backend && npm test
  ```
  构建仍有 Vite chunk size 提醒，为既有体积提示，本次未处理。

### 下一项建议

按 `docs/next-agent-todos.md` 推荐顺序，下一项进入 `P1-04 健康记录字段扩展 migration`。

---

## 2026-05-30 — 完成 P1-02 统一健康记录录入体验

### 今日完成

1. **先补统一表单回归测试**
   - 新增 `src/frontend/src/services/healthRecordFields.test.ts`。
   - 覆盖：
     - 日常 / 化验 / 全量模式字段顺序。
     - Dashboard 快捷入口仅显示体重、尿量或血压对应字段。
     - 他克莫司 placeholder 不再出现固定 `5-15`。
     - 心率从 `notes` 中提取，保存时写回 `心率：72次/分`。
     - 编辑时清空心率不会丢失其他备注。
     - 最近记录和详情页使用同一摘要逻辑。

2. **抽统一字段配置与表单组件**
   - 新增：
     - `src/frontend/src/services/healthRecordFields.ts`
     - `src/frontend/src/components/health/HealthRecordForm.tsx`
   - 字段配置统一为：
     - 日常指标：体重、尿量、收缩压、舒张压、心率。
     - 化验指标：肌酐、尿素氮、血钾、血钠、血磷、血红蛋白、血糖、尿酸、他克莫司。
   - `HealthRecordForm` 支持 `mode=daily | lab | full` 和 `quickType=weight | bloodPressure | urineVolume`。
   - 心率仍按临时方案写入 `HealthRecord.notes`，未新增数据库字段。

3. **接入页面**
   - `src/frontend/src/pages/Records.tsx`
     - 内嵌手动录入改为复用 `HealthRecordForm`。
     - 保存成功后刷新最近记录。
   - `src/frontend/src/pages/RecordForm.tsx`
     - 新建、Dashboard 快捷入口、编辑页复用同一表单组件。
     - 快捷入口只显示对应字段，保存后仍回到 Dashboard。
   - `src/frontend/src/pages/RecordDetail.tsx`
     - 使用同一字段配置展示指标。
     - 心率从 notes 中单独展示，备注区域只显示非心率内容。
     - 他克莫司不再显示固定 `5-15` 参考范围，改为“以移植医生设定目标范围为准”。

### 验证

- 前端单测通过：
  ```bash
  cd src/frontend && npm test -- --run
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
  构建仍有 Vite chunk size 提醒，为既有体积提示，本次未处理。

### 下一项建议

按 `docs/next-agent-todos.md` 推荐顺序，下一项进入 `P1-03 移植用户个人基线引导`。

---

## 2026-05-30 — 完成 P1-01 健康洞察接入日常数据

### 今日完成

1. **先补健康洞察回归测试**
   - 新增 `src/frontend/src/services/insights/engine.test.ts`。
   - 测试先覆盖并复现原缺口：
     - `HealthRecord.records` 中的血压、尿量、血糖应生成趋势洞察。
     - 血钾 `critical` 异常检测不能被破坏。
     - 他克莫司只能生成趋势提示，不能被固定通用范围判异常。
     - 摘要中应出现最近 14 天血压记录天数和尿量记录不足提示。
   - 初次运行失败 3 项，确认测试能钉住本次需求。

2. **洞察引擎接入日常数据**
   - 文件：
     - `src/frontend/src/services/insights/types.ts`
     - `src/frontend/src/services/insights/engine.ts`
     - `src/frontend/src/services/insights/referenceRanges.ts`
     - `src/frontend/src/services/insights/ruleEngine.ts`
     - `src/frontend/src/services/insights/summaryGenerator.ts`
   - `MetricKey` 扩展 `bloodSugar`、`urineVolume`、`tacrolimus`。
   - `AnalysisInput.records` 补齐血压、尿量、血糖、他克莫司字段。
   - `extractMetricSeries()` 直接从健康记录中提取：
     - `bloodPressureSystolic` → `systolic`
     - `bloodPressureDiastolic` → `diastolic`
     - `urineVolume`
     - `bloodSugar`
     - `tacrolimus`
   - 保留可选 `checkIns` 兼容旧入口，但 `HealthInsights.tsx` 不再构造空数组。

3. **医学安全边界**
   - 他克莫司在参考范围配置中标记为 `trendOnly`，仅展示趋势和“以移植医生设定目标范围为准”的提示。
   - 不输出排异、感染、药物毒性等诊断结论，也不建议调药。
   - 血压、尿量、血糖加入通用参考标记，仅用于数据标记和复诊查看提醒。

4. **测试入口修正**
   - `src/frontend/vite.config.ts` 增加 Vitest include/exclude。
   - `npm test -- --run` 不再误收 Playwright 的 `e2e/*.spec.ts`；E2E 仍通过 `npm run test:e2e` 单独运行。

### 验证

- 前端单测通过：
  ```bash
  cd src/frontend && npm test -- --run
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
  构建仍有 Vite chunk size 提醒，为既有打包体积提示，本次未处理。

### 下一项建议

按 `docs/next-agent-todos.md` 推荐顺序，下一项进入 `P1-02 统一健康记录录入体验`。

---

## 2026-05-30 — 完成 P1-08 健康记录输入校验与趋势指标白名单

### 今日完成

1. **健康记录创建/更新输入校验**
   - 文件：
     - `src/backend/src/services/health-record.service.ts`
     - `src/backend/src/utils/validators.ts`
   - 新增健康记录字段白名单，仅允许 `recordDate`、备注和已支持的健康指标写入。
   - 更新记录不再把 `req.body` 原样透传给 Prisma，未知字段会返回明确 `400`。
   - 指标值统一走 `validateMetricRange()`，并补充他克莫司录入安全上限校验。该范围只用于拦截明显非法录入，不作为医学目标范围。
   - 血压、尿量等整数字段会拒绝小数。

2. **日期校验收紧**
   - `isValidDate()` 改为严格校验 `YYYY-MM-DD`，例如 `2026-02-31` 会被拒绝。
   - 健康记录列表和趋势接口都会校验日期范围，开始日期晚于结束日期会返回 `400`。

3. **趋势指标白名单**
   - 趋势接口仅允许查询当前 `HealthRecord` 中支持的 13 个指标：
     `creatinine`、`urea`、`potassium`、`sodium`、`phosphorus`、`uricAcid`、`hemoglobin`、`bloodSugar`、`weight`、`bloodPressureSystolic`、`bloodPressureDiastolic`、`urineVolume`、`tacrolimus`。
   - 未知趋势指标会在 Prisma 查询前返回明确 `400`，不再暴露 Prisma schema 错误。
   - `src/backend/src/controllers/health-record.controller.ts` 对非字符串趋势查询参数增加格式校验。

4. **补充自动化测试与 TDD 规则**
   - 新增 `src/backend/src/tests/health-record-validation.test.ts`，覆盖非法日期、非法指标值、整数字段、小字段白名单、列表指标白名单和趋势指标白名单。
   - `src/backend/package.json` 的 `npm test` 改为运行本次健康记录校验回归测试，避免继续指向当前不可用的 `jest`。
   - 后续每个任务都必须补自动化测试或先写失败测试，再做实现。

### 验证

- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 后端测试通过：
  ```bash
  cd src/backend && npm test
  ```
  覆盖项包括：
  - 未知趋势指标 `badMetric` 返回 `400 / 不支持的趋势指标`。
  - 非法日期 `2026-02-31` 返回 `400 / 开始日期格式错误`。
  - 非法血钾值 `99` 返回 `400 / 血钾不能大于20`。
  - 未知创建/更新字段返回 `400 / 不支持的字段`。

### 下一项建议

按 `docs/next-agent-todos.md` 推荐顺序，下一项进入 `P1-01 健康洞察接入日常数据`。

---

## 2026-05-30 — 会话交接：日期/时区统一待本地复测与提交

### 当前 Git 状态

- 当前分支：`main`
- 最新已提交 commit：
  - `92b81ef fix: use redis for auth rate limits`
  - `6dff686 fix: store verification codes in redis`
  - `2817e5a fix: harden refresh token rotation`
- 当前仍有**未提交改动**，全部属于 `P1-07 日期/时区工具统一`，不是用户的无关改动，后续 agent 不要回滚。

### 未提交改动范围（P1-07）

1. **新增统一日期工具**
   - `src/backend/src/utils/app-date.ts`
     - 应用时区：`Asia/Shanghai`
     - 提供应用日期、应用时间点、应用日期窗口、`@db.Date` date-only 值、首页展示日期等工具。
     - 特别区分：
       - `getAppDateTime()`：用于真实时间点，带 `+08:00`。
       - `getDateOnlyValue()` / `getDateOnlyRange()`：用于 Prisma `@db.Date` 字段，存 UTC 零点 date-only，避免把 `+08:00` 时间点误写入 date-only 字段。
   - `src/frontend/src/utils/appDate.ts`
     - 提供前端应用日期、日期窗口、跨应用午夜刷新、旧后端 `scheduledAt` 兜底、日期展示等工具。

2. **后端改动**
   - `src/backend/src/services/medication.service.ts`
     - 复用统一应用日期工具。
     - 用药统计按 Asia/Shanghai 日期范围查询。
   - `src/backend/src/services/alert.service.ts`
     - 复用统一应用日期工具。
   - `src/backend/src/services/dashboard.service.ts`
     - 今日打卡按应用日期查询。
     - 问候语和首页日期按 Asia/Shanghai。
   - `src/backend/src/services/health-record.service.ts`
     - 健康记录 date-only 字段使用 `getDateOnlyValue()` / `formatDateOnly()`。
     - 趋势查询 date-only 范围不再直接 `new Date(startDate)`。
   - `src/backend/src/services/drug-concentration.service.ts`
     - 血药浓度记录 date-only 字段使用统一工具。
     - 关联用药日志按应用日期时间范围查询，日志日期/时间按应用时区展示。
   - `src/backend/src/services/ocr.service.ts`
     - OCR 默认报告日期改为应用日期。
     - OCR 确认保存使用 date-only 工具。
   - `src/backend/src/services/user.service.ts`
     - 档案中的生日、诊断日期、移植日期使用 date-only 工具读写。
   - `src/backend/src/controllers/report.controller.ts`
     - 默认近 30 天报告区间改为应用日期窗口。
   - `src/backend/src/services/report.service.ts`
     - 报告日期校验和 alert 日期展示使用统一日期工具。

3. **前端改动**
   - `src/frontend/src/pages/Dashboard.tsx`
     - 趋势查询窗口改为应用日期。
     - 跨午夜刷新按 Asia/Shanghai 下一天 00:00:05。
     - 旧后端 `scheduledAt` 兜底复用统一工具。
   - `src/frontend/src/pages/Medications.tsx`
     - 旧后端 `scheduledAt` 兜底复用统一工具。
   - `src/frontend/src/pages/Charts.tsx`
     - 趋势查询窗口改为应用日期。
   - `src/frontend/src/pages/HealthInsights.tsx`
     - 数据拉取窗口和 medication log 日期改为应用日期。
   - `src/frontend/src/pages/Profile.tsx`
     - 近 30 天报告区间和移植后天数计算改为应用日期。
   - `src/frontend/src/pages/Records.tsx`
     - 默认记录日期和短日期展示改为应用日期工具。
   - `src/frontend/src/pages/RecordForm.tsx`
     - 默认记录日期改为应用日期。
   - `src/frontend/src/pages/OCRUpload.tsx`
     - 默认报告日期改为应用日期。
   - `src/frontend/src/pages/RecordDetail.tsx`
     - `YYYY-MM-DD` 展示不再通过 `new Date()`，避免非北京时间设备显示前一天。
   - `src/frontend/src/pages/Alerts.tsx`
     - 消息时间按 Asia/Shanghai 展示。
   - `src/frontend/src/services/insights/trendAnalyzer.ts`
     - 洞察趋势窗口按应用日期计算。

### 已完成验证

- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
- 日期/时区 smoke test 通过：
  - `2026-05-28T15:59:00Z` → `2026-05-28`
  - `2026-05-28T16:01:00Z` → `2026-05-29`
  - `getAppDateWindow(30, '2026-05-29')` → `2026-04-29` 至 `2026-05-29`
- 搜索确认主要旧问题入口已清理：
  - 前后端业务代码里不再有直接用 `new Date().toISOString().split('T')[0]` 生成当前业务日期。
  - 剩余 `toISOString().split('T')[0]` 仅在 `utils/app-date.ts` 的 date-only 格式化工具内部。

### 下次开启新会话建议动作

1. 先执行 `git status --short`，确认未提交改动仍是本条记录列出的 `P1-07` 范围。
2. 如果用户已经本地测试通过，提交这些未提交改动，建议提交信息：
   ```bash
   fix: unify app date timezone handling
   ```
3. 若用户还未测试，优先协助本地复测 Dashboard 今日打卡、趋势图、健康洞察、报告导出、用药列表/服药记录。
4. `P1-07` 测试/提交完成后，下一项开发直接进入：
   - `P1-08 健康记录输入校验与趋势指标白名单`
   - 重点文件：`src/backend/src/services/health-record.service.ts`、`src/backend/src/controllers/health-record.controller.ts`、`src/backend/src/utils/validators.ts`
   - 验收：非法日期、非法数值、未知趋势指标都返回明确 400，不暴露 Prisma 错误。

---

## 2026-05-29 — 代码审计待办补充 + OCR 所有权修复 + Refresh Token 加固 + Redis 验证码/限流 + 日期时区统一

### 今日完成

1. **补充下一轮开发待办**
   - 更新 `docs/next-agent-todos.md`：
     - 将 2026-05-28 代码审计发现的问题整理为可执行任务包。
     - 调整推荐执行顺序，当前建议下一步优先：
       1. `P1-08 健康记录输入校验与趋势指标白名单`
       2. `P1-01 健康洞察接入日常数据`
       3. `P1-02 统一健康记录录入体验`
   - 新增/更新待办覆盖：
     - Refresh Token 签名验证与轮换加固已于本日完成。
     - 验证码 Redis 存储已于本日完成。
     - 生产限流 Redis/共享存储已于本日完成。
     - 日期/时区工具统一已于本日完成。
     - 健康记录创建/更新与趋势 metrics 需要输入校验和白名单。
     - 他克莫司固定 `5-15 ng/mL` 仍残留在 `RecordForm.tsx`、`RecordDetail.tsx`、`drug-concentration.service.ts`。
     - `ProfileEdit.tsx` 仍直接 `fetch('/api/users/profile')`，需改用统一 `userApi`。
     - 后端 `npm test` 当前不可用，Worker Dockerfile 启动路径也需整理。

2. **修复 OCR 识别接口所有权校验**
   - 问题：
     - `src/backend/src/services/ocr.service.ts` 的 `recognizeImage(imageId)` 只按 `imageId` 查询 `LabReport`。
     - `src/backend/src/controllers/ocr.controller.ts` 已拿到当前登录 `userId`，但没有传给服务层。
     - 结果是：如果用户猜到或拿到别人的 `imageId`，理论上可以触发识别不属于自己的图片。
   - 修复：
     - `src/backend/src/controllers/ocr.controller.ts`
       - 调用改为 `ocrService.recognizeImage(userId, imageId)`。
     - `src/backend/src/services/ocr.service.ts`
       - 签名改为 `recognizeImage(userId: string, imageId: string)`。
       - 查询改为 `findFirst({ where: { id: imageId, userId } })`。
   - 结果：
     - 不属于当前用户的 `imageId` 会按“不存在”处理，与 `getOCRResult()` / `confirmOCRResult()` 的所有权校验保持一致。

3. **完成 `P0-04 Refresh Token 签名验证与轮换加固`**
   - 问题：
     - `src/backend/src/services/auth.service.ts` 的刷新逻辑手动 base64 解 payload 后查 DB，没有先做 JWT 签名验证。
     - 旧 refresh token 没有 token 类型声明，刷新接口无法明确区分 access / refresh token。
   - 修复：
     - `src/backend/src/utils/jwt.ts`
       - access token 新增 `type: "access"`，refresh token 新增 `type: "refresh"`。
       - `verifyAccessToken()` 校验 token 类型，拒绝 refresh token 冒用 access token。
       - `verifyRefreshToken()` 改为先 `jwt.verify()` 校验签名，再校验 `type`、`userId`、`jti`、DB 记录、用户一致性、过期和吊销状态。
       - `revokeRefreshToken()` 改为幂等 `updateMany`，避免登出时因重复吊销抛 Prisma 异常。
     - `src/backend/src/services/auth.service.ts`
       - `refreshTokens()` 复用 `verifyRefreshToken()`。
       - 先校验用户存在且状态为 `active`，再原子吊销旧 token 并签发新 token。
       - 并发或重复使用旧 refresh token 时，旧 token 只能成功轮换一次。
       - `logout()` 不再手动解 payload，只吊销通过签名验证且属于当前用户的 refresh token。
   - 注意：
     - 部署后，旧版未带 `type: "refresh"` 的 refresh token 会刷新失败，用户可能需要重新登录；这是本次安全加固的预期结果。

4. **完成 `P0-01 生产 Redis 验证码存储`**
   - 问题：
     - `src/backend/src/services/auth.service.ts` 使用进程内 `Map` 保存验证码，后端重启或多实例部署会导致未过期验证码失效或不共享。
     - 开发/模拟短信路径会把验证码写入日志，不符合安全清单。
   - 修复：
     - 新增 `src/backend/src/config/redis.ts`
       - 提供懒连接 Redis client。
       - 生产环境要求 `REDIS_URL` 可用，连接失败会抛错；开发环境 Redis 不可用时回退内存存储。
     - 新增 `src/backend/src/services/verification-code-store.ts`
       - 提供 `setVerificationCode()` / `getVerificationCode()` / `deleteVerificationCode()`。
       - Redis key 按 `phone + type` 做 SHA-256 后缀，不把明文手机号直接写入 key。
       - Redis TTL 与验证码有效期一致；内存 fallback 也会按 `expiresAt` 清理。
     - `src/backend/src/services/auth.service.ts`
       - 发送频率检查改为读取验证码 store。
       - 验证码保存改为写入 Redis/store。
       - 注册、重置密码验证成功后立即删除验证码。
       - 非生产且未配置短信服务时，保留“先请求验证码，再输入任意合法 6 位码”的本地测试体验。
     - `src/backend/src/services/notification.service.ts`
       - 生产环境未配置短信服务时明确报错。
       - 模拟短信和开发 fallback 不再把 OTP 明文写入日志。
     - 更新 `.env.example`、`src/backend/.env.example`、`docs/quick-deploy.md`、`docs/next-agent-todos.md`。

5. **完成 `P0-05 生产限流改为 Redis/共享存储`**
   - 问题：
     - `src/backend/src/middleware/security.middleware.ts` 的 `rateLimitBuckets` 使用进程内 `Map`，多实例部署时验证码/登录/刷新等认证限流不共享。
     - 后端重启会清空限流桶，攻击流量可绕过固定窗口计数。
   - 修复：
     - `createRateLimiter()` 在生产环境改用 Redis 固定窗口限流。
       - 使用 Redis Lua 脚本原子执行 `INCR` + `PTTL` / `PEXPIRE`，保持原有窗口语义。
       - 超限时继续返回 `429`，并设置 `Retry-After`。
       - Redis key 对 `method + route + identity` 做 SHA-256，不把明文手机号/IP 写入 key。
     - 开发环境继续使用内存 Map，保持本地启动成本低。
     - 生产环境 Redis 不可用时返回 `503`，不会静默回退或放行。

6. **完成 `P1-07 日期/时区工具统一`**
   - 问题：
     - 用药模块和预警模块各自复制 Asia/Shanghai 日期工具。
     - Dashboard 今日打卡、趋势查询、健康洞察、报告默认区间和部分前端表单默认日期仍使用 UTC `toISOString().split('T')[0]`。
     - 部分日期展示用 `new Date('YYYY-MM-DD')`，在非北京时间设备上可能显示成前一天。
   - 修复：
     - 后端新增 `src/backend/src/utils/app-date.ts`
       - 统一 `getAppDateString()`、`getAppDateTime()`、`addAppDays()`、`getAppDateRange()`。
       - 对数据库 `@db.Date` 另提供 `getDateOnlyValue()` / `getDateOnlyRange()`，避免把 `+08:00` 时间点误用于 date-only 字段。
     - 前端新增 `src/frontend/src/utils/appDate.ts`
       - 统一应用日期、日期窗口、跨应用午夜刷新、旧后端 `scheduledAt` 兜底和日期展示。
     - 更新后端：
       - `medication.service.ts`、`alert.service.ts` 复用统一工具。
       - `dashboard.service.ts` 今日打卡按应用日期查询，问候语和首页日期按应用时区。
       - `health-record.service.ts`、`drug-concentration.service.ts`、`ocr.service.ts`、`user.service.ts`、`report.controller.ts`、`report.service.ts` 使用 date-only 工具处理日期字段。
     - 更新前端：
       - Dashboard、Charts、HealthInsights、Profile、Records、RecordForm、OCRUpload、RecordDetail、Alerts 和洞察趋势窗口改用应用日期工具。

### 验证情况

- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 验证码 store smoke test 通过：
  - 开发环境 Redis 不可用时，可快速回退内存，`set/get/delete` 正常。
  - 生产环境 Redis 不可用时，返回 `AppError(statusCode=503, code=01011)`，不会静默回退内存。
- 限流 smoke test 通过：
  - 开发环境同一 key 第三次请求返回 `429`，前两次正常进入 `next()`。
  - 生产环境 Redis 不可用时返回 `503`，不会进入 `next()`。
- 日期/时区 smoke test 通过：
  - `2026-05-28T15:59:00Z` → `2026-05-28`
  - `2026-05-28T16:01:00Z` → `2026-05-29`
  - `getAppDateWindow(30, '2026-05-29')` → `2026-04-29` 至 `2026-05-29`
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```

### 当前注意点 / 下次优先

1. **下一个任务建议先做 `P1-08 健康记录输入校验与趋势指标白名单`**
   - 健康记录创建/更新仍需要统一数值范围校验。
   - 趋势 metrics 仍需白名单，避免未知字段触发 Prisma 错误。

2. **生产化 P0 仍未完成**
   - 文档要求 HttpOnly Cookie，但前端实际使用 localStorage 存 token；这是后续安全加固方向。

3. **不要回滚已有未提交改动**
   - 本轮仅涉及：
     - `docs/next-agent-todos.md`
     - `docs/dev-log.md`
     - `src/backend/src/controllers/ocr.controller.ts`
     - `src/backend/src/services/ocr.service.ts`
     - `src/backend/src/services/auth.service.ts`
     - `src/backend/src/utils/jwt.ts`
     - `src/backend/src/config/redis.ts`
     - `src/backend/src/services/verification-code-store.ts`
     - `src/backend/src/services/notification.service.ts`
     - `src/backend/package.json`
     - `.env.example`
     - `src/backend/.env.example`
     - `docs/quick-deploy.md`
     - `src/backend/src/middleware/security.middleware.ts`
     - `src/backend/src/utils/app-date.ts`
     - `src/frontend/src/utils/appDate.ts`
     - 日期/时区统一涉及的前后端页面与服务文件
   - 工作区原本已有 Dashboard、Charts、Profile、dashboardStore、alert/dashboard/report service 等移植风险与报告相关改动。后续 agent 应基于现有状态继续开发，不要误认为这些都是本轮 OCR 修复产生的改动。

---

## 2026-05-18 — 指标趋势分层 + 肾移植术后基线风险提示 + 复诊报告展示优化

### 今日完成

1. **Dashboard 指标趋势交互重构**
   - 背景：
     - 旧版“更多/收起”会在手机端一次露出过多指标，用户反馈交互不理想。
     - 肾移植术后用户不能只看通用正常范围，更应该看个人基线、趋势偏移和红旗规则。
   - 前端改动：
     - `src/frontend/src/pages/Dashboard.tsx`
       - 新增 `MetricScope = core | recommended | all`。
       - 新增 `METRIC_SCOPE_OPTIONS`，将趋势指标切换改成“核心 / 推荐 / 全部”三段式。
       - 默认只选核心指标，不再默认选中一大组推荐指标。
       - `getRecommendedMetrics()` 扩展原发病差异：
         - 糖尿病肾病：肌酐、尿素氮、血钾、血糖、体重、血红蛋白。
         - 高血压肾病：肌酐、尿素氮、血钾、收缩压、舒张压、体重。
         - 慢性肾小球肾炎：肌酐、尿素氮、血钾、尿量、体重、血红蛋白。
       - 肾移植用户核心指标改为：肌酐、他克莫司、收缩压。
       - 新增趋势提醒文案：
         - 非移植用户：提示近 30 天缺少哪些核心指标，便于复诊前补齐。
         - 移植用户：提示趋势优先参考个人基线、连续变化、医生设定目标范围。
     - `src/frontend/src/pages/Charts.tsx`
       - 与 Dashboard 同步“核心 / 推荐 / 全部”分层选择。
       - 移除他克莫司固定 `5-15 ng/mL` 参考范围，改为提示“必须以移植医生设定目标范围为准，请勿自行调药”。

2. **肾移植术后基线风险提示第一版**
   - 理论依据：
     - 肾移植术后不应设计成“单次化验值在范围内 = 安全”。
     - 第一版按“个人稳定基线 + 趋势变化 + 红旗规则”落地，暂不做排异、感染、药物毒性等诊断推断。
   - 后端改动：
     - `src/backend/src/services/dashboard.service.ts`
       - Dashboard API 的 `user` 对象新增：
         - `hasTransplant`
         - `transplantDate`
         - `baselineCreatinine`
     - `src/frontend/src/stores/dashboardStore.ts`
       - 同步扩展 Dashboard 用户类型。
   - 前端风险提示：
     - `Dashboard.tsx` 新增 `getTransplantRiskReminder()`：
       - 未填写 `baselineCreatinine`：灰色，提示先建立个人基线。
       - 近 30 天无肌酐记录：灰色，提示补充最近一次化验结果。
       - 最近肌酐较个人基线上升 `> 10%`：黄色，建议复查并观察趋势。
       - 最近肌酐较个人基线上升 `> 25%`：红色，建议尽快联系移植医生。
       - 最近 3 次肌酐连续上升：黄色，建议复诊时重点核对报告和用药情况。
       - 肌酐相对基线稳定：绿色，但仍提示血药浓度目标范围、病毒载量、尿蛋白需以医生配置和化验结果为准。
   - 后端预警规则：
     - `src/backend/src/services/alert.service.ts`
       - 原 `creatinine_rise` 单一 warning 规则拆成两档：
         - `creatinine_rise_warning`：肌酐较个人基线上升 `>10% 且 <=25%`，warning。
         - `creatinine_rise_critical`：肌酐较个人基线上升 `>25%`，critical。
       - 文案改为“建议复查/联系移植医生”，并明确“请勿自行调整免疫抑制剂”。
   - 重要限制：
     - 当前数据库还没有 `eGFR`、尿蛋白/肌酐比、尿白蛋白/肌酐比、BK/CMV/EBV 病毒载量、医生配置的他克莫司目标范围。
     - 因此本次只基于已有字段做安全的第一版，不假装能判断缺失指标。

3. **数据导出 / 分享给医生展示逻辑优化**
   - `src/frontend/src/pages/Profile.tsx`
     - 将“数据导出 / 分享给医生”从普通入口列表中独立出来，新增“近 30 天健康报告”卡片。
     - 普通用户展示报告内容：基础档案、关键指标、用药摘要、未读预警。
     - 肾移植用户展示报告内容：个人基线、趋势偏移、血药浓度、复诊提醒。
     - 说明文案强调：
       - 报告仅在用户主动操作时生成。
       - 分享调用当前设备系统分享面板，不会自动发送给任何人。
       - 导出报告不能替代医生诊断。
       - 移植报告中的他克莫司目标范围、病毒载量、尿蛋白仍需以医生医嘱和化验结果为准。
   - `src/backend/src/services/report.service.ts`
     - PDF 趋势图不再给他克莫司写死 `5-15 ng/mL` 参考范围。
     - 医生阅读摘要中：
       - 肾移植用户优先提示个人基线肌酐。
       - 若缺少基线肌酐，提示补充稳定期连续检查结果。
       - 明确免疫抑制药目标范围需由移植医生设定，本报告只整理记录和趋势，不提供调药建议。
     - PDF 免责声明新增：移植术后血药浓度、病毒载量、尿蛋白等目标范围请以移植医生医嘱为准。

### 涉及文件

- `src/frontend/src/pages/Dashboard.tsx`
- `src/frontend/src/pages/Charts.tsx`
- `src/frontend/src/pages/Profile.tsx`
- `src/frontend/src/stores/dashboardStore.ts`
- `src/backend/src/services/dashboard.service.ts`
- `src/backend/src/services/alert.service.ts`
- `src/backend/src/services/report.service.ts`

### 验证情况

- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 注意：
  - 之前尝试做截图级浏览器 QA 时，Browser 插件连接超时，Playwright Chromium 启动也超时；本次可靠验证是前后端 TypeScript/build 级验证。
  - 后续若要做渲染验证，可优先确认本机 Playwright/Chromium 是否能正常启动，再测 `/`、`/charts`、`/profile`。

### 当前注意点 / 下次优先

1. **肾移植风险提示仍是第一版**
   - 已支持：肌酐相对个人基线、连续 3 次趋势、他克莫司“目标范围由医生设定”的提示。
   - 未支持：eGFR、尿蛋白/肌酐比、尿白蛋白/肌酐比、尿潜血、BK/CMV/EBV、医生配置的他克莫司目标范围、移植术后阶段化监测频率。

2. **下一步建议**
   - Prisma migration 新增字段：
     - `HealthRecord.egfr`
     - `HealthRecord.urineProteinCreatinineRatio`
     - `HealthRecord.urineAlbuminCreatinineRatio`
     - `HealthRecord.urineOccultBlood`
     - `HealthRecord.bkVirusCopies`
     - `HealthRecord.cmvVirusCopies`
   - 新增用户/医生配置：
     - 他克莫司目标范围低值/高值。
     - 个人稳定基线计算：稳定期连续 3 次检查结果中位数。
   - 将移植风险规则抽到独立模块，例如：
     - `src/frontend/src/services/transplantRisk/`
     - 或后端 `src/backend/src/services/transplant-risk.service.ts`
   - 接入报告导出：把移植风险摘要、缺失指标提示、医生配置目标范围写入 PDF。

3. **医学红线**
   - 禁止自动建议调药。
   - 禁止输出“排异/感染/药物毒性”的诊断结论。
   - 只能提示“建议复查 / 联系移植医生 / 按医嘱处理”。

---

## 2026-04-25 — 用药提醒跨天修复 + 我的/用药/记录页面 UI 重构 + PDF 中文修复

### 今日完成

1. **修复用药提醒“点已服用后第二天不自动更新”**
   - 根因：
     - 旧逻辑由前端用浏览器日期拼 `scheduledTime`，后端用服务器本地日期查询今日记录，跨天/时区/页面未刷新时容易把昨天状态带到今天。
     - `recordMedication()` 每次点击都创建新 `MedicationLog`，没有同一分钟幂等更新。
   - 方案：
     - `src/backend/src/services/medication.service.ts`
       - 新增 `Asia/Shanghai` 日期工具：`getAppDateString()`、`getAppDateTime()`、`getAppDateRange()`。
       - `getTodayMedications()` 返回每条提醒的精确 `scheduledAt`（ISO），前端直接回传，不再自己猜日期。
       - `recordMedication()` 先查同用户/同药品/同一分钟 `MedicationLog`，存在则 update，不存在才 create。
       - `getMedicationLogs(date)` 改用同一套应用时区日界线。
       - `weekly` 频率改为按创建日差值 `% 7` 判断，避免服务器星期/时区漂移。
     - `src/frontend/src/pages/Dashboard.tsx`
       - `handleMarkTaken()` 改为接收整条 medication，使用 `scheduledAt`。
       - 新增跨午夜定时刷新 + 窗口重新聚焦刷新。
     - `src/frontend/src/pages/Medications.tsx`
       - 点击服用同样使用后端返回的 `scheduledAt`。
     - `src/frontend/src/stores/dashboardStore.ts`
     - medication 类型新增 `scheduledAt?: string`。

2. **修复消息中心不生成过期用药提醒**
   - 根因：
     - 旧逻辑依赖 `reminderWorker` 在提醒时间点创建 `MedicationLog(status=missed)`，消息中心只会把已有的 missed 日志转成预警。
     - 如果 worker 未运行、部署重启、或错过 08:00 这一轮扫描，晚上打开消息中心时没有任何补偿逻辑，因此不会出现提醒。
   - 方案：
     - `src/backend/src/services/alert.service.ts`
       - 新增 `syncMissedMedicationAlerts(userId)`。
       - 读取用户今日应服药计划，按 `Asia/Shanghai` 应用日期计算计划时间。
       - 对已超过计划时间 30 分钟且没有日志的项目自动创建 `MedicationLog(status=missed)`。
       - 对 missed 但没有预警的日志补建 medication warning alert，且通过日志关联避免重复预警。
       - `getAlerts()` 和 `getUnreadAlertCount()` 查询前都会先执行同步，首页红点和消息中心列表都会触发补账。
     - `checkMissedMedications()` 改为复用同一同步逻辑，保留 worker 入口兼容。

3. **修复线上点击“服用”提示成功但状态不变**
   - 线上复现：
     - `GET /api/medications/today` 返回的今日用药没有 `scheduledAt` 字段，说明线上后端仍是旧接口形态。
     - 前端用浏览器本地时区兜底生成 `2026-04-25T00:00:00.000Z` 后，`POST /medications/logs` 会返回成功，但旧后端今日列表实际按 `2026-04-25T08:00:00.000Z` 查找，所以仍显示 pending。
   - 方案：
     - `src/frontend/src/pages/Medications.tsx`
     - `src/frontend/src/pages/Dashboard.tsx`
     - 如果后端返回 `scheduledAt`，优先使用后端精确时间。
     - 如果旧后端没有 `scheduledAt`，前端兜底改为按 `Asia/Shanghai` 日期 + UTC 同一提醒时刻生成，例如 `08:00` → `2026-04-25T08:00:00.000Z`，兼容旧后端查询方式。

4. **“我的”页面重构 + 功能入口补齐**
   - `src/frontend/src/pages/Profile.tsx`
     - 改成截图风格：个人卡、健康档案摘要、功能入口列表。
     - 新增入口：数据导出、提醒设置、分享给医生、隐私与安全、帮助中心、意见反馈。
     - `数据导出`：生成近 30 天健康报告 PDF 并下载。
     - `分享给医生`：优先调用系统分享 API；不支持时自动下载 PDF。
   - 新增页面：
     - `src/frontend/src/pages/ReminderSettings.tsx` — 独立提醒设置页（消息通知、用药提醒管理、提前量说明、通知方式说明）。
     - `src/frontend/src/pages/PrivacySecurity.tsx` — 隐私政策入口 + 修改登录密码表单（调用 `/auth/change-password`）。
     - `src/frontend/src/pages/HelpCenter.tsx` — 使用指南 + 常见问题折叠问答。
   - `src/frontend/src/App.tsx`
     - 新增路由：`/reminder-settings`、`/privacy-security`、`/help-center`。
   - `src/frontend/src/services/api.ts`
     - 新增 `userApi.getProfile/updateProfile`、`authApi.changePassword`。

5. **报告导出 API + PDF 中文乱码修复**
   - 新增后端接口：
     - `src/backend/src/controllers/report.controller.ts`
     - `src/backend/src/routes/report.routes.ts`
     - `src/backend/src/server.ts` 挂载 `/reports`
   - `GET /reports/follow-up`
     - 默认导出近 30 天报告，也支持 `startDate` / `endDate`。
     - 返回 PDF 文件，响应头已加 `Cache-Control: no-store`，避免浏览器缓存旧乱码 PDF。
   - `src/backend/src/services/report.service.ts`
     - 使用 `pdfkit` 注册中文字体，候选路径：
       - macOS: `/Library/Fonts/Arial Unicode.ttf`、`/System/Library/Fonts/Supplemental/Arial Unicode.ttf`、`/System/Library/Fonts/STHeiti Medium.ttc`
       - Linux/Docker: `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc` 等
       - 可用 `PDF_FONT_PATH` 环境变量覆盖。
     - 注意：如果已下载的 PDF 里 `strings xxx.pdf | rg "BaseFont"` 仍只有 `/Helvetica`，说明后端跑的是旧进程或浏览器拿了旧缓存。重启后端并重新导出，正常应看到 `ArialUnicodeMS` 或 Noto CJK 字体。
   - Docker 字体补充：
     - `src/backend/Dockerfile` 增加 `fonts-noto-cjk`
     - `infrastructure/docker/Dockerfile.backend` 增加 `font-noto-cjk`
   - 2026-04-25 线上复测：
     - 报告接口已生效，但下载 PDF 只有约 2KB，`strings report.pdf | rg "BaseFont|ToUnicode"` 显示仍是 `/Helvetica` + `/WinAnsiEncoding`，确认容器没有成功加载中文字体。
     - `src/backend/src/services/report.service.ts` 改为找不到中文字体时直接返回 500，不再悄悄生成乱码 PDF。
     - `docker-compose.yml` 为 backend 显式设置 `PDF_FONT_PATH=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`。
     - `src/backend/Dockerfile` 增加字体文件存在性检查；必须 `docker compose build --no-cache backend`，仅 restart 不会把新增字体装进旧镜像。
   - 2026-04-26 继续修复：
     - 线上返回 `05001`，说明保护逻辑生效但容器仍未找到可注册字体。
     - `report.service.ts` 增加自动字体发现：递归扫描 `/usr/share/fonts`、`/usr/local/share/fonts` 等目录，优先选择 Noto Sans CJK SC / Noto Sans CJK / Source Han Sans / WenQuanYi。
     - 生产环境默认只使用开源/Linux 字体候选；macOS 的 Arial Unicode / STHeiti 仅作为本地开发兜底，避免把专有字体作为生产依赖。
     - `infrastructure/docker/Dockerfile.backend` 同步增加 Noto CJK 字体构建检查。
     - 线上日志出现 `this.font.createSubset is not a function`，确认 PDFKit 打开了 `.ttc` 字体集合而不是集合内具体字体；已为 `.ttc/.otc` 增加 face name 尝试（优先 `NotoSansCJKsc-Regular`）。
   - 踩坑记录：
     - `docker compose exec` 报 `.env unexpected character "/" in variable name` 时，不是容器问题，是 `.env` 某个密钥被换行拆成了独立一行；必须保持 `KEY=value` 单行或给 value 加引号。
     - `docker compose ps` 为空时，说明当前 compose 项目下没有服务在跑；如果网站仍可访问，要用 `docker ps` 确认是否跑在另一套目录/项目名下。
     - `docker compose logs backend | grep "PDF"` 没输出不代表字体正常，只有触发一次报告导出后才会执行字体加载。
     - PDF 乱码的快速判断：`strings report.pdf | rg "BaseFont|ToUnicode"`。只有 `/Helvetica` + `/WinAnsiEncoding` 基本就是未嵌入中文字体；正常应有 `NotoSansCJK...`、`Identity-H`、`ToUnicode`。
     - Debian `fonts-noto-cjk` 常安装为 `.ttc` 字体集合（如 `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`），PDFKit 注册时需要指定集合内字体 face；否则可能报 `this.font.createSubset is not a function`。
     - 生产字体版权：优先 Noto CJK / Source Han / WenQuanYi 等开源字体；不要把 Arial Unicode、STHeiti、微软雅黑、苹方等专有系统字体复制进镜像或作为生产依赖。

6. **“用药”页面 UI 重构**
   - `src/frontend/src/pages/Medications.tsx`
     - 改为截图风格三段式：
       1. “今日用药计划”时间轴，按提醒时间分组，展示 `已服/服用`。
       2. 虚线大卡片“添加新药物”。
       3. “我的药物”卡片列表：左侧色条、药品分类、规格/频率、提醒时间标签、通知开关。
     - 三点菜单保留“编辑 / 删除”。
     - 暂停/恢复提醒后会刷新今日计划和列表。

7. **“健康记录”页面 UI 重构**
   - `src/frontend/src/pages/Records.tsx`
     - 改为截图风格工作台：
       1. “智能识别检测报告”卡片，含“拍照识别 / 上传图片”入口。
       2. “手动录入”内嵌表单，可切换“日常指标 / 化验指标”。
       3. “最近记录”卡片列表，支持查看全部/收起和编辑。
     - 日常指标：体重、尿量、收缩压、舒张压、心率。
     - 化验指标：肌酐、尿素氮、血钾、血红蛋白、尿酸、他克莫司。
     - 重要注意：当前后端 `HealthRecord` 没有独立 `heartRate` 字段，心率暂存到 `notes`（格式：`心率：72次/分`），最近记录会从 `notes` 提取展示。后续若要做心率趋势，需 Prisma migration 增加正式字段。

### 验证情况

- 后端构建通过：
  ```bash
  cd src/backend && npm run build
  ```
- 前端构建通过：
  ```bash
  cd src/frontend && npm run build
  ```
- 本地开发服务注意：
  - 前端：`src/frontend` 下 `npm run dev -- --host 127.0.0.1`
  - 后端：`src/backend` 下 `npm run dev`
  - 如果 `3001` 被旧 node 进程占用但接口无响应，用 `lsof -nP -iTCP:3001 -sTCP:LISTEN` 查 PID，确认后 kill，再启动当前后端。

### 当前注意点 / 下次优先

- `docs/dev-log.md`、`AGENTS.md` 曾有较旧状态说明，后续开发请以本条和 `AGENTS.md` 最新日期为准。
- PDF 中文乱码排查顺序：
  1. 重新导出后检查文件大小，正常嵌入中文字体后会明显大于旧的 3KB。
  2. `strings ~/Downloads/健康报告*.pdf | rg "BaseFont|FontName|ToUnicode"`，正常应出现 `ArialUnicodeMS` / `NotoSansCJK` / `ToUnicode`，不应只有 `/Helvetica`。
  3. 若仍旧，重启后端进程并确认 `src/backend/src/services/report.service.ts` 已加载最新代码。
- “健康记录”页面的内嵌录入成功后留在 `/records` 并刷新最近记录；原 `/records/new` 表单仍保留，用于旧入口/编辑流程。
- `Profile.tsx` 的数据导出/分享依赖后端 `/reports/follow-up`，没有后端服务时会失败。
- 仍未处理：生产环境 Redis 替换验证码内存 Map、Dashboard 指标个性化交互重新设计、健康洞察增强。

---

## 2026-04-21 — iOS 日期输入框修复 + 部署问题

### 今日完成

1. **修复 iOS Safari 日期输入框溢出**
   - 问题：`input[type="date"]` 在 iOS Safari 中因 WebKit 默认样式，内部控件撑破 `.input-field` 的固定高度（`h-12` / 48px）
   - 方案：`src/frontend/src/index.css` 添加全局 WebKit 重置
     ```css
     input[type="date"],
     input[type="datetime-local"] {
       -webkit-appearance: none;
       appearance: none;
     }
     input[type="date"]::-webkit-date-and-time-value,
     input[type="datetime-local"]::-webkit-date-and-time-value {
       text-align: left;
       line-height: 1.5;
     }
     ```
   - 涉及文件：`src/frontend/src/index.css`

2. **前端部署（过程中踩坑）**
   - 提交 `28014b0` 已推送至 GitHub
   - 服务器上 `git pull` 因阿里云到 GitHub 443 超时失败
   - 删除旧镜像后 `docker-compose up -d` 报错 `No such image`（Compose 缓存引用已删除的 SHA256 层）
   - 解决：`docker-compose rm -f frontend` 清理容器引用 + `docker-compose build --no-cache frontend` 重新构建

### 新增已知问题（P0）

**SPA 路由刷新 404**
- 现象：从首页（`/`）正常进入应用，点击导航到其他页面（如 `/records`、`/medications`）正常，但在这些页面按 F5 刷新或直接访问 URL 时报 nginx 404
- 根因：React Router 是客户端路由，所有路径实际都由 `index.html` 内的 JS 处理。当前 nginx 配置 `location / { proxy_pass http://frontend/; }` 将非根路径请求转发到 frontend 容器，但 frontend 容器（nginx 静态服务器）没有 `/records/index.html` 等物理文件，返回 404
- 解决方案（待实施）：
  1. 外层 nginx（`nginx/default.conf`）添加 `try_files`：
     ```nginx
     location / {
         proxy_pass http://frontend/;
         # 如果 frontend 返回 404，回退到 index.html
         proxy_intercept_errors on;
         error_page 404 = @spa_fallback;
     }
     location @spa_fallback {
         proxy_pass http://frontend/index.html;
     }
     ```
  2. 或更简洁：frontend 容器自身 nginx 配置 `try_files $uri $uri/ /index.html;`
- 涉及文件：`nginx/default.conf`、`src/frontend/Dockerfile`（如需修改 frontend 容器内 nginx 配置）

---

## 2026-04-19 — UI 响应式适配

### 今日完成

1. **全局布局响应式改造**
   - `src/frontend/src/index.css` — `#root` 移除固定 480px 限制。手机端（<768px）`width: 100%` 完全自适应所有屏幕宽度；桌面端（≥768px）`max-width: 1200px`
   - `src/frontend/src/components/common/Layout.tsx` — 桌面端增加 `md:pl-[200px]` 为左侧边栏留空，内容区 `max-w-5xl mx-auto`
   - `src/frontend/src/components/common/BottomNav.tsx` — 双布局方案：手机端保持底部 fixed 导航栏（内容区 `w-full` 自适应），桌面端改为左侧固定边栏（200px 宽，图标+文字垂直排列），应用名称 "肾健康助手" 展示在边栏顶部
   - 清理所有 `max-w-mobile` 残留 — `MedicationForm.tsx`（BottomSelector 遮罩层）、`HealthInsights.tsx`（4 处标题栏和内容区）全部改为 `w-full`

2. **Dashboard 响应式优化**
   - 最近指标卡片：`grid-cols-2` → `md:grid-cols-3 lg:grid-cols-4`，桌面端展示更多指标
   - 趋势图表高度：`h-48` → `md:h-64`，桌面端图表更大更易读

3. **认证页面宽度限制**（不在 Layout 内，需独立处理）
   - `Login.tsx`、`Register.tsx`、`ForgotPassword.tsx` — 内容包裹 `max-w-md mx-auto`，宽屏下表单居中不拉伸
   - `PrivacyPolicy.tsx` — 内容区 `max-w-3xl mx-auto`，长文本阅读更舒适

### 技术细节

- 使用 Tailwind 响应式前缀 `md:`（≥768px）和 `lg:`（≥1024px）
- 底部导航栏使用 `md:hidden` / `hidden md:flex` 实现双布局切换
- TypeScript 类型检查通过，无新增错误

### 已知问题（待修复）

**Dashboard 血压打卡卡片文字溢出 — 已修复**
- 现象：今日打卡中血压数值（如 "120/70"）在小屏手机（375px 等）上超出卡片边界
- 方案：将血压卡片从 2 列布局中抽出，改为 `col-span-2` 独占整行，蓝色底框 (`bg-primary`)，白色文字。上方保留体重和尿量各占一列。
- 字体：`text-2xl md:text-3xl`，配合 `tracking-wide`，整行宽度下不再溢出。
- 涉及文件：`src/frontend/src/pages/Dashboard.tsx`

### 部署踩坑

**Docker 前端构建缓存**
- 问题：`docker-compose up -d --build` 后前端文件未更新（容器内仍为旧时间戳）
- 根因：Docker 缓存了旧镜像层
- 解决：先 `docker rmi healthmonitoringassistant_frontend:latest`，再 `docker-compose build --no-cache frontend`

---

## 2026-04-19 — 服务器部署与生产配置

### 今日完成

1. **生产环境 Docker 部署配置**
   - 新增 `docker-compose.yml` — 5 服务编排：postgres、redis、backend、frontend、nginx
   - 新增 `src/backend/Dockerfile` — Node 18 + Prisma + TypeScript 编译 + 自动迁移
   - 新增 `src/frontend/Dockerfile` — 多阶段构建（node 构建 → nginx 提供静态文件）
   - 新增 `nginx/default.conf` — 前端静态资源 + 后端 API 反向代理 + 上传文件代理
   - 新增 `scripts/deploy.sh` — 一键部署脚本（自动安装 Docker、克隆代码、构建启动）

2. **部署文档**
   - `docs/deployment-guide.md` — 面向小白的完整部署准备指南（域名、服务器、ICP备案）
   - `docs/quick-deploy.md` — IP 直连内测快速部署指南
   - `docs/server-operations.md` — 服务器日常运维手册（日志、重启、备份、故障排查）
   - `.env.example` — 生产环境配置模板

3. **后端依赖**
   - `src/backend/package.json` 新增 `pdfkit` 和 `@types/pdfkit`，为后续数据导出（PDF）做准备

### 部署过程问题记录

| 问题 | 现象 | 原因 | 解决方案 |
|------|------|------|----------|
| nginx 默认页面（首次） | 访问公网 IP 显示 "Welcome to nginx!" | 容器内 `/etc/nginx/conf.d/default.conf` 未正确挂载项目配置，使用了 nginx 镜像自带的默认页面 | 确认宿主机 `nginx/default.conf` 存在且 `docker-compose.yml` 中 volumes 挂载路径正确，重建 nginx 容器 |
| nginx 默认页面（重建后） | 前端代码更新并重建后，访问公网 IP 仍显示 "Welcome to nginx!" | `nginx/default.conf` 中 `location /` 使用 `root /usr/share/nginx/html`，指向 nginx 容器自身的文件系统，但 nginx 与 frontend 容器之间没有共享 volume，因此无法访问前端构建产物 | 将 `location /` 改为 `proxy_pass http://frontend/;`，由 nginx 反向代理到 frontend 容器 |
| SMS 404 | 注册时发送验证码提示 "Request failed with status code 404" | 后端服务可能未正常启动或 API 路由未匹配 | 检查后端容器状态 `docker-compose ps`，查看后端日志 `docker-compose logs backend` 排查 |
| 目录权限 | 服务器上文件属主为 root | Docker 和 git 操作使用了 sudo | 不影响运行，如需本地开发同步注意权限问题 |

### 部署状态

- **服务器环境**：阿里云 ECS
- **访问方式**：HTTP + 公网 IP（内测阶段，无域名和 HTTPS）
- **服务状态**：已部署，应用可访问，注册/登录流程已验证可用
- **数据库**：PostgreSQL 14 + Redis 7（Docker 容器，数据持久化在 Volume）

### 新增部署踩坑（2026-04-19 下午 session）

| 问题 | 现象 | 原因 | 解决方案 |
|------|------|------|----------|
| nginx 默认页面（重建后） | 前端代码更新并重建后，访问公网 IP 仍显示 "Welcome to nginx!" | `nginx/default.conf` 中 `location /` 使用 `root /usr/share/nginx/html`，指向 nginx 容器自身的文件系统（默认欢迎页），但 nginx 与 frontend 容器之间没有共享 volume，因此无法访问前端构建产物 | 将 `location /` 改为 `proxy_pass http://frontend/;`，由 nginx 反向代理到 frontend 容器 |
| 后端 API 404 | 登录时浏览器返回 `POST /api/auth/login 404` | `server.ts` 中 Express 路由挂载在 `/auth`、`/users` 等路径上，**没有 `/api` 前缀**。nginx 配置 `location /api/ { proxy_pass http://backend:3001/api/; }` 把 `/api/auth/login` 原样转发给后端，后端找不到 `/api/auth/login` 路由 | 将 nginx 中 `proxy_pass http://backend:3001/api/;` 改为 `proxy_pass http://backend:3001/;`，nginx 转发时会自动去掉 `/api/` 前缀 |
| `docker cp` 资源繁忙 | 试图用 `docker cp` 或 `docker exec sed` 修改运行中容器内的挂载卷配置文件，报错 "Resource busy" | 运行中的容器内通过 volume 挂载的文件会被 Docker 锁定，不允许原位修改 | 必须先 `docker-compose stop nginx`，再 `docker cp` 复制文件，然后 `docker-compose start nginx` |
| git HTTP/2  framing error | 服务器上 `git fetch` 或 `git push` 报错 "Error in the HTTP2 framing layer" | GitHub 与阿里云之间的网络链路对 HTTP/2 支持不稳定 | 服务器上执行 `git config --global http.version HTTP/1.1` |
| git reset 回退手动修改 | 服务器上执行 `git reset --hard origin/main` 后，之前手动修改的 nginx 配置被覆盖回旧版本 | `origin/main` 上的 commit 因 push 失败未同步到远程，服务器 fetch 到的是旧状态 | 在本地确认 push 成功后再在服务器上 pull；或直接在生产环境用 `sed` / `docker cp` 修改，不再依赖 git pull 同步配置 |

### 新增部署踩坑（2026-04-19 晚间 session）

| 问题 | 现象 | 原因 | 解决方案 |
|------|------|------|----------|
| **git pull 未更新代码** | 服务器执行 `git pull origin main` 后 `git log` 仍显示旧 commit | 阿里云到 GitHub 网络不稳定，`pull` 过程中断或 fetch 不完整 | 用 `git fetch origin main` + `git reset --hard origin/main` 强制同步到远程最新版本 |
| **github.com 连接超时** | `git pull` 报错 "Failed to connect to github.com port 443 after 130709 ms: Connection timed out" | 国内服务器访问 GitHub HTTPS 不稳定 | 配置 `git config --global http.version HTTP/1.1` 并延长超时时间；如持续超时改用 SSH 协议或 SCP 上传 |
| **Docker 镜像被容器占用无法删除** | `docker rmi healthmonitoringassistant_frontend:latest` 报错 "conflict: unable to delete... container is using its referenced image" | 前端容器正在运行，引用了该镜像 | 先 `docker-compose stop frontend`，如果仍报错用 `docker rmi -f` 强制删除 |
| **ContainerConfig KeyError 导致 up 失败** | `docker-compose up -d` 报错 `KeyError: 'ContainerConfig'`，Traceback 指向 docker-compose Python 代码 | 强制删除镜像后，旧容器的 image config 损坏，docker-compose 尝试重建容器时读取不到 ContainerConfig | 必须先 `docker rm -f hma-frontend` 删除旧容器（即使已 stop），再 `docker-compose up -d`；或者直接用 `docker-compose down` + `docker-compose up -d` 彻底重建 |
| **前端代码修改未生效** | 血压卡片样式修改后部署到服务器，浏览器刷新后仍然是旧的蓝色样式 | 服务器上的 git 代码未真正更新到最新 commit，Docker 构建的是旧代码 | 部署前务必 `git log --oneline -3` 确认服务器 commit 与本地一致；不一致时先强制同步代码再构建 |

### 血压卡片修复复盘（关键教训）

**问题**：Dashboard 今日打卡中血压卡片颜色与其他指标不一致（固定蓝色 vs 动态状态色）。

**第一次修复（commit d9bfc61）**：
- 只把 `className="col-span-2 bg-primary ..."` 改成了 `className={\`col-span-2 ... \${getCheckInClasses(status)}\`}`
- 结果：虽然颜色变成动态了，但卡片仍然独占整行（`col-span-2 rounded-xl p-4`），字号 `text-2xl md:text-3xl font-bold`，视觉上仍然与其他两个卡片（体重、尿量）完全不同

**第二次修复（commit bdeda90）**：
- 将血压卡片完全对齐其他卡片的样式规范：
  - 去掉 `col-span-2`，改为普通 `grid-cols-2` 子项
  - `rounded-xl p-4` → `rounded-lg p-3 md:p-4`
  - 标签 `text-small opacity-80` → `text-small`
  - 数值 `text-2xl md:text-3xl font-bold` → `text-base md:text-lg font-semibold whitespace-nowrap`
  - 单位 `text-sm opacity-70` → `text-xs ml-1`
- 结果：三个打卡卡片视觉完全一致，均通过 `getCheckInClasses(status)` 动态变色

**教训**：
1. 修复"颜色不一致"时，不能只改颜色类，要对比该组件与同类组件的**所有样式属性**（布局、圆角、padding、字号、字重、opacity）
2. 部署后必须在浏览器中**用 Ctrl+F5 强制刷新**验证效果，不能只看代码提交了就认为完成
3. 服务器上执行 `git log --oneline -3` 确认 commit 哈希与本地一致，是验证代码已同步的最可靠方式

### 下一步

- [ ] ~~修复 SMS 404 问题~~ ✅ 已完成（根因是 nginx 代理路径保留 `/api/` 前缀，后端路由无此前缀）
- [ ] ~~验证注册/登录流程在服务器环境是否完整可用~~ ✅ 已完成
- [x] ~~Dashboard 血压卡片颜色不一致（蓝色固定 vs 其他指标状态变色）~~ ✅ 已修复（见下方"血压卡片修复复盘"）
- [ ] 购买域名 + ICP 备案（如需正式对外）
- [ ] 配置 HTTPS（域名备案后）

---

## 2026-04-18 — BottomSelector、隐私政策、健康洞察、付费方案

### 今日完成

1. **用药表单 BottomSelector（19 种常用药物）**
   - `src/frontend/src/pages/MedicationForm.tsx` — 底部弹出选择器，覆盖 19 种肾衰竭/肾移植常用药物
   - 规格联动选择 — 选择药物后自动填充名称、规格、剂量单位
   - 修复截断问题 — `z-50` → `z-[60]`，`max-h-[70vh]` → `max-h-[60vh]`，`pb-8` → `pb-20`
   - Playwright E2E 测试 `e2e/medication-form.spec.ts`

2. **隐私政策页面**
   - `src/frontend/src/pages/PrivacyPolicy.tsx` — 10 章节完整隐私政策
   - 注册流程强制勾选 `Register.tsx`
   - 系统设置入口导航 `Settings.tsx`

3. **本地健康洞察引擎**
   - `src/frontend/src/services/insights/` — 5 模块纯本地规则引擎
   - `HealthInsights.tsx` 独立页面，Dashboard 新增入口
   - 描述性输出 + 强制免责声明 + critical/warning 分级

4. **Playwright E2E 测试框架**
   - `playwright.config.ts` — Desktop + Mobile Chrome 双项目
   - 4 个测试文件：auth、medication-form、settings、dashboard

5. **付费商业化方案**
   - `docs/billing-plan.md` — Freemium + 支付宝/微信支付完整方案
   - 决策：内测通过后实施

6. **Dashboard 指标个性化展示（历史记录，已在 2026-05-18 完成第一版）**
   - 2026-04-18 时只完成了部分代码，旧交互为 `showMoreMetrics` “更多/收起”。
   - 2026-05-18 已替换为“核心 / 推荐 / 全部”分层，并新增肾移植个人基线提示。

---

## 2026-04-17 — SMS 修复、Enum 修复、AppError

### 今日完成

1. **SMS 验证码集成修复**
   - 正确接口：`CheckSmsVerifyCode`（服务端验证）
   - 错误接口：`VerifySmsCode`（需要 `smsToken`，用于移动端 SDK）

2. **Prisma enum 修复**
   - 问题：`UserType` 列之前为 TEXT，schema 改为 enum 后数据库类型不匹配
   - 解决：创建 migration `20260417124850_fix_user_type_enum` 创建 enum 并转换列

3. **AppError 业务错误处理**
   - `src/backend/src/utils/errors.ts` — 新增 `AppError` 类
   - 所有 service 层 `throw new Error` 替换为 `throw new AppError(...)`
   - 确保前端收到正确的 HTTP 状态码（400/401/403/409）而非统一 500

4. **AuthStore token 提取修复**
   - 后端返回 `{ code, message, data }` 信封
   - Axios 拦截器返回 `response.data`
   - AuthStore 需从 `response.data.data.tokens` 提取 token

---

---

## 2026-04-21 — SPA路由404修复

### 今日完成

**修复SPA路由刷新404问题**

- **问题**: React Router客户端路由在非首页路径（如 `/records`、`/medications`）刷新或直接访问时报nginx 404
- **根因**: frontend容器使用nginx默认配置，没有配置`try_files`回退到`index.html`
- **方案**: 前端容器添加自定义nginx配置
  
**修改文件**:
1. `src/frontend/nginx.conf` (新增) - 自定义Nginx配置，支持SPA路由
   ```nginx
   server {
       listen 80;
       root /usr/share/nginx/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

2. `src/frontend/Dockerfile` (修改) - 复制自定义配置到容器
   ```dockerfile
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   ```

**部署说明**:
```bash
# 重新构建前端镜像
docker-compose down
docker rmi healthmonitoringassistant_frontend:latest
docker-compose build --no-cache frontend
docker-compose up -d
```

**验证方式**:
1. 访问首页 `/` 正常
2. 点击导航到 `/records` 正常
3. 在 `/records` 页面按 F5 刷新，应正常显示而非404


---

## 🚀 下次开发入口（Agent必读）

**当前日期**: 2026-05-18  
**最新状态**: Dashboard 指标分层、肾移植肌酐基线风险提示、复诊报告展示逻辑已完成第一版。  
**验证状态**: `cd src/frontend && npm run build`、`cd src/backend && npm run build` 均通过。

### 当前项目状态

MVP v1.0.0 功能已完成并部署到生产服务器（阿里云ECS，HTTP + IP直连）。当前功能增强重点已从 Dashboard 基础指标个性化，转向肾移植术后风险提示字段扩展、健康洞察增强和生产环境 Redis。

### 待办清单（按优先级排序）

| 优先级 | 任务 | 状态 | 说明 |
|--------|------|------|------|
| **P0** | 生产环境Redis | ❌ 未开始 | 验证码目前存内存Map，重启丢失。需切换到Redis |
| **P1** | 肾移植字段扩展 | ✅ 已完成基础字段 | 2026-05-30 新增 eGFR、尿蛋白/肌酐比、BK/CMV/EBV、他克莫司医生目标范围 |
| **P1** | 移植风险规则模块化 | ❌ 未开始 | 当前第一版规则在 Dashboard 中，建议抽到独立 service |
| **P1** | Dashboard指标个性化 | ✅ 已完成第一版 | 2026-05-18 改为核心/推荐/全部分层 |
| **P1** | iOS日期输入框 | ✅ 已修复 | 2026-04-21已添加WebKit样式重置 |
| **P2** | 健康洞察增强 | ✅ 已完成第一版 | 2026-05-30 接入每日打卡和移植扩展字段 trend-only 趋势 |
| **P2** | 检查报告到期提醒 | ❌ 未开始 | 基于用户类型和上次检查日期智能提醒复查 |
| **P2** | 商业化付费功能 | ❌ 未开始 | 内测通过后实施，方案见docs/billing-plan.md |
| **P3** | 域名+HTTPS+ICP备案 | ❌ 未开始 | 当前IP直连，正式对外需备案 |

### 如果继续开发，建议从以下任务选择

#### 选项A：生产环境Redis（P0，技术债）
- 文件：`src/backend/src/services/auth.service.ts`
- 当前：验证码存储在内存 `Map<string, {code, expiresAt}>`
- 目标：切换到Redis，支持多实例共享、重启不丢失
- 已有：docker-compose.yml中已配置Redis服务
- 步骤：
  1. 安装redis客户端库
  2. 替换内存Map操作
  3. 添加Redis连接错误回退

#### 选项B：肾移植字段扩展（P1，产品/数据基础）
- 当前：只支持肌酐个人基线、连续趋势、他克莫司目标范围免责声明。
- 目标：支持更完整的移植术后随访风险提示。
- 建议新增字段：
  1. `HealthRecord.egfr`
  2. `HealthRecord.urineProteinCreatinineRatio`
  3. `HealthRecord.urineAlbuminCreatinineRatio`
  4. `HealthRecord.urineOccultBlood`
  5. `HealthRecord.bkVirusCopies`
  6. `HealthRecord.cmvVirusCopies`
  7. 他克莫司医生目标范围低值/高值（建议放用户配置或专门 target 表）
- 涉及：
  - `src/backend/prisma/schema.prisma`
  - `src/backend/src/services/health-record.service.ts`
  - `src/frontend/src/pages/RecordForm.tsx`
  - `src/frontend/src/pages/Records.tsx`
  - `src/frontend/src/pages/Dashboard.tsx`
  - `src/backend/src/services/report.service.ts`

#### 选项B2：移植风险规则模块化（P1，架构优化）
- 当前：`getTransplantRiskReminder()` 在 `src/frontend/src/pages/Dashboard.tsx` 中。
- 目标：抽到独立模块，便于 Dashboard、健康洞察、PDF 报告复用。
- 可选位置：
  - 前端：`src/frontend/src/services/transplantRisk/`
  - 后端：`src/backend/src/services/transplant-risk.service.ts`
- 医疗边界：
  - 禁止诊断排异/感染/药物毒性。
  - 禁止自动建议调药。
  - 只能输出复查、联系移植医生、按医嘱处理等提示。

#### 选项C：健康洞察增强（P2，功能扩展）
- 文件：`src/frontend/src/services/insights/`
- 当前：基于化验单指标的分析
- 目标：接入每日打卡数据（血压、体重、尿量）
- 已有：每日打卡数据在健康记录中
- 步骤：
  1. 扩展insights引擎支持打卡指标
  2. 添加血压趋势分析（晨晚波动、异常标记）
  3. 体重变化趋势（水肿/脱水提示）
  4. 尿量监测（少尿/无尿预警）

### 技术上下文速查

**后端**
- 验证码存储：`src/backend/src/services/auth.service.ts` 内存Map `verificationCodes`
- Dashboard API：`src/backend/src/services/dashboard.service.ts` 已返回 `userType` / `primaryDisease` / `hasTransplant` / `transplantDate` / `baselineCreatinine`
- Redis服务：docker-compose.yml已定义，端口6379

**前端**
- Dashboard：`src/frontend/src/pages/Dashboard.tsx` 指标趋势图、今日打卡、肾移植肌酐基线提示
- 洞察引擎：`src/frontend/src/services/insights/` 纯本地规则引擎
- 路由：React Router，nginx已配置try_files

**部署**
- 路径：`/root/HealthMonitoringAssistant`（以实际服务器为准）
- 命令：`docker-compose down && docker-compose build --no-cache frontend && docker-compose up -d`

### 重要记忆

1. **Docker前端缓存**: 必须先`docker rmi`删除旧镜像再build，否则不会使用新代码
2. **Prisma命令**: 必须在`src/backend/`下执行，不要在前端目录运行
3. **后端热重启**: 开发环境重启后端会清空内存验证码
4. **Token提取层级**: 后端返回`{code, message, data}`，axios interceptor返回`response.data`，AuthStore需从`response.data.data`提取
5. **真实Aliyun凭证**: 已配置在服务器`.env`，本地测试失败会自动fallback到mock码

### 相关文档

- `CLAUDE.md` — 项目概览、架构约定、当前待办
- `docs/billing-plan.md` — 付费商业化完整方案
- `docs/server-operations.md` — 服务器运维手册
- `docs/quick-deploy.md` — IP直连快速部署指南

---

## 2026-04-23 — 安全隐患审计（待修复）

> 针对后端 `src/backend/src/**`、`nginx/`、`docker-compose.yml` 做了一次系统性安全审计。**以下问题尚未修复**,下次开发优先处理 CRITICAL 项。

### 🚨 CRITICAL（上线正式用户前必须修）

#### C1. JWT 硬编码兜底密钥
- **文件**: `src/backend/src/utils/jwt.ts:5`
- **问题**: `const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';`
- **风险**: 若 `JWT_SECRET` 环境变量未注入(部署配置失误),全站 token 用公开字符串 `your-secret-key` 签名。攻击者克隆仓库即可伪造任意 `userId` 的 JWT,绕过所有鉴权。
- **修复**: 删除 fallback,启动时校验 env 缺失则 throw:
  ```typescript
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
  ```

#### C2. 生产环境无 HTTPS,PHI + 密码 + token 明文传输
- **文件**: `nginx/default.conf`(只 `listen 80`)
- **风险**: 医疗数据(化验指标、手机号、密码、JWT)在公网明文传输。中间人攻击可盗取任意用户会话和健康数据。
- **修复**: 申请免费证书(Let's Encrypt / 阿里云免费 DV 证书),nginx 改为 `listen 443 ssl`,80 端口强制 302 跳转,添加 `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` 响应头。
- **前置条件**: 需完成 ICP 备案 + 域名解析。

#### C3. 登录 / 验证码接口零速率限制
- **范围**: 全后端无 `express-rate-limit`,也无任何 IP/手机号级别的限流
- **问题**:
  - `/auth/login` 无失败次数计数,可对任意手机号暴力撞密码(最小密码长度又只有 6 位,见 M11)
  - `/auth/verification-code` 有 60 秒同手机号间隔,但无 IP 级限制,攻击者可轮换手机号发垃圾短信(消耗阿里云余额)
  - 6 位短信验证码空间仅 100 万 + 5 分钟 TTL,`/auth/register`、`/auth/reset-password` 无校验失败次数上限,可暴力枚举 OTP
- **修复**:
  - `/auth/login`: 每 IP 15 分钟 5 次
  - `/auth/verification-code`: 每 IP 1 小时 3 次
  - `/auth/register` 和 `/auth/reset-password`: 每 IP 1 小时 10 次
  - 单个 phone+code 校验失败累计 5 次后锁定该验证码
  - 推荐使用 `express-rate-limit` + Redis store(配合 P0 Redis 切换任务一起做)

#### C4. OCR 接口跨用户 IDOR,可读他人化验单
- **文件**: `src/backend/src/services/ocr.service.ts:87-89`
- **问题**: `prisma.labReport.findUnique({ where: { id: imageId } })` **缺少 `userId` 过滤**。任何已登录用户只要猜到 UUID,即可调用 `/ocr/recognize` 触发对他人上传化验单的识别,并拿到完整化验文本(医院名 + 全部指标)。
- **修复**: `recognizeImage` 新增 `userId` 参数,where 条件改为 `{ id: imageId, userId }`。参考同文件 `getOCRResult` 已经正确的写法。
- **影响**: 直接的 PHI 泄露漏洞,医疗合规红线。

### HIGH

#### H5. 无安全响应头(helmet / CSP / X-Frame-Options / HSTS)
- **文件**: `src/backend/src/server.ts` 未引入 helmet
- **风险**: 无 CSP → XSS 无额外防线;无 X-Frame-Options → 点击劫持;无 Referrer-Policy → URL 可能带 token 泄漏到外站
- **修复**: `npm i helmet`,`app.use(helmet())` 加在 cors 之前;nginx 补 5 个标准 header

#### H6. CORS 通配,无 origin 白名单
- **文件**: `src/backend/src/server.ts` `app.use(cors())`
- **修复**: `cors({ origin: ['https://yourdomain.com'], credentials: true })`

#### H7. OCR 上传响应回显服务器绝对路径
- **文件**: `src/backend/src/controllers/ocr.controller.ts`(约 28-30 行)
- **问题**: 响应体包含 `filePath: req.file.path`(如 `/app/uploads/ocr/xxx.jpg`),泄漏容器内部布局
- **修复**: 从响应中移除 `filePath`,只返回 `imageId`

#### H8. OCR 原始医疗文本被 debug 日志持久化
- **文件**: `src/backend/src/services/ocr.service.ts:129, 289`
- **问题**: `logger.debug('OCR原始文本:\n' + rawText)` 把完整化验单文字写日志,一旦 `LOG_LEVEL=debug` PHI 落盘
- **修复**: 删除这两条 debug 日志(无安全的生产形态)

### MEDIUM

#### M9. SMS 开发回退把 OTP 明文打 warn 日志
- **文件**: `src/backend/src/services/auth.service.ts:277`
- **问题**: `logger.warn('[开发回退]...验证码: ${phone} => ${verifyCode}')`,日志聚合环境中明文 OTP
- **修复**: 日志去掉 `verifyCode`,只记录"发生 fallback + 手机号"

#### M10. `metric` 查询参数作为 Prisma 属性键,无白名单
- **文件**: `src/backend/src/services/health-record.service.ts:28`
- **问题**: `where[metric] = { not: null }`,`metric` 直接来自 query,Prisma 虽不能 SQL 注入,但未知字段可能触发 schema 错误回显
- **修复**: 对 `metric` 加已知字段 enum 白名单

#### M11. 密码最小长度仅 6 位
- **文件**: `src/backend/src/utils/password.ts:20`
- **问题**: 医疗应用低于 OWASP 最低 8 位;叠加零速率限制(C3)风险放大
- **修复**: 提升到 8 位以上,医疗场景建议 12 位

### 修复优先级建议(下次开发入口)

**第一批(立即做,改动小、影响大、不需基础设施变更)**:
- [ ] C1 JWT fallback 删除
- [ ] C4 OCR IDOR(加 userId 过滤)
- [ ] H7 OCR 响应移除 filePath
- [ ] H8 删除 OCR 原始文本 debug 日志
- [ ] M9 SMS fallback 日志脱敏

**第二批(需改配置、略复杂)**:
- [ ] C3 速率限制(推荐与 P0 Redis 切换合并做,用 `rate-limit-redis`)
- [ ] H5 helmet + 安全响应头
- [ ] H6 CORS 白名单
- [ ] M10 metric 字段白名单
- [ ] M11 密码长度提升至 8+ 位

**第三批(需基础设施)**:
- [ ] C2 HTTPS(依赖域名 + ICP 备案)

### 审计范围说明

- **已审计**: 后端 controllers/services/middleware/routes、Prisma schema、nginx 配置、docker-compose、根目录 `.env*` 文件
- **未审计**: 前端 XSS(`dangerouslySetInnerHTML`)、Playwright E2E 测试中的凭证管理
- **未发现问题**: `.env` 已正确 gitignore 未被跟踪;Prisma 未见 `$queryRaw` 拼接;bcrypt 已用于密码哈希
