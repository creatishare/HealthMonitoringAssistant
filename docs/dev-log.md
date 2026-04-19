# 开发日志 (Development Log)

> 按日期记录每日开发内容、问题与解决方案、部署状态。

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

### 下一步

- [ ] ~~修复 SMS 404 问题~~ ✅ 已完成（根因是 nginx 代理路径保留 `/api/` 前缀，后端路由无此前缀）
- [ ] ~~验证注册/登录流程在服务器环境是否完整可用~~ ✅ 已完成
- [ ] Dashboard 血压卡片颜色不一致（蓝色固定 vs 其他指标状态变色）
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
