# 肾衰竭患者健康监测 Web 应用

一款面向肾衰竭（CKD）患者的个人健康数据管理工具，帮助患者便捷记录健康指标、智能识别化验单、管理用药提醒。

## 功能特性

- **指标记录**: 每日体重、血压、尿量等关键指标记录
- **化验单 OCR**: 拍照自动提取化验数据
- **血药浓度监测**: 免疫抑制剂血药浓度专项记录
- **用药管理**: 用药提醒设置与服药记录
- **趋势图表**: 可视化展示健康指标变化
- **异常预警**: 自动检测异常指标并提醒

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Recharts
- **后端**: Node.js + Express + Prisma ORM
- **数据库**: PostgreSQL 14
- **缓存**: Redis
- **OCR**: 百度AI医疗票据识别
- **部署**: Docker + Docker Compose + Nginx

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Redis 7+

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
# 编辑 .env 文件配置数据库和第三方服务
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

### Docker 部署

```bash
cd infrastructure/docker
docker-compose up -d
```

## 项目结构

```
HealthMonitoringAssistant/
├── docs/                     # 文档
│   ├── prd.md               # 产品需求文档
│   ├── github-workflow.md   # GitHub 协作指南
│   └── ...
├── prompts/                  # SubAgent Prompts
├── src/                      # 源代码
│   ├── frontend/            # 前端代码
│   ├── backend/             # 后端代码
│   └── shared/              # 共享类型定义
├── infrastructure/           # 部署配置
│   ├── docker/
│   ├── nginx/
│   └── github-actions/
├── memory/                   # 持久化记忆
│   ├── logs/                # Agent 工作日志
│   └── work-status.md       # 项目状态总览
└── tests/                    # 测试文件
```

## 协作开发

参见 [GitHub 协作开发指南](./docs/github-workflow.md)

### 开发流程

1. 从 `main` 分支创建功能分支
2. 开发完成后提交 Pull Request
3. 至少 1 人 Code Review
4. 合并到 `main` 分支

## SubAgent 架构

本项目采用多 Agent 并行开发模式：

| Agent | 职责 |
|-------|------|
| 产品设计师 | UI/UX设计、医学规范定义 |
| 技术架构师 | 系统架构、API规范、数据库设计 |
| 全栈工程师 | 前后端功能实现 |
| AI工程师 | 化验单OCR识别 |
| DevOps工程师 | CI/CD、部署运维 |

启动方式详见 [CLAUDE.md](./CLAUDE.md)

## 文档索引

- [产品需求文档 (PRD)](./docs/prd.md)
- [GitHub 协作开发指南](./docs/github-workflow.md)
- [SubAgent 配置](./CLAUDE.md)
- [架构文档](./subagent-architecture.md)

## 注意事项

- 本应用仅用于健康数据管理，**不提供医疗诊断建议**
- 所有健康建议仅供参考，具体治疗请遵医嘱
- 敏感数据已加密存储，符合医疗数据隐私保护要求

## License

MIT License

## 贡献者

感谢所有参与本项目的开发者。

---

**免责声明**: 本应用提供的健康监测功能仅供参考，不能替代专业医疗诊断和治疗建议。如有身体不适，请及时就医。
