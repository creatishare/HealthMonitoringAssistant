#!/bin/bash

# ============================================
# 数据库备份脚本
# ============================================
# 用途: 自动备份 PostgreSQL 数据库
# 使用方法: ./backup.sh
# 定时任务: 0 2 * * * /opt/health-monitoring/infrastructure/scripts/backup.sh
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/backup/health-monitoring"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="health_monitoring"
RETENTION_DAYS=30
LOG_FILE="/var/log/health-monitoring/backup.log"

# OSS 配置 (可选)
OSS_BUCKET="${OSS_BUCKET:-}"
OSS_ENDPOINT="${OSS_ENDPOINT:-}"

# 创建目录
mkdir -p "$BACKUP_DIR"
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

# 执行备份
backup_database() {
    local backup_file="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql"

    log "开始备份数据库: $DB_NAME"

    # 使用 docker-compose 执行 pg_dump
    cd "$SCRIPT_DIR/../docker"
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
        -U health \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --no-owner \
        --no-privileges \
        > "$backup_file" || error_exit "数据库备份失败"

    # 压缩备份文件
    log "压缩备份文件..."
    gzip -f "$backup_file"
    local compressed_file="${backup_file}.gz"

    # 验证备份文件
    if [ ! -f "$compressed_file" ]; then
        error_exit "备份文件未生成"
    fi

    local file_size
    file_size=$(du -h "$compressed_file" | cut -f1)
    log "备份完成: $compressed_file (大小: $file_size)"

    # 上传到 OSS (如果配置了)
    if [ -n "$OSS_BUCKET" ] && command -v ossutil &> /dev/null; then
        upload_to_oss "$compressed_file"
    fi

    # 清理过期备份
    cleanup_old_backups

    log "备份任务完成"
}

# 上传到 OSS
upload_to_oss() {
    local file="$1"
    local filename
    filename=$(basename "$file")

    log "上传到 OSS..."
    ossutil cp "$file" "oss://${OSS_BUCKET}/backups/${filename}" || {
        log "WARNING: OSS 上传失败"
        return 1
    }
    log "OSS 上传完成"
}

# 清理过期备份
cleanup_old_backups() {
    log "清理 ${RETENTION_DAYS} 天前的备份..."

    # 本地备份
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

    # OSS 备份 (如果配置了)
    if [ -n "$OSS_BUCKET" ] && command -v ossutil &> /dev/null; then
        # 获取过期文件列表并删除
        local cutoff_date
        cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)

        ossutil ls "oss://${OSS_BUCKET}/backups/" | grep "${DB_NAME}_" | while read -r line; do
            local file_date
            file_date=$(echo "$line" | grep -oE '[0-9]{8}_[0-9]{6}' | head -1 | cut -d'_' -f1)
            if [ "$file_date" -lt "$cutoff_date" ]; then
                local oss_path
                oss_path=$(echo "$line" | awk '{print $1}')
                ossutil rm "$oss_path" > /dev/null 2>&1 || true
            fi
        done
    fi

    log "清理完成"
}

# 主函数
main() {
    log "=== 开始数据库备份任务 ==="
    backup_database
}

# 执行主函数
main "$@"
