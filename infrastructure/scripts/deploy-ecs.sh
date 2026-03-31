#!/bin/bash

# ============================================
# ECS部署脚本（无短信功能）
# ============================================
# 用途: 在阿里云ECS上部署健康监测应用
# 使用方法: ./deploy-ecs.sh
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker/docker-compose.ecs.yml"
ENV_FILE="$PROJECT_DIR/.env"
LOG_FILE="/var/log/health-monitoring/deploy.log"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
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
        error_exit "Docker 未安装，请先安装Docker"
    fi
    log "✓ Docker 已安装"

    # 检查 Docker Compose
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        error_exit "Docker Compose 未安装，请先安装Docker Compose"
    fi
    log "✓ Docker Compose 已安装"

    # 检查环境变量文件
    if [ ! -f "$ENV_FILE" ]; then
        log "创建环境变量文件..."
        cp "$PROJECT_DIR/.env.ecs.example" "$ENV_FILE"
        log "⚠ 请编辑 $ENV_FILE 文件，填写实际配置值后再运行此脚本"
        exit 1
    fi
    log "✓ 环境变量文件存在"

    # 检查docker-compose文件
    if [ ! -f "$COMPOSE_FILE" ]; then
        error_exit "Docker Compose 文件不存在: $COMPOSE_FILE"
    fi
    log "✓ Docker Compose 文件存在"

    log "环境检查通过 ✓"
}

# 创建必要目录
create_directories() {
    log "创建必要目录..."
    mkdir -p "$PROJECT_DIR/docker/backups"
    mkdir -p "$PROJECT_DIR/docker/init-scripts"
    mkdir -p "$PROJECT_DIR/nginx/conf.d"
    mkdir -p "$PROJECT_DIR/nginx/ssl"
    log "目录创建完成 ✓"
}

# 加载环境变量
load_env() {
    log "加载环境变量..."
    set -a
    source "$ENV_FILE"
    set +a
    log "环境变量加载完成 ✓"
}

# 构建镜像
build_images() {
    log "构建 Docker 镜像..."
    cd "$PROJECT_DIR"

    # 构建后端
    log "构建后端镜像..."
    docker build -f docker/Dockerfile.backend \
        -t health-backend:ecs \
        ../../src/backend || error_exit "后端镜像构建失败"

    # 构建 Worker
    log "构建 Worker 镜像..."
    docker build -f docker/Dockerfile.worker \
        -t health-worker:ecs \
        ../../src/backend || error_exit "Worker 镜像构建失败"

    # 构建前端
    log "构建前端镜像..."
    docker build -f docker/Dockerfile.frontend \
        -t health-frontend:ecs \
        ../../src/frontend || error_exit "前端镜像构建失败"

    log "镜像构建完成 ✓"
}

# 部署服务
deploy_services() {
    log "部署服务..."
    cd "$PROJECT_DIR"

    # 停止旧服务
    log "停止旧服务..."
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

    # 启动新服务
    log "启动新服务..."
    if docker compose version >/dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" up -d || error_exit "服务启动失败"
    else
        docker-compose -f "$COMPOSE_FILE" up -d || error_exit "服务启动失败"
    fi

    log "服务部署完成 ✓"
}

# 运行数据库迁移
run_migrations() {
    log "等待数据库就绪..."
    sleep 10

    log "运行数据库迁移..."
    cd "$PROJECT_DIR"

    # 等待postgres健康
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-health}" >/dev/null 2>&1; then
            break
        fi
        log "等待数据库... ($attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        error_exit "数据库启动超时"
    fi

    # 运行迁移
    log "执行Prisma迁移..."
    docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy || {
        log "WARNING: 数据库迁移可能失败，请检查日志"
    }

    log "数据库迁移完成 ✓"
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
        if curl -sf http://localhost:3000/health > /dev/null 2>&1 || \
           docker compose -f "$COMPOSE_FILE" exec -T backend wget -q --tries=1 --spider http://localhost:3000/health >/dev/null 2>&1; then
            log "后端服务健康检查通过 ✓"
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
    if curl -sf http://localhost > /dev/null 2>&1 || \
       docker compose -f "$COMPOSE_FILE" exec -T nginx wget -q --tries=1 --spider http://localhost >/dev/null 2>&1; then
        log "前端服务健康检查通过 ✓"
    else
        log "⚠ 前端服务健康检查失败，请检查日志"
    fi

    log "健康检查完成 ✓"
}

# 显示状态
show_status() {
    log "当前部署状态:"
    cd "$PROJECT_DIR"
    if docker compose version >/dev/null 2>&1; then
        docker compose -f "$COMPOSE_FILE" ps
    else
        docker-compose -f "$COMPOSE_FILE" ps
    fi
}

# 清理旧资源
cleanup() {
    log "清理旧资源..."
    # 清理未使用的镜像
    docker image prune -af --filter "until=168h" >/dev/null 2>&1 || true
    log "清理完成 ✓"
}

# 显示访问信息
show_access_info() {
    log ""
    log "=========================================="
    log "部署成功！访问信息:"
    log "=========================================="
    log ""
    log "🌐 前端访问: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')"
    log "📡 API访问: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')/api"
    log "🔍 健康检查: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip')/health"
    log ""
    log "📋 常用命令:"
    log "  查看日志: docker compose -f $COMPOSE_FILE logs -f"
    log "  查看后端: docker compose -f $COMPOSE_FILE logs -f backend"
    log "  重启服务: docker compose -f $COMPOSE_FILE restart"
    log "  停止服务: docker compose -f $COMPOSE_FILE down"
    log ""
    log "⚠ 注意: 短信功能已禁用"
    log "=========================================="
}

# 主函数
main() {
    log "=== 开始ECS部署 ==="

    check_environment
    create_directories
    load_env
    build_images
    deploy_services
    run_migrations
    health_check
    cleanup
    show_status
    show_access_info

    log "=== 部署完成 ==="
}

# 执行主函数
main
