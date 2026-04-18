#!/bin/bash
set -e

# =============================================================================
# HealthMonitoringAssistant 一键部署脚本
# 用法: ./deploy.sh
# =============================================================================

PROJECT_NAME="HealthMonitoringAssistant"
PROJECT_DIR="/opt/$PROJECT_NAME"
REPO_URL="https://github.com/creatishare/HealthMonitoringAssistant.git"

echo "========================================"
echo "  $PROJECT_NAME 部署脚本"
echo "========================================"
echo ""

# 检查是否以 root 运行
if [ "$EUID" -ne 0 ]; then
  echo "请使用 root 权限运行: sudo ./deploy.sh"
  exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
  echo "Docker 未安装，正在安装..."
  curl -fsSL https://get.docker.com | bash
  systemctl start docker
  systemctl enable docker
  echo "Docker 安装完成"
else
  echo "Docker 已安装"
fi

if ! command -v docker-compose &> /dev/null; then
  echo "Docker Compose 未安装，正在安装..."
  apt update && apt install -y docker-compose
  echo "Docker Compose 安装完成"
else
  echo "Docker Compose 已安装"
fi

# 克隆或更新代码
if [ -d "$PROJECT_DIR" ]; then
  echo "项目目录已存在，正在拉取最新代码..."
  cd "$PROJECT_DIR"
  git pull origin main
else
  echo "正在克隆项目代码..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
  echo ""
  echo "未找到 .env 配置文件"
  echo "请从 .env.example 复制并填写真实配置："
  echo "  cp .env.example .env"
  echo "  vim .env"
  echo ""
  echo "必须修改的配置项："
  echo "  - DB_PASSWORD: 数据库密码（必须修改！）"
  echo "  - JWT_SECRET: JWT 密钥（必须修改！）"
  echo "  - SMS_ACCESS_KEY / SMS_SECRET_KEY: 阿里云短信（如需短信功能）"
  echo "  - BAIDU_OCR_API_KEY / BAIDU_OCR_SECRET_KEY: 百度OCR（如需OCR功能）"
  echo ""
  exit 1
fi

# 构建并启动服务
echo ""
echo "正在构建并启动服务..."
docker-compose down
docker-compose up -d --build

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "服务状态检查："
docker-compose ps

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me)"
echo ""
echo "  常用命令："
echo "    查看日志:  docker-compose logs -f"
echo "    重启服务:  docker-compose restart"
echo "    停止服务:  docker-compose down"
echo "    更新代码:  cd $PROJECT_DIR && git pull && docker-compose up -d --build"
echo ""
echo "  当前使用 HTTP 访问（IP直连）"
echo "      正式生产环境请配置域名 + HTTPS + ICP备案"
echo ""
