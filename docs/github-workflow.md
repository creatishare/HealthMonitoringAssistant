# GitHub 协作开发指南

## 1. 首次设置（项目创建者）

### 1.1 在 GitHub 创建仓库

1. 访问 https://github.com/new
2. 填写信息：
   - Repository name: `HealthMonitoringAssistant`
   - Description: 肾衰竭患者健康监测 Web 应用
   - Visibility: Private（建议）或 Public
   - **不要勾选** "Initialize this repository with a README"（已有 CLAUDE.md）
3. 点击 "Create repository"

### 1.2 推送本地代码到 GitHub

```bash
# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/HealthMonitoringAssistant.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: Project setup with PRD and agent prompts"

# 推送到 main 分支
git branch -M main
git push -u origin main
```

### 1.3 添加协作者

1. 在 GitHub 仓库页面，点击 **Settings** → **Collaborators**
2. 点击 **Add people**
3. 输入同事的 GitHub 用户名或邮箱
4. 选择权限级别（通常选 **Write**）
5. 点击 **Add**

协作者会收到邮件邀请，接受后就可以协作开发了。

---

## 2. 协作者开发流程

### 2.1 首次克隆仓库

```bash
# 克隆仓库（替换 YOUR_USERNAME）
git clone https://github.com/YOUR_USERNAME/HealthMonitoringAssistant.git
cd HealthMonitoringAssistant
```

### 2.2 日常开发流程

```bash
# 1. 切换到 main 分支并拉取最新代码
git checkout main
git pull origin main

# 2. 创建功能分支（使用自己的名字作为前缀）
git checkout -b feature/zhangsan-login-module

# 3. 进行开发工作...
# 编辑文件、添加新功能

# 4. 提交更改
git add .
git commit -m "feat: 完成用户登录模块

- 实现手机号+密码登录
- 添加 JWT 认证中间件
- 编写单元测试"

# 5. 推送到远程仓库
git push origin feature/zhangsan-login-module

# 6. 在 GitHub 创建 Pull Request
# 访问 https://github.com/YOUR_USERNAME/HealthMonitoringAssistant/pulls
# 点击 "New Pull Request"
```

---

## 3. 分支策略（推荐）

```
main (生产分支，受保护)
  ↑
  |-- feature/zhangsan-login-module (功能分支)
  |-- feature/lisi-medication-module
  |-- bugfix/wangwu-ocr-issue
  |-- docs/liu-update-readme
```

### 分支命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `feature/` | 新功能开发 | `feature/zhangsan-user-auth` |
| `bugfix/` | Bug 修复 | `bugfix/lisi-login-error` |
| `docs/` | 文档更新 | `docs/wangwu-update-api-spec` |
| `refactor/` | 代码重构 | `refactor/liu-extract-utils` |

---

## 4. Commit 规范

使用 **Conventional Commits** 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 仅文档更改 |
| `style` | 代码格式调整（不影响功能） |
| `refactor` | 代码重构 |
| `test` | 添加或修改测试 |
| `chore` | 构建过程或辅助工具的变动 |

### 示例

```bash
# 简单提交
git commit -m "feat(auth): 添加用户注册接口"

# 详细提交
git commit -m "feat(medication): 实现用药提醒设置功能

- 添加 Medication 模型
- 实现 CRUD 接口
- 添加表单验证

Closes #12"
```

---

## 5. Pull Request 流程

### 5.1 创建 PR

1. 推送分支后，访问 GitHub 仓库
2. 点击 "Compare & pull request"
3. 填写 PR 信息：
   - **Title**: 简明描述改动（如 `feat: 实现用户登录功能`）
   - **Description**:
     ```markdown
     ## 改动内容
     - 实现手机号+密码登录
     - 添加 JWT 认证

     ## 测试情况
     - [x] 单元测试通过
     - [x] 手动测试通过

     ## 相关 Issue
     Closes #3
     ```
4. 选择 **Reviewers**（至少一位同事）
5. 点击 "Create pull request"

### 5.2 Code Review 流程

**作为 Reviewer：**
1. 在 PR 页面查看 Files changed
2. 点击具体代码行添加评论
3. 选择：
   - **Approve**: 同意合并
   - **Request changes**: 需要修改
   - **Comment**: 仅评论

**作为 Author：**
1. 根据 Review 意见修改代码
2. 提交新 commit（会自动更新 PR）
3. 回复 Review 评论
4. 请求重新 Review

### 5.3 合并 PR

当 PR 获得至少 1 个 Approve 后：
1. 点击 "Merge pull request"
2. 选择合并方式（推荐 **"Squash and merge"**）
3. 确认合并
4. 删除已合并的功能分支

---

## 6. 冲突解决

当 `git pull` 或 `git merge` 出现冲突时：

```bash
# 1. 查看冲突文件
git status

# 2. 编辑冲突文件，手动解决冲突
# 冲突标记：
# <<<<<<< HEAD
# 你的代码
# =======
# 他人代码
# >>>>>>> branch-name

# 3. 标记冲突已解决
git add <冲突文件>

# 4. 完成合并
git commit -m "merge: 解决与 main 分支的冲突"
```

---

## 7. 常用命令速查

```bash
# 查看状态
git status

# 查看分支列表
git branch -a

# 切换分支
git checkout <branch-name>

# 拉取最新代码
git pull origin main

# 查看提交历史
git log --oneline -10

# 撤销修改（未 add）
git checkout -- <file>

# 撤销 add（未 commit）
git reset HEAD <file>

# 查看远程仓库地址
git remote -v
```

---

## 8. 团队协作建议

### 8.1 开发前
- 查看 `memory/work-status.md` 了解项目状态
- 查看其他同事的日志避免重复工作
- 在日志中记录自己的工作计划

### 8.2 开发中
- 小步提交，频繁 commit
- 每个功能一个分支
- 及时 rebase 主分支避免冲突

### 8.3 开发后
- 写清晰的 PR 描述
- 确保测试通过
- 更新工作日志

---

## 9. 安全注意事项

- **永远不要提交 `.env` 文件**
- **不要提交包含密码、密钥的代码**
- **不要提交大型二进制文件**
- **敏感配置文件使用环境变量**

---

## 10. 获取帮助

遇到问题：
1. 查看本文档
2. 查看 [GitHub Docs](https://docs.github.com/cn)
3. 询问团队其他成员
4. 在 Issue 中记录问题
