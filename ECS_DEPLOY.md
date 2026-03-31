# ECS 快速部署指南（无短信功能）

## 概述

本指南帮助你在阿里云ECS上快速部署肾健康助手应用，**不包含短信功能**。

## 前置要求

- 阿里云ECS服务器（推荐2核4G以上，CentOS 8/Ubuntu 22.04）
- 已配置安全组：开放80端口（HTTP）
- 已安装Docker和Docker Compose

## 部署步骤

### 1. 连接服务器

```bash
ssh root@your-ecs-ip
```

### 2. 安装Docker（如未安装）

```bash
# CentOS
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# Ubuntu
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
```

### 3. 克隆项目

```bash
cd /opt
git clone https://github.com/your-org/health-monitoring.git
cd health-monitoring
```

### 4. 配置环境变量

```bash
cd infrastructure
cp .env.ecs.example .env
vi .env  # 编辑配置文件
```

**必须修改的配置项：**

```bash
# 数据库密码（务必修改）
POSTGRES_PASSWORD=your-strong-password

# Redis密码（务必修改）
REDIS_PASSWORD=your-redis-password

# JWT密钥（生成命令：openssl rand -base64 32）
JWT_SECRET=your-jwt-secret-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-32-chars

# 加密密钥（生成命令：openssl rand -base64 32）
ENCRYPTION_KEY=your-encryption-key-32-chars

# 百度OCR（已配置好）
BAIDU_OCR_API_KEY=your-baidu-key
BAIDU_OCR_SECRET_KEY=your-baidu-secret
```

### 5. 执行部署

```bash
chmod +x scripts/deploy-ecs.sh
./scripts/deploy-ecs.sh
```

部署过程约5-10分钟，取决于网络速度。

### 6. 验证部署

```bash
# 查看服务状态
docker compose -f docker/docker-compose.ecs.yml ps

# 查看后端日志
docker compose -f docker/docker-compose.ecs.yml logs -f backend

# 健康检查
curl http://localhost:3000/health
```

## 访问应用

部署完成后，通过浏览器访问：

```
http://your-ecs-ip
```

## 功能清单

### ✅ 已启用功能

- [x] 用户注册/登录/找回密码
- [x] 健康数据录入（手动+OCR识别）
- [x] 健康趋势分析
- [x] 用药管理
- [x] 指标预警（应用内）
- [x] 检验报告OCR识别（百度AI）

### ❌ 已禁用功能

- [ ] 短信通知（未配置SMS）
- [ ] 短信验证码登录

## 常用命令

```bash
# 查看所有日志
docker compose -f docker/docker-compose.ecs.yml logs -f

# 查看后端日志
docker compose -f docker/docker-compose.ecs.yml logs -f backend

# 重启服务
docker compose -f docker/docker-compose.ecs.yml restart

# 停止服务
docker compose -f docker/docker-compose.ecs.yml down

# 进入后端容器
docker compose -f docker/docker-compose.ecs.yml exec backend sh

# 数据库备份
docker compose -f docker/docker-compose.ecs.yml exec postgres pg_dump -U health_prod health_monitoring_prod > backup.sql
```

## 故障排查

### 服务无法启动

```bash
# 检查端口占用
netstat -tlnp | grep 80

# 查看详细日志
docker compose -f docker/docker-compose.ecs.yml logs backend
```

### 数据库连接失败

```bash
# 检查postgres状态
docker compose -f docker/docker-compose.ecs.yml ps postgres
docker compose -f docker/docker-compose.ecs.yml logs postgres
```

### 502错误

```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 重启后端
docker compose -f docker/docker-compose.ecs.yml restart backend
```

## 配置HTTPS（可选）

如需配置HTTPS，请：

1. 准备域名和SSL证书
2. 修改 `infrastructure/nginx/conf.d/default.conf` 启用HTTPS
3. 将证书放入 `infrastructure/nginx/ssl/`
4. 重新部署

## 升级配置

如需添加短信功能，请：

1. 申请阿里云短信服务
2. 修改 `.env` 文件添加短信配置
3. 修改 `docker-compose.ecs.yml` 启用SMS
4. 重新部署

## 联系支持

如有问题，请提交GitHub Issue。
