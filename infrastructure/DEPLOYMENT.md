# 部署操作手册

## 肾衰竭健康监测 Web 应用

**版本**: v1.0.0
**日期**: 2026-03-29
**作者**: DevOps 工程师

---

## 目录

1. [架构概览](#架构概览)
2. [费用估算](#费用估算)
3. [部署前准备](#部署前准备)
4. [服务器配置](#服务器配置)
5. [应用部署](#应用部署)
6. [CI/CD 配置](#cicd-配置)
7. [运维操作](#运维操作)
8. [故障排查](#故障排查)

---

## 架构概览

### 服务架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         负载均衡器 (SLB)                         │
│                     阿里云/腾讯云负载均衡                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Nginx                                  │
│              SSL终止 / 反向代理 / 静态资源服务                      │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Frontend     │    │   Backend     │    │    Worker     │
│  (Nginx)      │    │  (Node.js)    │    │  (Bull Queue) │
│               │    │               │    │               │
│ • React SPA   │    │ • REST API    │    │ • 用药提醒     │
│ • 静态资源     │    │ • 业务逻辑     │    │ • 预警检测     │
└───────────────┘    └───────┬───────┘    └───────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  PostgreSQL   │    │    Redis      │    │   第三方服务   │
│               │    │               │    │               │
│ • 用户数据     │    │ • 会话缓存     │    │ • 百度OCR     │
│ • 健康记录     │    │ • 任务队列     │    │ • 阿里云OSS   │
│ • 用药数据     │    │ • 热点数据     │    │ • 短信服务     │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Docker Compose 服务

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| nginx | nginx:1.24-alpine | 80, 443 | 反向代理 |
| web | health-frontend | 3000 | 前端静态资源 |
| backend | health-backend | 3001 | 后端 API |
| worker | health-worker | - | 定时任务 |
| postgres | postgres:14-alpine | 5432 | 数据库 |
| redis | redis:7-alpine | 6379 | 缓存/队列 |

---

## 费用估算

### MVP 阶段月度费用 (阿里云)

| 项目 | 配置 | 月费用 |
|------|------|--------|
| **ECS 云服务器** | 2核4G, 100GB SSD | ~100 元 |
| **RDS PostgreSQL** | 基础版, 1核1G, 50GB | ~150 元 |
| **Redis** | 256MB 主从版 | ~50 元 |
| **OSS 存储** | 50GB 标准存储 | ~5 元 |
| **OSS 流量** | 预估 100GB/月 | ~10 元 |
| **SLB 负载均衡** | 按量计费 | ~20 元 |
| **域名** | .com 域名 | ~5 元/月 |
| **SSL 证书** | Let's Encrypt | 免费 |
| **短信服务** | 按量计费 | ~20 元 |
| **百度 OCR** | 按量计费 | ~10 元 |
| **合计** | | **~370 元/月** |

### 升级配置建议

| 阶段 | 用户量 | 推荐配置 | 月费用 |
|------|--------|----------|--------|
| MVP | < 1000 | 2核4G + RDS基础版 | ~370 元 |
| 成长期 | 1000-5000 | 4核8G + RDS标准版 | ~800 元 |
| 成熟期 | 5000+ | 多实例 + RDS高可用 | ~2000 元 |

---

## 部署前准备

### 1. 云资源准备

- [ ] 购买云服务器 (ECS): 2核4G, CentOS 8 / Ubuntu 22.04
- [ ] 购买 RDS PostgreSQL: 基础版, 1核1G
- [ ] 购买 Redis: 256MB 主从版
- [ ] 开通 OSS 存储桶
- [ ] 配置负载均衡 SLB (可选)
- [ ] 购买域名并完成备案
- [ ] 申请 SSL 证书 (Let's Encrypt)

### 2. 第三方服务申请

- [ ] 百度智能云: 申请 OCR API Key
- [ ] 阿里云: 开通短信服务
- [ ] 阿里云: 开通 OSS 服务

### 3. 安全配置组

| 端口 | 协议 | 来源 | 说明 |
|------|------|------|------|
| 22 | TCP | 你的IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

---

## 服务器配置

### 1. 连接服务器

```bash
ssh root@your-server-ip
```

### 2. 安装 Docker

```bash
# CentOS
yum install -y yum-utils
docker yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io
systemctl start docker
systemctl enable docker

# Ubuntu
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl start docker
systemctl enable docker
```

### 3. 安装 Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

### 4. 创建项目目录

```bash
mkdir -p /opt/health-monitoring
cd /opt/health-monitoring
```

### 5. 配置 SSL 证书 (Let's Encrypt)

```bash
# 安装 Certbot
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  -v "/var/www/certbot:/var/www/certbot" \
  certbot/certbot certonly --standalone \
  -d your-domain.com -d www.your-domain.com

# 复制证书到项目目录
mkdir -p /opt/health-monitoring/infrastructure/nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/health-monitoring/infrastructure/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/health-monitoring/infrastructure/nginx/ssl/
```

---

## 应用部署

### 1. 拉取代码

```bash
cd /opt/health-monitoring
git clone https://github.com/your-org/health-monitoring.git .
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp infrastructure/.env.production .env

# 编辑环境变量
vi .env
```

**必填配置项**:

```bash
# 数据库
DATABASE_URL=postgresql://user:password@rds-endpoint:5432/health_monitoring

# Redis
REDIS_URL=redis://:password@redis-endpoint:6379

# JWT (使用随机生成的强密码)
JWT_SECRET=your-random-secret-key-32-chars
JWT_REFRESH_SECRET=your-random-refresh-secret-32-chars

# 加密密钥
ENCRYPTION_KEY=your-encryption-key-32-chars

# 第三方服务
BAIDU_OCR_API_KEY=your-baidu-key
BAIDU_OCR_SECRET_KEY=your-baidu-secret
SMS_ACCESS_KEY=your-aliyun-key
SMS_SECRET_KEY=your-aliyun-secret
OSS_ACCESS_KEY_ID=your-oss-key
OSS_ACCESS_KEY_SECRET=your-oss-secret
OSS_BUCKET=your-bucket
```

### 3. 启动服务

```bash
# 使用部署脚本
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh

# 或手动部署
cd infrastructure/docker
docker-compose -f docker-compose.prod.yml up -d

# 运行数据库迁移
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### 4. 验证部署

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 健康检查
curl http://localhost:3001/health
curl http://localhost:3000
```

---

## CI/CD 配置

### 1. GitHub Secrets 配置

在 GitHub 仓库设置中配置以下 Secrets:

| Secret | 说明 |
|--------|------|
| `SERVER_HOST` | 服务器 IP 或域名 |
| `SERVER_USER` | SSH 用户名 |
| `SSH_PRIVATE_KEY` | SSH 私钥 |
| `DATABASE_URL` | 数据库连接字符串 |
| `REDIS_URL` | Redis 连接字符串 |
| `JWT_SECRET` | JWT 密钥 |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥 |
| `ENCRYPTION_KEY` | 数据加密密钥 |
| `BAIDU_OCR_API_KEY` | 百度 OCR Key |
| `BAIDU_OCR_SECRET_KEY` | 百度 OCR Secret |
| `SMS_ACCESS_KEY` | 阿里云短信 Key |
| `SMS_SECRET_KEY` | 阿里云短信 Secret |
| `OSS_ACCESS_KEY_ID` | OSS Access Key |
| `OSS_ACCESS_KEY_SECRET` | OSS Secret |
| `OSS_BUCKET` | OSS Bucket 名称 |

### 2. 自动部署流程

1. 代码推送到 `main` 分支
2. GitHub Actions 自动构建 Docker 镜像
3. 推送到 GitHub Container Registry
4. 自动部署到生产服务器
5. 运行数据库迁移
6. 执行健康检查

### 3. 手动触发部署

```bash
# 在 GitHub 仓库页面
# Actions → Deploy Pipeline → Run workflow
```

---

## 运维操作

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f worker
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart worker
```

### 数据库备份

```bash
# 手动执行备份
./infrastructure/scripts/backup.sh

# 配置定时任务 (每天凌晨2点)
crontab -e
# 添加: 0 2 * * * /opt/health-monitoring/infrastructure/scripts/backup.sh
```

### 健康检查

```bash
# 手动执行健康检查
./infrastructure/scripts/health-check.sh

# 配置定时任务 (每5分钟)
crontab -e
# 添加: */5 * * * * /opt/health-monitoring/infrastructure/scripts/health-check.sh
```

### 更新 SSL 证书

```bash
# 自动续期 (Certbot 会自动处理)
# 手动续期
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  certbot/certbot renew

# 重启 Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 故障排查

### 服务无法启动

```bash
# 检查日志
docker-compose -f docker-compose.prod.yml logs <service-name>

# 检查端口占用
netstat -tlnp | grep 3000

# 检查磁盘空间
df -h
```

### 数据库连接失败

```bash
# 检查数据库容器
docker-compose -f docker-compose.prod.yml ps postgres
docker-compose -f docker-compose.prod.yml logs postgres

# 测试连接
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U health
```

### 502 Bad Gateway

```bash
# 检查后端服务
docker-compose -f docker-compose.prod.yml ps backend
curl http://localhost:3001/health

# 检查 Nginx 配置
docker-compose -f docker-compose.prod.yml logs nginx
```

### 内存不足

```bash
# 查看内存使用
free -h

# 重启服务释放内存
docker-compose -f docker-compose.prod.yml restart

# 或增加 Swap 空间
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 附录

### 常用命令速查

```bash
# 部署
cd /opt/health-monitoring
./infrastructure/scripts/deploy.sh

# 查看状态
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml top

# 进入容器
docker-compose -f docker-compose.prod.yml exec backend sh
docker-compose -f docker-compose.prod.yml exec postgres psql -U health

# 数据库操作
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio

# 清理
docker system prune -a
docker volume prune
```

### 联系支持

- 技术问题: 提交 GitHub Issue
- 紧急故障: 联系运维团队
