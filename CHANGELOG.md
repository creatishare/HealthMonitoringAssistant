# Changelog

所有项目的显著更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [Unreleased]

### Added
- **找回密码功能**: 支持通过手机号验证码重置密码
  - 后端: 新增 `POST /auth/reset-password` 接口
  - 前端: 新建 `ForgotPassword.tsx` 页面，三步流程（手机号→验证码→新密码）
  - 登录页新增"忘记密码？"链接
- **深色模式**: 完整的深色主题支持
  - 新建 `themeStore.ts` 管理主题状态，localStorage 持久化
  - 配置 CSS 变量和 Tailwind darkMode
  - 所有组件适配深色模式（按钮、输入框、卡片等）
- **消息通知**: 浏览器原生通知功能
  - 新建 `notificationStore.ts` 管理通知设置
  - 支持请求浏览器通知权限
  - 开启后发送测试通知确认功能正常
- **血压输入优化**: 收缩压/舒张压标签添加高压/低压标识
  - 标签显示为"收缩压/高压 (mmHg)"和"舒张压/低压 (mmHg)"
- **个人档案新增移植手术信息**: 支持记录是否经过移植手术及移植时间
  - 后端: 数据库新增 `hasTransplant` 和 `transplantDate` 字段
  - 前端: ProfileEdit 页面新增移植手术选择和日期输入
- **系统设置页面**: 新增 `/settings` 路由和 Settings 组件
  - 深色模式开关（可用）
  - 消息通知开关（可用）
  - 隐私政策、关于我们入口
  - 清除缓存并退出功能
- **一键重启后端脚本**: `restart-backend.sh` - 快速重启后端服务并自动健康检查
- **记录编辑功能**: 支持修改已录入的健康记录
  - `RecordForm.tsx` 同时支持新增和编辑模式
  - 编辑时自动回填已有数据
  - 新增 `/records/:id/edit` 路由
- **首页打卡健康状态提示**: 今日打卡根据指标健康程度显示不同颜色
  - 血压异常显示黄/红色（收缩压 > 140 或 < 90；> 180 或 < 60 标红）
  - 尿量异常显示黄/红色（< 400 或 > 5000 标黄；< 100 标红）
  - 体重与干体重相差 > 3kg 标黄

### Fixed
- **Dashboard 请求报错刷屏**: 修复 console 不断输出 `Request aborted` 和 `Failed to fetch`
  - 401 拦截器改为事件派发，避免 `window.location.href` 导致整页刷新
  - `Dashboard` 增加 `AbortController`，忽略请求取消类错误
- **今日打卡不更新**: 修复录入体重/血压/尿量后首页仍显示旧数据
  - 修复后端 `dashboard.service.ts` UTC 日期查询时区偏移问题
  - `RecordForm` 保存后返回首页
  - `Dashboard` 增加 `location.pathname` 依赖，确保返回时刷新数据
- **记录详情白屏**: 修复点击修改按钮后页面变白
  - 补全 `App.tsx` 缺失的 `/records/:id/edit` 路由
- **死代码清理**: 移除未使用的 legacy 文件和依赖
  - 删除 `backend/controllers/`、`backend/services/` 下的旧重复文件
  - 删除 `redis.ts`、`webpush.service.ts`、SQLite schema、测试种子脚本
  - 清理 `frontend/package.json` 和 `backend/package.json` 中未使用的依赖

### Changed
- **本地开发一键启动脚本**: 简化本地测试流程
  - 新增 `start-dev.sh` - 本地开发一键启动工具
    - `./start-dev.sh start` - 启动所有服务（PostgreSQL、Redis、后端、前端）
    - `./start-dev.sh stop` - 停止所有服务
    - `./start-dev.sh restart` - 重启所有服务
    - `./start-dev.sh status` - 查看服务运行状态
    - `./start-dev.sh cpolar` - 启动内网穿透
  - 自动检查 PostgreSQL 和 Redis 服务状态
  - 自动启动后端 API (端口 3001) 和前端 (端口 3000)
  - 显示访问地址和测试账号信息
- **本地开发环境配置**: 支持 cpolar 内网穿透测试
  - 配置 cpolar authtoken 认证
  - 一键启动公网隧道访问本地应用
  - Web 管理界面 http://localhost:4040 查看公网地址

### Fixed
- **OCR文件上传修复**: 修复上传化验单显示"识别失败"的问题
  - 新增 `src/middleware/upload.middleware.ts` - multer文件上传中间件
  - 修复 `src/routes/ocr.routes.ts` - 添加 `upload.single('image')` 处理
  - 修复 `src/controllers/ocr.controller.ts` - 读取实际文件路径而非模拟URL
  - 修复 `src/services/ocr.service.ts` - 文件路径处理逻辑
  - 前端 `src/services/api.ts` - 设置 `Content-Type: multipart/form-data`
  - 前端 `src/pages/OCRUpload.tsx` - 增强错误处理和日志输出
