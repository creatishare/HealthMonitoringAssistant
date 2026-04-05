#!/bin/bash
# ============================================
# 一键重启所有服务（后端 + Worker + 前端）
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/src/backend"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
BACKEND_LOG="$PROJECT_ROOT/backend.log"
WORKER_LOG="$PROJECT_ROOT/worker.log"

LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo -e "${YELLOW}正在重启所有服务...${NC}"

# 停止前端
if pgrep -f "vite" >/dev/null 2>&1; then
    pkill -f "vite"
    sleep 1
    echo -e "${GREEN}✓ 已停止旧前端进程${NC}"
fi

# 停止 Worker
if pgrep -f "reminderWorker" >/dev/null 2>&1; then
    pkill -f "reminderWorker"
    sleep 1
    echo -e "${GREEN}✓ 已停止旧 Worker 进程${NC}"
fi

# 停止现有后端进程
if pgrep -f "tsx src/server.ts" >/dev/null 2>&1; then
    pkill -f "tsx src/server.ts"
    sleep 1
    echo -e "${GREEN}✓ 已停止旧后端进程${NC}"
else
    echo -e "${YELLOW}! 未检测到运行中的后端进程${NC}"
fi

# 启动后端
echo -e "${YELLOW}正在启动后端...${NC}"
cd "$BACKEND_DIR"
nohup npx tsx src/server.ts > "$BACKEND_LOG" 2>&1 &
sleep 3

if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端启动成功${NC}"
else
    echo -e "${RED}✗ 后端启动失败，请查看日志:${NC}"
    echo "  $BACKEND_LOG"
    tail -n 20 "$BACKEND_LOG"
    exit 1
fi

# 启动 Worker
echo -e "${YELLOW}正在启动 Worker...${NC}"
cd "$BACKEND_DIR"
nohup npx tsx src/workers/reminderWorker.ts > "$WORKER_LOG" 2>&1 &
sleep 2

if pgrep -f "reminderWorker" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Worker 启动成功${NC}"
else
    echo -e "${YELLOW}! Worker 启动失败，查看日志:${NC}"
    echo "  $WORKER_LOG"
fi

# 启动前端
echo -e "${YELLOW}正在启动前端...${NC}"
cd "$FRONTEND_DIR"
nohup npm run dev >/dev/null 2>&1 &
sleep 4

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "${GREEN}✓ 前端启动成功${NC}"
else
    echo -e "${RED}✗ 前端启动失败${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}        所有服务已重启完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  本地访问:  http://localhost:3000"
if [ -n "$LOCAL_IP" ]; then
    echo -e "  局域网访问: http://${LOCAL_IP}:3000"
fi
echo -e "  后端 API:  http://localhost:3001"
echo -e "  测试账号:  13800138000 / Test123456"
echo ""
