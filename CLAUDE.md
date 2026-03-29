# Claude Code SubAgent 配置

## 项目概述

肾衰竭健康监测Web应用 - MVP版本使用5个核心SubAgent并行开发。

## SubAgent 启动命令

在Claude Code中使用 `/agent` 命令启动各SubAgent：

```bash
# 1. 启动产品设计师
/agent --name "product-designer" --prompt "file://prompts/product-designer.md"

# 2. 启动技术架构师
/agent --name "architect" --prompt "file://prompts/architect.md"

# 3. 启动全栈工程师
/agent --name "fullstack-dev" --prompt "file://prompts/fullstack-dev.md"

# 4. 启动AI工程师
/agent --name "ai-engineer" --prompt "file://prompts/ai-engineer.md"

# 5. 启动DevOps工程师
/agent --name "devops" --prompt "file://prompts/devops.md"
```

## 工作目录结构

```
HealthMonitoringAssistant/
├── CLAUDE.md                 # 本文件 - SubAgent配置入口
├── subagent-architecture.md  # 完整架构文档
├── prompts/                  # SubAgent Prompts
│   ├── product-designer.md
│   ├── architect.md
│   ├── fullstack-dev.md
│   ├── ai-engineer.md
│   └── devops.md
├── docs/                     # 共享文档
│   ├── prd.md               # 产品需求文档
│   ├── design-system.md     # 设计规范（由产品设计师产出）
│   ├── api-spec.md          # API规范（由架构师产出）
│   └── security-checklist.md # 安全清单
├── src/                      # 源代码
│   ├── frontend/            # 前端代码
│   ├── backend/             # 后端代码
│   └── shared/              # 共享类型定义
├── tests/                    # 测试文件
├── infrastructure/           # 部署配置
│   ├── docker/
│   ├── nginx/
│   └── github-actions/
└── memory/                   # 持久化记忆
    ├── decisions.md         # 关键决策记录
    └── lessons-learned.md   # 经验教训
```

## 上下文共享机制

### 1. 文件共享
各SubAgent通过约定目录共享文件：
- `docs/` - 设计文档、API规范
- `src/shared/` - 类型定义、常量
- `memory/` - 跨会话记忆

### 2. 状态同步
在 `memory/status.json` 中维护项目状态：
```json
{
  "version": "1.0.0",
  "agents": {
    "product-designer": { "status": "completed", "deliverables": [...] },
    "architect": { "status": "in_progress", "blockers": [] },
    "fullstack-dev": { "status": "pending", "dependencies": ["architect"] }
  },
  "milestones": [
    { "name": "设计完成", "done": true, "date": "2024-01-10" },
    { "name": "架构设计", "done": false, "date": null }
  ]
}
```

## 推荐的 MCP 配置

在 `~/.claude/settings.json` 中配置：

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

### MCP 用途说明

| MCP | 用途 | 使用Agent |
|-----|------|-----------|
| **filesystem** | 读写项目文件 | 所有Agent |
| **github** | 代码版本管理 | DevOps、全栈工程师 |
| **postgres** | 数据库操作 | 全栈工程师、架构师 |
| **fetch** | HTTP请求测试 | 全栈工程师、AI工程师 |

## SubAgent 工作流

### Phase 1: 设计与架构（并行）

```bash
# 同时启动两个Agent
/agent --name "product-designer" --working-dir "./docs"
/agent --name "architect" --working-dir "./docs"
```

**交付物**：
- `docs/design-system.md` - 设计规范
- `docs/api-spec.md` - API规范
- `src/shared/types.ts` - 共享类型

### Phase 2: 开发（并行）

```bash
# 启动开发Agent，自动读取Phase 1的输出
/agent --name "fullstack-dev" --working-dir "./src"
/agent --name "ai-engineer" --working-dir "./src"
```

### Phase 3: 部署

```bash
/agent --name "devops" --working-dir "./infrastructure"
```

## 提示词最佳实践

1. **每个Prompt包含**：
   - 角色定义
   - 输入/输出规范
   - 禁止事项
   - 文件输出路径

2. **文件操作约定**：
   - 使用相对路径 `./docs/xxx.md`
   - 大文件分块写入
   - 关键文件先写草稿再确认

3. **跨Agent通信**：
   - 通过 `docs/` 目录共享文档
   - 通过 `memory/status.json` 同步状态
   - 复杂协调由人类主导

## 安全注意事项

- 敏感配置（JWT密钥、数据库密码）使用环境变量
- 不在代码中硬编码API密钥
- 生产环境配置放在 `infrastructure/.env.production`
- 开发/测试环境使用单独的数据库