- **登录500错误修复**: 修复退出后无法登录的问题
  - 修复测试用户密码哈希格式错误（数据库中存储为 `\$` 导致验证失败）
  - 更新 `create_test_user.sql` 使用正确的 bcrypt 哈希
  - 测试账号: 13800138000 / 密码: 123456
- **OCR提取逻辑增强**: 支持更多化验单格式
  - 第一阶段：匹配带单位的完整格式（如"肌酐 171 μmol/L"）
  - 第二阶段：匹配表格格式（如"肌酐    171"，自动使用默认单位）
  - 第三阶段：通用数值提取（根据数值范围推断指标类型）
  - 新增默认单位映射（肌酐→μmol/L，尿素→mmol/L等）
  - 数值范围验证确保提取结果合理性
- **时区问题修复**: 解决用药提醒时间显示不正确的问题
  - 后端使用 UTC 基准日期 (1970-01-01) 存储纯时间，避免时区偏移
  - 使用 `getUTCHours()` 和 `getUTCMinutes()` 获取时间
  - Dashboard 日期格式改为本地化中文显示
- **登录问题修复**: 修复前端登录报错"服务器内部错误"
  - 修复 `authStore.ts` 响应数据解构问题
  - 支持 `response.data` 和 `response` 两种格式
  - 改进错误信息显示
- **趋势图表修复**: Dashboard 新增指标趋势看板
  - 修复响应数据处理逻辑
  - 支持多指标趋势显示（肌酐、尿素氮、血钾、尿酸）
  - 添加指标选择器，可切换显示不同指标
  - 无数据时显示友好提示
- **记录详情页面**: 修复健康记录点击后空白问题
  - 新增 `RecordDetail.tsx` 记录详情页面
  - 添加 `/records/:id` 路由
  - 显示记录日期和所有录入的指标
  - 异常值（超出参考范围）用红色标注
  - 支持编辑和删除记录

### Changed
- **测试数据**: 创建测试账号和数据
  - 手机号: 13800138000 / 密码: Test123456
  - 包含5条健康记录（肌酐、尿素氮、血钾等指标）
  - 包含4种用药记录（碳酸镧、罗沙司他、左卡尼汀、骨化三醇）

## [1.0.0] - 2026-03-30

### Added
- **ECS部署配置**: 阿里云ECS生产环境部署（无短信功能）
  - 新增 `infrastructure/docker/docker-compose.ecs.yml` - ECS专用Docker Compose配置
    - 配置PostgreSQL、Redis本地容器
    - 后端API服务（SMS_ENABLED=false）
    - Worker服务（ENABLE_SMS_NOTIFICATION=false）
    - Nginx反向代理
  - 新增 `infrastructure/.env.ecs.example` - ECS环境变量模板
  - 新增 `infrastructure/scripts/deploy-ecs.sh` - 一键部署脚本
  - 新增 `ECS_DEPLOY.md` - 快速部署指南
  - 新增 `DEPLOY_PACKAGE.md` - 部署文件清单
  - 默认禁用短信功能，Worker仅提供应用内提醒
- **ECS服务器配置文档**: 完整的ECS配置教程
  - 新增 `ECS_SERVER_SETUP.md` - 从零开始配置ECS服务器
    - ECS购买指南（配置选择、费用估算）
    - 安全组配置步骤
    - SSH连接方法
    - Docker安装教程（Ubuntu/CentOS）
    - 文件上传方法（scp/git/FTP）
    - 环境变量配置详解
    - 部署验证步骤
    - 常用运维命令
    - 故障排查指南
    - 域名和HTTPS配置（可选）

## [1.0.0] - 2026-03-30

### Added
- **OCR功能**: 实现真实的百度OCR调用
  - 新增 `src/utils/baiduOcr.ts` - 百度OCR客户端模块
    - `getAccessToken()` - 获取并缓存百度OCR Token（有效期30天）
    - `recognizeText()` - 高精度文字识别API
    - `recognizeMedicalReport()` - 医疗报告专用API（带降级逻辑）
    - `imageFileToBase64()` - 图片转Base64
    - `isOCRConfigValid()` - 配置验证
  - 更新 `src/services/ocr.service.ts`
    - 替换模拟数据为真实百度OCR调用
    - 新增 `extractHealthMetrics()` - 智能提取8项健康指标
    - 新增 `extractMetadata()` - 提取日期和医院信息
    - 完整的错误处理和状态管理
  - 支持的检验指标：肌酐、尿素氮、钾、钠、磷、尿酸、血红蛋白、血糖
  - 配置验证测试通过，可用API包括通用OCR、高精度OCR、医疗报告识别等

### Changed
- OCR服务从模拟模式切换到生产模式
- 优化Token缓存机制（提前5分钟刷新）

### Fixed
- TypeScript类型定义完善

[Unreleased]: https://github.com/yourusername/health-monitoring/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/health-monitoring/releases/tag/v1.0.0
