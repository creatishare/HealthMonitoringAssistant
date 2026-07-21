# 服务器运维手册

> 部署后的日常维护和常用操作

---

## 快速入口

| 操作 | 命令 |
|------|------|
| 查看服务状态 | `sudo docker-compose ps` |
| 查看日志 | `sudo docker-compose logs -f` |
| 重启所有服务 | `sudo docker-compose restart` |
| 停止所有服务 | `sudo docker-compose down` |

---

## 日常维护

### 1. 进入项目目录

所有操作都需要先进入项目目录：

```bash
cd /opt/HealthMonitoringAssistant
```

### 2. 查看服务运行状态

```bash
sudo docker-compose ps
```

输出示例：
```
NAME           IMAGE           STATUS	hma-backend    hma-backend     Up 2 hours
hma-frontend   hma-frontend    Up 2 hours
hma-nginx      nginx:1.24      Up 2 hours
hma-postgres   postgres:14     Up 2 hours
hma-redis      redis:7         Up 2 hours
```

### 3. 查看日志

**查看所有服务日志：**
```bash
sudo docker-compose logs -f
```

**只看后端日志（调试用）：**
```bash
sudo docker-compose logs -f backend
```

**只看前端日志：**
```bash
sudo docker-compose logs -f frontend
```

**查看最近 100 行日志：**
```bash
sudo docker-compose logs --tail=100 backend
```

### 4. 重启服务

**重启所有服务：**
```bash
sudo docker-compose restart
```

**只重启后端：**
```bash
sudo docker-compose restart backend
```

### 5. 停止服务

```bash
sudo docker-compose down
```

---

## 更新部署

### 更新代码并重新部署

```bash
cd /opt/HealthMonitoringAssistant

# 拉取最新代码
sudo git pull origin main

# 重新构建并启动
sudo docker-compose up -d --build
```

---

## 数据库操作

### 进入数据库命令行

```bash
sudo docker-compose exec postgres psql -U healthuser -d health_monitoring
```

常用 SQL：
```sql
-- 查看所有表
\dt

-- 查看用户表
SELECT id, phone, name, user_type FROM "User" LIMIT 10;

-- 退出
\q
```

### 备份数据库

```bash
sudo docker-compose exec postgres pg_dump -U healthuser health_monitoring > backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
sudo docker-compose exec -T postgres psql -U healthuser -d health_monitoring < backup_20240101.sql
```

---

## 故障排查

### 服务启动失败

1. **查看具体错误：**
   ```bash
   sudo docker-compose logs backend
   ```

2. **检查端口占用：**
   ```bash
   sudo netstat -tlnp | grep 80
   ```

3. **检查磁盘空间：**
   ```bash
   df -h
   ```

### 数据库连接失败

```bash
# 检查 postgres 容器状态
sudo docker-compose ps postgres

# 重启 postgres
sudo docker-compose restart postgres
```

### 前端页面空白

```bash
# 检查前端容器日志
sudo docker-compose logs frontend

# 重建前端
sudo docker-compose up -d --build frontend
```

---

## 配置修改

### 修改环境变量

```bash
# 编辑配置文件
sudo nano /opt/HealthMonitoringAssistant/.env

# 修改后重启服务
sudo docker-compose up -d --build
```

### 修改 Nginx 配置

```bash
# 编辑 nginx 配置
sudo nano /opt/HealthMonitoringAssistant/nginx/default.conf

# 重启 nginx 容器
sudo docker-compose restart nginx
```

### HTTPS 与域名配置

生产环境实际使用根目录部署：

```bash
cd /opt/HealthMonitoringAssistant
```

关键文件：

| 用途 | 路径 |
|------|------|
| Compose | `/opt/HealthMonitoringAssistant/docker-compose.yml` |
| Nginx | `/opt/HealthMonitoringAssistant/nginx/default.conf` |
| 证书 | `/opt/HealthMonitoringAssistant/nginx/ssl/fullchain.pem` |
| 私钥 | `/opt/HealthMonitoringAssistant/nginx/ssl/privkey.pem` |
| ACME Webroot | `/opt/HealthMonitoringAssistant/nginx/www/` |

HTTPS 配置检查：

```bash
cd /opt/HealthMonitoringAssistant
sudo bash infrastructure/scripts/test-https-config.sh
sudo docker compose config >/tmp/hma-compose.out
sudo docker compose exec nginx nginx -t
```

证书替换或续期后热加载：

```bash
cd /opt/HealthMonitoringAssistant
sudo docker compose exec nginx nginx -s reload
```

上线验收：

```bash
DOMAIN=你的域名
curl -I "http://$DOMAIN/"
curl -I "https://$DOMAIN/"
curl -I "https://$DOMAIN/records"
curl -i -X POST "https://$DOMAIN/api/auth/verification-code" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138099","type":"register"}'
```

预期：

- HTTP 返回 301 到 HTTPS。
- HTTPS 首页返回 200。
- `/records`、`/privacy-security` 等 SPA 路由刷新不返回 404。
- `/api/auth/verification-code` 返回 200 或业务 4xx，不应是 404/502。
- 浏览器控制台无 mixed content 报错。

回滚：

```bash
cd /opt/HealthMonitoringAssistant
sudo cp nginx/default.conf nginx/default.conf.failed-https.$(date +%Y%m%d%H%M%S)
sudo git checkout -- nginx/default.conf docker-compose.yml
sudo docker compose up -d nginx
curl -I "http://服务器公网IP/"
```

如果服务器上有未提交的手工配置，先备份再恢复，避免覆盖真实证书路径或运维备注。

---

## 监控检查

### 查看资源使用

```bash
# Docker 容器资源使用
sudo docker stats

# 系统整体资源
top
```

### 检查服务健康

```bash
# 测试后端直连健康检查
curl http://localhost:3001/health

# 测试 Nginx API 代理
curl http://localhost/api/health

# 测试前端
curl -I http://localhost:80
```

---

## 安全相关

### 查看最近登录

```bash
last
```

### 检查防火墙状态

```bash
sudo ufw status
```

### 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 实用别名

可以添加到 `~/.bashrc` 方便使用：

```bash
alias hma='cd /opt/HealthMonitoringAssistant'
alias hma-logs='cd /opt/HealthMonitoringAssistant && sudo docker-compose logs -f'
alias hma-status='cd /opt/HealthMonitoringAssistant && sudo docker-compose ps'
alias hma-restart='cd /opt/HealthMonitoringAssistant && sudo docker-compose restart'
alias hma-update='cd /opt/HealthMonitoringAssistant && sudo git pull origin main && sudo docker-compose up -d --build'
```

添加后执行：
```bash
source ~/.bashrc
```

之后就可以用简写：
- `hma` - 进入项目目录
- `hma-logs` - 查看日志
- `hma-status` - 查看状态
- `hma-restart` - 重启服务
- `hma-update` - 更新代码并部署
