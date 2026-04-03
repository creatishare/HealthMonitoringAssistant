#!/bin/bash
# ============================================
# 一键重启后端服务
# ============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/src/backend"
BACKEND_LOG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend.log"

echo -e "${YELLOW}正在重启后端服务...${NC}"

# 停止现有后端进程
if pgrep -f "tsx src/server.ts" >/dev/null 2>&1; then
    pkill -f "tsx src/server.ts"
    sleep 1
    echo -e "${GREEN}✓ 已停止旧后端进程${NC}"
else
    echo -e "${YELLOW}! 未检测到运行中的后端进程${NC}"
fi

# 启动后端
cd "$BACKEND_DIR"
nohup npx tsx src/server.ts > "$BACKEND_LOG" 2>&1 &
sleep 2

# 检查启动结果
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端启动成功 (PID: $!)${NC}"
    echo -e "  API 地址: http://localhost:3001"
    echo -e "  日志文件: $BACKEND_LOG"
    echo ""
    echo -e "${YELLOW}最近 10 行日志:${NC}"
    tail -n 10 "$BACKEND_LOG"
else
    echo -e "${RED}✗ 后端启动失败，请查看日志:${NC}"
    echo "  $BACKEND_LOG"
    tail -n 20 "$BACKEND_LOG"
    exit 1
fi
