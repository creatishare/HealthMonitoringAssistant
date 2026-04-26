# 开发日志 (Development Log)

> 按日期记录每日开发内容、问题与解决方案、部署状态。
> **阅读提示**：Agent 开始新任务前，请先阅读本日志最新条目和"开放问题"章节。

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

6. **Dashboard 指标个性化展示（进行中）**
   - 后端 `dashboard.service.ts` 已返回 `userType` / `primaryDisease`
   - 前端 `Dashboard.tsx` 已添加 `ALL_METRICS`、`getRecommendedMetrics()`、`showMoreMetrics`
   - **问题**：交互体验未达预期，需重新设计（后端未重启，修改未生效）

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

**当前日期**: 2026-04-21  
**Git提交**: `c3a3df3` fix: SPA路由刷新404问题  
**部署状态**: 修复已推送GitHub，待服务器部署验证

### 当前项目状态

MVP v1.0.0 功能已完成并部署到生产服务器（阿里云ECS，HTTP + IP直连）。最近完成SPA路由404修复。

### 待办清单（按优先级排序）

| 优先级 | 任务 | 状态 | 说明 |
|--------|------|------|------|
| **P0** | 生产环境Redis | ❌ 未开始 | 验证码目前存内存Map，重启丢失。需切换到Redis |
| **P0** | SPA路由404部署验证 | 🚧 待验证 | 代码已提交，需服务器拉取+重建验证 |
| **P1** | Dashboard指标个性化 | 🚧 进行中 | 根据userType+primaryDisease动态展示。代码部分实现，需重新设计交互 |
| **P1** | iOS日期输入框 | ✅ 已修复 | 2026-04-21已添加WebKit样式重置 |
| **P2** | 健康洞察增强 | ❌ 未开始 | 接入每日打卡数据（血压、体重）到洞察引擎 |
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

#### 选项B：Dashboard指标个性化交互重设计（P1，产品优化）
- 文件：`src/frontend/src/pages/Dashboard.tsx`
- 当前问题：用户反馈"更多/收起"交互体验未达预期
- 已有代码：后端返回userType/primaryDisease，前端有ALL_METRICS和getRecommendedMetrics()
- 待决策：Tab分组、优先级折叠、卡片式折叠等新交互方案
- 需要：重新设计交互后再实现

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
- Dashboard API：`src/backend/src/services/dashboard.service.ts` 已返回userType/primaryDisease
- Redis服务：docker-compose.yml已定义，端口6379

**前端**
- Dashboard：`src/frontend/src/pages/Dashboard.tsx` 指标趋势图、今日打卡
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
