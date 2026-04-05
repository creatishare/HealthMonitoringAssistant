#!/bin/bash
#启动方法：./stop-all.sh
# ============================================
# 一键停止所有服务
# ============================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}正在停止所有服务...${NC}"

# 停止前端
if pgrep -f "vite" >/dev/null 2>&1; then
    pkill -f "vite"
    echo -e "${GREEN}✓ 前端已停止${NC}"
else
    echo -e "${RED}✗ 前端未运行${NC}"
fi

# 停止 Worker
if pgrep -f "reminderWorker" >/dev/null 2>&1; then
    pkill -f "reminderWorker"
    echo -e "${GREEN}✓ Worker 已停止${NC}"
else
    echo -e "${RED}✗ Worker 未运行${NC}"
fi

# 停止后端
if pgrep -f "tsx src/server.ts" >/dev/null 2>&1; then
    pkill -f "tsx src/server.ts"
    echo -e "${GREEN}✓ 后端已停止${NC}"
else
    echo -e "${RED}✗ 后端未运行${NC}"
fi

# 停止 cpolar
if pgrep -f "cpolar http" >/dev/null 2>&1; then
    pkill -f "cpolar http"
    echo -e "${GREEN}✓ cpolar 已停止${NC}"
else
    echo -e "${RED}✗ cpolar 未运行${NC}"
fi

echo ""
echo -e "${GREEN}所有服务已停止${NC}"
echo -e "${YELLOW}提示: PostgreSQL 和 Redis 仍在后台运行${NC}"
