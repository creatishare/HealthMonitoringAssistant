#!/bin/bash

# ============================================
# 健康检查脚本
# ============================================
# 用途: 检查各服务健康状态
# 使用方法: ./health-check.sh
# 定时任务: */5 * * * * /opt/health-monitoring/infrastructure/scripts/health-check.sh
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/health-monitoring/health-check.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"
COMPOSE_FILE="${SCRIPT_DIR}/../docker/docker-compose.prod.yml"

# 服务配置
BACKEND_URL="http://localhost:3001/health"
FRONTEND_URL="http://localhost:3000"
NGINX_URL="http://localhost/health"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 发送告警
send_alert() {
    local service="$1"
    local message="$2"

    log "ALERT: [$service] $message"

    # 如果有配置钉钉/Slack Webhook，发送告警
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"msgtype\":\"text\",\"text\":{\"content\":\"[肾健康助手] 告警: $service - $message\"}}" \
            > /dev/null || true
    fi
}

# 检查服务
check_service() {
    local name="$1"
    local url="$2"

    if curl -sf "$url" > /dev/null 2>&1; then
        log "OK: $name is healthy"
        return 0
    else
        log "ERROR: $name is DOWN (URL: $url)"
        send_alert "$name" "服务不可用"
        return 1
    fi
}

# 检查容器状态
check_containers() {
    local failed=0

    for service in postgres redis backend worker web nginx; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            log "OK: Container $service is running"
        else
            log "ERROR: Container $service is not running"
            send_alert "$service" "容器未运行"
            failed=1
        fi
    done

    return $failed
}

# 检查磁盘空间
check_disk() {
    local usage
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -gt 85 ]; then
        log "WARNING: Disk usage is ${usage}%"
        send_alert "Disk" "磁盘使用率超过85%: ${usage}%"
        return 1
    elif [ "$usage" -gt 70 ]; then
        log "WARNING: Disk usage is ${usage}%"
        return 0
    else
        log "OK: Disk usage is ${usage}%"
        return 0
    fi
}

# 检查内存
check_memory() {
    local usage
    usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')

    if [ "$usage" -gt 90 ]; then
        log "WARNING: Memory usage is ${usage}%"
        send_alert "Memory" "内存使用率超过90%: ${usage}%"
        return 1
    elif [ "$usage" -gt 80 ]; then
        log "WARNING: Memory usage is ${usage}%"
        return 0
    else
        log "OK: Memory usage is ${usage}%"
        return 0
    fi
}

# 检查数据库连接
check_database() {
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U health > /dev/null 2>&1; then
        log "OK: Database is ready"
        return 0
    else
        log "ERROR: Database is not ready"
        send_alert "Database" "数据库连接失败"
        return 1
    fi
}

# 主函数
main() {
    log "=== 开始健康检查 ==="

    local failed=0

    # 检查各服务
    check_service "Backend" "$BACKEND_URL" || failed=1
    check_service "Frontend" "$FRONTEND_URL" || failed=1
    check_service "Nginx" "$NGINX_URL" || failed=1

    # 检查容器
    check_containers || failed=1

    # 检查资源
    check_disk || failed=1
    check_memory || failed=1

    # 检查数据库
    check_database || failed=1

    if [ $failed -eq 0 ]; then
        log "=== 健康检查完成: 所有服务正常 ==="
    else
        log "=== 健康检查完成: 发现异常 ==="
    fi

    return $failed
}

# 执行主函数
main "$@"
