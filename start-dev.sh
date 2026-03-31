#!/bin/bash
# ============================================
# 肾衰竭健康监测应用 - 本地开发一键启动脚本
# ============================================
# 用法: ./start-dev.sh [命令]
# 命令:
#   start    - 启动所有服务（默认）
#   stop     - 停止所有服务
#   restart  - 重启所有服务
#   status   - 查看服务状态
#   cpolar   - 启动 cpolar 内网穿透
# ============================================

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/src/backend"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"

# 添加 cpolar 到 PATH
export PATH="$HOME/.local/bin:$PATH"

# 日志文件
BACKEND_LOG="$PROJECT_ROOT/backend.log"

# 显示帮助
show_help() {
    echo -e "${BLUE}肾衰竭健康监测应用 - 本地开发工具${NC}"
    echo ""
    echo "用法: ./start-dev.sh [命令]"
    echo ""
    echo "命令:"
    echo "  start    启动所有服务（PostgreSQL、Redis、后端、前端）"
    echo "  stop     停止所有服务"
    echo "  restart  重启所有服务"
    echo "  status   查看服务状态"
    echo "  cpolar   启动 cpolar 内网穿透"
    echo "  help     显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./start-dev.sh start   # 启动所有服务"
    echo "  ./start-dev.sh cpolar  # 启动内网穿透"
}

# 检查服务状态
check_status() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}           服务状态检查${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # PostgreSQL
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL${NC}  运行中 (localhost:5432)"
    else
        echo -e "${RED}✗ PostgreSQL${NC}  未运行"
    fi

    # Redis
    if redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis${NC}       运行中 (localhost:6379)"
    else
        echo -e "${RED}✗ Redis${NC}       未运行"
    fi

    # 后端 API
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 后端 API${NC}    运行中 (http://localhost:3001)"
    else
        echo -e "${RED}✗ 后端 API${NC}    未运行"
    fi

    # 前端
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo -e "${GREEN}✓ 前端 Web${NC}    运行中 (http://localhost:3000)"
    else
        echo -e "${RED}✗ 前端 Web${NC}    未运行"
    fi

    # cpolar
    if pgrep -f "cpolar http" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ cpolar${NC}     运行中"
        echo -e "${YELLOW}  查看公网地址: http://localhost:4040${NC}"
    else
        echo -e "${RED}✗ cpolar${NC}     未运行"
    fi

    echo ""
}

# 启动服务
start_services() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}     启动肾衰竭健康监测应用${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # 1. 检查 PostgreSQL
    echo -e "${YELLOW}[1/5] 检查 PostgreSQL...${NC}"
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${RED}  PostgreSQL 未运行，请执行: brew services start postgresql@14${NC}"
        exit 1
    fi
    echo -e "${GREEN}  PostgreSQL 运行中${NC}"

    # 2. 检查 Redis
    echo -e "${YELLOW}[2/5] 检查 Redis...${NC}"
    if ! redis-cli ping >/dev/null 2>&1; then
        echo -e "${RED}  Redis 未运行，请执行: brew services start redis${NC}"
        exit 1
    fi
    echo -e "${GREEN}  Redis 运行中${NC}"

    # 3. 启动后端
    echo -e "${YELLOW}[3/5] 启动后端服务...${NC}"
    if pgrep -f "tsx src/server.ts" >/dev/null 2>&1; then
        echo -e "${GREEN}  后端已在运行${NC}"
    else
        cd "$BACKEND_DIR"
        nohup npx tsx src/server.ts > "$BACKEND_LOG" 2>&1 &
        sleep 3
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            echo -e "${GREEN}  后端启动成功 (PID: $!)${NC}"
        else
            echo -e "${RED}  后端启动失败，查看日志: $BACKEND_LOG${NC}"
        fi
    fi

    # 4. 启动前端
    echo -e "${YELLOW}[4/5] 启动前端服务...${NC}"
    if pgrep -f "vite" >/dev/null 2>&1; then
        echo -e "${GREEN}  前端已在运行${NC}"
    else
        cd "$FRONTEND_DIR"
        nohup npm run dev >/dev/null 2>&1 &
        sleep 4
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
            echo -e "${GREEN}  前端启动成功${NC}"
        else
            echo -e "${RED}  前端启动失败${NC}"
        fi
    fi

    # 5. 显示访问信息
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}        所有服务已启动！${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "  ${YELLOW}本地访问:${NC}  http://localhost:3000"
    echo -e "  ${YELLOW}后端 API:${NC}  http://localhost:3001"
    echo -e "  ${YELLOW}测试账号:${NC}  13800138000 / Test123456"
    echo ""
    echo -e "  ${YELLOW}查看后端日志:${NC} tail -f $BACKEND_LOG"
    echo -e "  ${YELLOW}启动内网穿透:${NC} ./start-dev.sh cpolar"
    echo ""
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}正在停止服务...${NC}"

    # 停止前端
    if pgrep -f "vite" >/dev/null 2>&1; then
        pkill -f "vite"
        echo -e "${GREEN}✓ 前端已停止${NC}"
    fi

    # 停止后端
    if pgrep -f "tsx src/server.ts" >/dev/null 2>&1; then
        pkill -f "tsx src/server.ts"
        echo -e "${GREEN}✓ 后端已停止${NC}"
    fi

    # 停止 cpolar
    if pgrep -f "cpolar http" >/dev/null 2>&1; then
        pkill -f "cpolar http"
        echo -e "${GREEN}✓ cpolar 已停止${NC}"
    fi

    echo -e "${GREEN}所有服务已停止${NC}"
    echo -e "${YELLOW}提示: PostgreSQL 和 Redis 仍在后台运行${NC}"
}

# 启动 cpolar
start_cpolar() {
    echo -e "${YELLOW}启动 cpolar 内网穿透...${NC}"

    if ! command -v cpolar &>/dev/null; then
        if [ -f "$HOME/.local/bin/cpolar" ]; then
            export PATH="$HOME/.local/bin:$PATH"
        else
            echo -e "${RED}错误: cpolar 未安装${NC}"
            echo "请从 https://dashboard.cpolar.com 下载安装"
            exit 1
        fi
    fi

    # 检查 authtoken
    if [ ! -f "$HOME/.cpolar/cpolar.yml" ]; then
        echo -e "${YELLOW}首次使用需要配置 authtoken${NC}"
        echo "请从 https://dashboard.cpolar.com 获取 authtoken"
        read -p "请输入 authtoken: " token
        cpolar authtoken "$token"
    fi

    # 启动 cpolar
    if pgrep -f "cpolar http" >/dev/null 2>&1; then
        echo -e "${GREEN}cpolar 已在运行${NC}"
    else
        cpolar http 3000 > /dev/null 2>&1 &
        sleep 2
        echo -e "${GREEN}cpolar 已启动${NC}"
    fi

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}     内网穿透已启动！${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "  ${YELLOW}公网地址:${NC} http://localhost:4040 查看"
    echo -e "  ${YELLOW}管理界面:${NC} http://localhost:4040"
    echo ""
}

# 主逻辑
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_services
        ;;
    status)
        check_status
        ;;
    cpolar)
        start_cpolar
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
