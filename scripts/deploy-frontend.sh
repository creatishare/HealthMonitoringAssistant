#!/bin/bash

# =============================================================================
# 前端部署脚本 (Frontend Deploy Script)
# =============================================================================
# 用途：一键更新前端代码并重新构建 Docker 容器
# 运行位置：服务器（阿里云 ECS）
# 运行方式：./scripts/deploy-frontend.sh
#
# 前置条件：
#   1. 本地代码已 push 到 GitHub 且 push 成功
#   2. 已在服务器上配置好 Docker 和 docker-compose
#   3. 当前用户在 docker 组中，或可用 sudo 执行 docker 命令
# =============================================================================

# --- 颜色定义（让终端输出更易读）---
# \033[32m = 绿色（成功/信息）
# \033[33m = 黄色（警告/步骤）
# \033[31m = 红色（错误）
# \033[0m  = 重置颜色
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

# --- 辅助函数：打印带颜色的步骤信息 ---
# 用法：step "步骤编号" "步骤描述"
step() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${YELLOW} 步骤 $1: $2${RESET}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# --- 辅助函数：打印成功信息 ---
success() {
  echo -e "${GREEN}✓ $1${RESET}"
}

# --- 辅助函数：打印错误信息并退出 ---
# 用法：error "错误描述"
error() {
  echo -e "${RED}✗ 错误: $1${RESET}"
  exit 1
}

# =============================================================================
# 步骤 0: 检查运行环境
# =============================================================================
step "0" "检查运行环境"

# 检查是否在正确的目录下（根据实际部署路径调整）
PROJECT_DIR="/opt/HealthMonitoringAssistant"
if [ "$PWD" != "$PROJECT_DIR" ]; then
  echo "当前目录: $PWD"
  echo "目标目录: $PROJECT_DIR"
  echo "正在切换到项目目录..."
  cd "$PROJECT_DIR" || error "无法进入项目目录 $PROJECT_DIR，请检查路径是否正确"
fi
success "已进入项目目录: $PWD"

# 检查 docker-compose 是否可用
if ! command -v docker-compose &> /dev/null; then
  error "未找到 docker-compose 命令，请先安装 Docker Compose"
fi
success "docker-compose 已安装"

# 检查 docker 是否可用
if ! command -v docker &> /dev/null; then
  error "未找到 docker 命令，请先安装 Docker"
fi
success "Docker 已安装"

# =============================================================================
# 步骤 1: 从 GitHub 拉取最新代码
# =============================================================================
step "1" "从 GitHub 拉取最新代码"

# 说明：
#   git pull 会从远程仓库（GitHub）下载最新的代码变更。
#   如果本地有未提交的修改，pull 会失败，所以确保服务器上不做本地修改。
#   origin main 表示从 origin 这个远程地址的 main 分支拉取。
#
# 常见问题：
#   - 如果报错 "RPC failed; curl 16 Error in the HTTP2 framing layer"
#     解决：git config --global http.version HTTP/1.1

echo "执行: git pull origin main"
git pull origin main

# 检查上一条命令是否成功
# $? 是 Shell 的特殊变量，存储上一条命令的退出状态码
# 0 表示成功，非 0 表示失败
if [ $? -ne 0 ]; then
  error "git pull 失败，请检查网络连接或 Git 配置"
fi

success "代码拉取成功"

# 显示最新的 commit 信息，确认拉取到了正确的版本
echo ""
echo "最新提交信息："
git log -1 --oneline

# =============================================================================
# 步骤 2: 删除旧的前端 Docker 镜像（解决缓存问题）
# =============================================================================
step "2" "删除旧的前端 Docker 镜像（关键！解决缓存不更新问题）"

# 说明：
#   Docker 构建时默认使用缓存来加速。如果前端代码更新了，但依赖（package.json）
#   没有变化，Docker 会认为构建层没有变化，直接使用旧的缓存层，导致页面不更新。
#
#   解决方法：先删除旧的前端镜像，强制 Docker 下次重新构建。
#
#   镜像名称规则：docker-compose.yml 中定义的 service 名称 + "_" + 目录名前缀

FRONTEND_IMAGE="healthmonitoringassistant_frontend:latest"

echo "执行: docker rmi $FRONTEND_IMAGE"
docker rmi "$FRONTEND_IMAGE" 2>/dev/null

# 检查删除结果
# 注意：docker rmi 可能返回 "No such image"（镜像不存在），这是正常的，不影响部署
if [ $? -eq 0 ]; then
  success "旧镜像已删除"
else
  echo "旧镜像不存在或已被删除（这是正常的，继续执行）"
fi

# =============================================================================
# 步骤 3: 重新构建前端容器（不使用缓存）
# =============================================================================
step "3" "重新构建前端容器（不使用缓存）"

# 说明：
#   --no-cache 参数强制 Docker 不使用任何缓存，从头开始构建。
#   这能确保最新的代码变更被编译进镜像中。
#   只构建 frontend 服务，不重建其他服务（如 backend、postgres、redis）。

echo "执行: docker-compose build --no-cache frontend"
docker-compose build --no-cache frontend

if [ $? -ne 0 ]; then
  error "前端镜像构建失败，请检查上面的错误日志"
fi

success "前端镜像构建成功"

# =============================================================================
# 步骤 4: 重启所有服务
# =============================================================================
step "4" "重启所有服务"

# 说明：
#   docker-compose up -d 会以守护进程（后台）模式启动所有服务。
#   -d = detached（后台运行）
#   如果服务已经在运行，up 命令会重新创建有变化的容器，保持其他容器不变。

echo "执行: docker-compose up -d"
docker-compose up -d

if [ $? -ne 0 ]; then
  error "服务启动失败"
fi

success "所有服务已重启"

# =============================================================================
# 步骤 5: 验证部署结果
# =============================================================================
step "5" "验证部署结果"

# 5.1 检查所有容器是否都在运行
echo ""
echo "容器状态："
docker-compose ps

# 5.2 检查前端容器是否正常运行
# grep -q 表示安静模式，只返回状态不输出内容
if docker-compose ps | grep -q "frontend.*Up"; then
  success "前端容器运行正常"
else
  error "前端容器未正常运行，请检查日志"
fi

# 5.3 检查 nginx 容器是否正常运行
if docker-compose ps | grep -q "nginx.*Up"; then
  success "nginx 容器运行正常"
else
  error "nginx 容器未正常运行，请检查日志"
fi

# 5.4 显示前端容器最近 10 行日志（快速确认构建产物时间戳）
echo ""
echo "前端容器最近日志（验证构建时间）："
docker-compose logs --tail=10 frontend

# =============================================================================
# 部署完成
# =============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}  前端部署完成！${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo "现在可以打开浏览器访问你的应用，验证改动是否生效。"
echo "如果页面没有变化，尝试按 Ctrl+F5 强制刷新（清除浏览器缓存）。"
echo ""
