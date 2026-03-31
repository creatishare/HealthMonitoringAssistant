#!/bin/bash
# ============================================
# 本地开发启动脚本 - 肾衰竭健康监测应用
# ============================================
# 启动依赖服务(PostgreSQL + Redis) + 前端 + 后端
# 配合 cpolar 进行内网穿透测试
# ============================================

set -e

# 添加 cpolar 到 PATH
export PATH="$HOME/.local/bin:$PATH"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  肾衰竭健康监测应用 - 本地启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# ----------------------------------------
# 1. 启动 PostgreSQL & Redis
# ----------------------------------------
echo -e "\n${YELLOW}[1/5] 启动基础设施服务 (PostgreSQL + Redis)...${NC}"
cd "$PROJECT_ROOT/infrastructure/docker"
docker compose up -d postgres redis

# 等待 PostgreSQL 就绪
echo -e "${YELLOW}    等待 PostgreSQL 就绪...${NC}"
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U health -d health_monitoring > /dev/null 2>&1; then
        echo -e "${GREEN}    PostgreSQL 已就绪${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "PostgreSQL 启动超时，请检查 Docker 日志"
        exit 1
    fi
done

# 等待 Redis 就绪
echo -e "${YELLOW}    等待 Redis 就绪...${NC}"
for i in {1..30}; do
    if docker compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}    Redis 已就绪${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "Redis 启动超时，请检查 Docker 日志"
        exit 1
    fi
done

# ----------------------------------------
# 2. 启动后端
# ----------------------------------------
echo -e "\n${YELLOW}[2/5] 准备后端服务...${NC}"
cd "$PROJECT_ROOT/src/backend"

# 生成 Prisma Client (如果缺失)
if [ ! -d "node_modules/@prisma/client" ]; then
    echo -e "${YELLOW}    生成 Prisma Client...${NC}"
    npx prisma generate
fi

# 运行数据库迁移
echo -e "${YELLOW}    运行数据库迁移...${NC}"
npx prisma migrate dev --name init --skip-generate --skip-seed 2>/dev/null || npx prisma migrate deploy

echo -e "${GREEN}    后端数据库准备完成${NC}"

# 后台启动后端
echo -e "${YELLOW}    启动后端服务 (端口: 3001)...${NC}"
nohup npx tsx watch src/server.ts > "$PROJECT_ROOT/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PROJECT_ROOT/.backend.pid"
sleep 2

# 检查后端是否启动成功
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${YELLOW}    后端启动失败，查看日志: $PROJECT_ROOT/backend.log${NC}"
    exit 1
fi

echo -e "${GREEN}    后端已启动 (PID: $BACKEND_PID)${NC}"

# ----------------------------------------
# 3. 启动前端
# ----------------------------------------
echo -e "\n${YELLOW}[3/5] 启动前端服务 (端口: 3000)...${NC}"
cd "$PROJECT_ROOT/src/frontend"

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}    安装前端依赖...${NC}"
    npm install
fi

echo -e "${GREEN}    前端服务启动中...${NC}"
echo -e "${BLUE}    本地访问: http://localhost:3000${NC}"
echo -e "${YELLOW}    按 Ctrl+C 停止前端服务${NC}"

# 捕获 Ctrl+C，优雅停止后端和前端
cleanup() {
    echo -e "\n${YELLOW}[4/5] 收到退出信号，正在停止服务...${NC}"
    if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
        BACKEND_PID=$(cat "$PROJECT_ROOT/.backend.pid")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            echo -e "${GREEN}    后端已停止${NC}"
        fi
        rm -f "$PROJECT_ROOT/.backend.pid"
    fi
    echo -e "${GREEN}    前端已停止${NC}"
    echo -e "${YELLOW}[5/5] 基础设施服务 (PostgreSQL + Redis) 仍在后台运行${NC}"
    echo -e "${YELLOW}    如需停止，请运行: cd infrastructure/docker && docker compose down${NC}"
    exit 0
}
trap cleanup INT TERM

# 前台启动前端
npm run dev
