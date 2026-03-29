#!/bin/bash

# ============================================
# 部署脚本
# ============================================
# 用途: 手动部署应用到生产环境
# 使用方法: ./deploy.sh [version]
#   version: 可选，指定部署版本 (默认: latest)
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="/opt/health-monitoring"
COMPOSE_FILE="$SCRIPT_DIR/../docker/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env"
LOG_FILE="/var/log/health-monitoring/deploy.log"
VERSION="${1:-latest}"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 错误处理
error_exit() {
    log "ERROR: $1"
    exit 1
}

# 检查环境
check_environment() {
    log "检查部署环境..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker 未安装"
    fi

    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error_exit "Docker Compose 未安装"
    fi

    # 检查环境变量文件
    if [ ! -f "$ENV_FILE" ]; then
        error_exit "环境变量文件不存在: $ENV_FILE"
    fi

    # 检查 SSL 证书
    if [ ! -f "$SCRIPT_DIR/../nginx/ssl/fullchain.pem" ]; then
        log "WARNING: SSL 证书不存在，将使用 HTTP"
    fi

    log "环境检查通过"
}

# 拉取代码
pull_code() {
    log "拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull origin main || error_exit "代码拉取失败"
    log "代码更新完成"
}

# 构建镜像
build_images() {
    log "构建 Docker 镜像..."
    cd "$PROJECT_DIR"

    # 构建后端
    docker build -f infrastructure/docker/Dockerfile.backend \
        -t health-backend:$VERSION \
        ./src/backend || error_exit "后端镜像构建失败"

    # 构建 Worker
    docker build -f infrastructure/docker/Dockerfile.worker \
        -t health-worker:$VERSION \
        ./src/backend || error_exit "Worker 镜像构建失败"

    # 构建前端
    docker build -f infrastructure/docker/Dockerfile.frontend \
        -t health-frontend:$VERSION \
        ./src/frontend || error_exit "前端镜像构建失败"

    log "镜像构建完成"
}

# 部署服务
deploy_services() {
    log "部署服务..."
    cd "$PROJECT_DIR"

    # 加载环境变量
    export $(grep -v '^#' "$ENV_FILE" | xargs)

    # 停止旧服务
    log "停止旧服务..."
    docker-compose -f "$COMPOSE_FILE" down || true

    # 启动新服务
    log "启动新服务..."
    docker-compose -f "$COMPOSE_FILE" up -d || error_exit "服务启动失败"

    log "服务部署完成"
}

# 运行数据库迁移
run_migrations() {
    log "运行数据库迁移..."
    cd "$PROJECT_DIR"

    # 等待数据库就绪
    sleep 5

    # 运行迁移
    docker-compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy || {
        log "WARNING: 数据库迁移可能失败，请检查日志"
    }

    log "数据库迁移完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."

    local max_attempts=30
    local attempt=1

    # 等待服务启动
    sleep 10

    # 检查后端
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
            log "后端服务健康检查通过"
            break
        fi
        log "等待后端服务... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        error_exit "后端服务健康检查失败"
    fi

    # 检查前端
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        log "前端服务健康检查通过"
    else
        error_exit "前端服务健康检查失败"
    fi

    log "所有服务健康检查通过"
}

# 清理旧资源
cleanup() {
    log "清理旧资源..."

    # 清理未使用的镜像
    docker image prune -af --filter "until=168h" || true

    # 清理未使用的卷
    docker volume prune -f || true

    log "清理完成"
}

# 回滚功能
rollback() {
    log "执行回滚..."

    # 停止当前服务
    docker-compose -f "$COMPOSE_FILE" down

    # 使用上一个版本
    docker-compose -f "$COMPOSE_FILE" up -d

    log "回滚完成"
}

# 显示部署状态
show_status() {
    log "当前部署状态:"
    docker-compose -f "$COMPOSE_FILE" ps
}

# 主函数
main() {
    log "=== 开始部署 (版本: $VERSION) ==="

    check_environment
    pull_code
    build_images
    deploy_services
    run_migrations
    health_check
    cleanup
    show_status

    log "=== 部署完成 ==="
}

# 处理命令行参数
case "${1:-}" in
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    *)
        main
        ;;
esac
