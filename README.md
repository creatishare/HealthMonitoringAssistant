# 肾衰竭患者健康监测 Web 应用

一款面向肾衰竭（CKD）及肾移植术后患者的个人健康数据管理工具，帮助患者便捷记录健康指标、智能识别化验单、管理用药提醒，并提供本地化的健康数据洞察分析。

## 功能特性

### 核心功能
- **健康打卡**: 每日体重、血压、尿量快速记录
- **化验单管理**: 手动录入或 OCR 拍照识别化验数据（肌酐、尿素氮、血钾、尿酸、血红蛋白、他克莫司浓度等）
- **用药管理**: 19 种肾衰竭/肾移植术后常用药物底部选择器，支持规格联动；用药提醒与服药记录
- **趋势图表**: 基于 Recharts 的可视化健康指标趋势展示
- **异常预警**: 基于参考范围自动标记异常指标
- **本地健康洞察**: 纯前端规则引擎，提供趋势分析、异常提醒、用药依从性统计和摘要报告（零外部 API 调用）
- **深色模式**: 系统级主题切换，全应用覆盖

### 用户系统
- 手机号注册/登录（含 SMS 验证码）
- JWT Token + 刷新令牌机制
- 首次登录用户引导（选择用户类型）
- 隐私政策页面 + 注册时强制同意

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
| 缓存 | Redis (开发中内存 Map) | 7.x |
| OCR | 百度 AI 医疗票据识别 | — |
| SMS | 阿里云 Dypnsapi20170525 | — |
| E2E 测试 | Playwright | — |

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (生产环境必需)

### 安装依赖

```bash
# 后端
cd src/backend
npm install

# 前端
cd src/frontend
npm install
```

### 环境变量

```bash
cp src/backend/.env.example src/backend/.env
# 编辑 .env 配置数据库、阿里云 SMS、百度 OCR 等
```

### 启动开发服务器

```bash
# 启动后端（端口 3001）
cd src/backend
npm run dev

# 启动前端（端口 3000）
cd src/frontend
npm start
```

### 数据库迁移

```bash
cd src/backend
npx prisma migrate dev
npx prisma generate
```

### Docker 部署

```bash
cd infrastructure/docker
docker-compose up -d
```

## 项目结构

```
HealthMonitoringAssistant/
├── CLAUDE.md               # Agent 开发配置与项目总览（必读）
├── docs/                   # 文档
│   ├── prd.md              # 产品需求文档
│   ├── api-spec.md         # API 规范
│   ├── architecture.md     # 系统架构设计
│   ├── database-schema.md  # 数据库设计
│   ├── design-system.md    # UI 设计规范
│   ├── medical-spec.md     # 医学参考值与药物清单
│   ├── security.md         # 安全清单
│   ├── third-party-services.md  # 第三方服务配置
│   └── github-workflow.md  # GitHub 协作指南
├── prompts/                # SubAgent Prompts
├── src/
│   ├── frontend/           # React 前端
│   │   ├── src/
│   │   │   ├── pages/      # 页面组件
│   │   │   ├── services/   # API + 洞察引擎
│   │   │   ├── stores/     # Zustand 状态管理
│   │   │   └── App.tsx     # 路由定义
│   │   ├── e2e/            # Playwright E2E 测试
│   │   └── playwright.config.ts
│   └── backend/            # Express 后端
│       ├── src/
│       │   ├── routes/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── middleware/
│       │   └── prisma/
│       └── tests/
├── infrastructure/         # 部署配置
│   ├── docker/
│   ├── nginx/
│   └── github-actions/
└── memory/                 # 持久化记忆
    ├── project_status.md   # 项目状态与待办
    ├── development_gotchas.md  # 踩坑记录
    └── MEMORY.md           # 记忆索引
```

## E2E 测试

```bash
cd src/frontend

# 运行全部测试
npx playwright test

# 可视化模式
npx playwright test --headed

# 查看报告
npx playwright show-report
```

## 协作开发

参见 [GitHub 协作开发指南](./docs/github-workflow.md)

### 开发流程

1. 从 `main` 分支创建功能分支
2. 开发完成后提交 Pull Request
3. 至少 1 人 Code Review
4. 合并到 `main` 分支

### 提交前检查清单

- [ ] `npx tsc --noEmit` TypeScript 类型检查通过
- [ ] `npm run build` 构建通过
- [ ] 无硬编码密钥或敏感信息
- [ ] 深色模式样式已检查（无 `bg-white` 硬编码）
- [ ] 医疗相关功能已添加免责声明

## 开放待办 (Open Todos)

| 优先级 | 任务 | 说明 |
|--------|------|------|
| **P0** | **UI 响应式适配** | 当前所有页面限制 `max-width: 480px`，仅适配手机端。需评估并实施平板/桌面端响应式方案。见 `index.css` 和 `tailwind.config.js` |
| P0 | 生产环境部署 | 部署到阿里云 ECS，配置生产域名与 HTTPS |
| P0 | Redis 替换内存 Map | 生产环境验证码存储必须从内存 Map 迁移到 Redis |
| P1 | 健康洞察增强 | 接入每日打卡数据（血压、体重）到洞察引擎；增加图表联动 |
| P1 | 检查报告到期提醒 | 基于用户类型和上次检查日期，智能提醒复查时间 |
| P1 | PWA 离线支持 | 添加 Service Worker，支持离线查看历史记录 |

> **注意**: UI 响应式适配是**最高优先级待办**。当前 `#root { max-width: 480px; margin: 0 auto; }` 限制了整个应用的宽度。如需适配更大屏幕，需要重新设计布局策略（保持手机端居中，或改为全宽响应式布局）。

## 文档索引

- [产品需求文档 (PRD)](./docs/prd.md)
- [API 规范](./docs/api-spec.md)
- [系统架构设计](./docs/architecture.md)
- [数据库设计](./docs/database-schema.md)
- [UI 设计规范](./docs/design-system.md)
- [医学规范（参考值/药物清单）](./docs/medical-spec.md)
- [安全清单](./docs/security.md)
- [第三方服务配置](./docs/third-party-services.md)
- [GitHub 协作指南](./docs/github-workflow.md)
- [Agent 开发配置 (CLAUDE.md)](./CLAUDE.md)

## 注意事项

- 本应用仅用于健康数据管理，**不提供医疗诊断建议**
- 所有健康建议仅供参考，具体治疗请遵医嘱
- 敏感数据已加密存储，符合医疗数据隐私保护要求
- 健康洞察功能基于通用医学参考值进行统计整理，不能替代个体化诊疗标准

## License

MIT License

---

**免责声明**: 本应用提供的健康监测功能仅供参考，不能替代专业医疗诊断和治疗建议。如有身体不适，请及时就医。
