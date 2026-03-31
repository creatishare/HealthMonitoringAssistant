# 阿里云ECS服务器配置完整教程

## 一、购买ECS服务器

### 1. 登录阿里云控制台
- 访问 https://ecs.console.aliyun.com/
- 登录你的阿里云账号

### 2. 创建实例

**选择配置：**
| 配置项 | 推荐选择 | 说明 |
|--------|----------|------|
| 地域 | 离你最近的 | 如华东1(杭州) |
| 实例规格 | 2核4G | 最低要求 |
| 镜像 | CentOS 8.2 / Ubuntu 22.04 | 推荐Ubuntu |
| 系统盘 | 40GB SSD | 最低要求 |
| 带宽 | 1-5Mbps | 按流量计费更便宜 |
| 安全组 | 新建安全组 | 见下文配置 |

**预计费用：**约100-150元/月

---

## 二、配置安全组

### 1. 创建安全组

在ECS控制台 → 网络与安全 → 安全组 → 创建安全组

### 2. 添加规则

| 类型 | 端口 | 授权对象 | 说明 |
|------|------|----------|------|
| SSH | 22 | 你的IP/0.0.0.0/0 | 远程连接 |
| HTTP | 80 | 0.0.0.0/0 | 网站访问 |
| HTTPS | 443 | 0.0.0.0/0 | 安全网站(可选) |

**配置步骤：**
1. 点击"添加安全组规则"
2. 选择"入方向"
3. 协议类型选"自定义TCP"
4. 端口范围填"80"
5. 授权对象填"0.0.0.0/0"
6. 描述填"HTTP访问"
7. 保存

---

## 三、连接ECS服务器

### 1. 获取连接信息

在ECS控制台 → 实例列表 → 点击你的实例
- 记录**公网IP**
- 重置密码（如需要）

### 2. 使用SSH连接

**Windows用户：**
```bash
# 使用PowerShell或Git Bash
ssh root@你的ECS公网IP

# 示例
ssh root@123.45.67.89
```

**Mac/Linux用户：**
```bash
# 打开终端
ssh root@你的ECS公网IP
```

**输入密码**（输入时不显示字符）：
```
root@123.45.67.89's password: [这里输入你的密码]
```

---

## 四、安装Docker

### Ubuntu系统

```bash
# 1. 更新软件包
apt-get update

# 2. 安装依赖
apt-get install -y ca-certificates curl gnupg lsb-release

# 3. 添加Docker官方GPG密钥
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# 4. 添加Docker软件源
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. 更新软件包
apt-get update

# 6. 安装Docker
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 7. 启动Docker
systemctl start docker
systemctl enable docker

# 8. 验证安装
docker --version
docker compose version
```

### CentOS系统

```bash
# 1. 更新软件包
yum update -y

# 2. 安装依赖
yum install -y yum-utils device-mapper-persistent-data lvm2

# 3. 添加Docker软件源
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 4. 安装Docker
yum install -y docker-ce docker-ce-cli containerd.io

# 5. 启动Docker
systemctl start docker
systemctl enable docker

# 6. 验证安装
docker --version
```

---

## 五、上传项目文件

### 方法1：使用scp命令（推荐）

**在本地电脑执行：**
```bash
# 1. 先打包项目
cd /Users/sansanaixuexi/Desktop/HealthMonitoringAssistant
tar -czvf health-monitoring.tar.gz src infrastructure ECS_DEPLOY.md

# 2. 上传到ECS
scp health-monitoring.tar.gz root@你的ECS公网IP:/opt/

# 3. 连接ECS并解压
ssh root@你的ECS公网IP
cd /opt
tar -xzvf health-monitoring.tar.gz
mv HealthMonitoringAssistant health-monitoring
```

### 方法2：使用git克隆

```bash
# 在ECS上执行
cd /opt
yum install -y git  # CentOS
# 或 apt-get install -y git  # Ubuntu

git clone https://github.com/你的账号/health-monitoring.git
cd health-monitoring
```

### 方法3：使用FTP工具

使用FileZilla等工具，连接ECS后上传文件到 `/opt` 目录

---

## 六、配置环境变量

```bash
# 进入项目目录
cd /opt/health-monitoring/infrastructure

# 复制环境变量模板
cp .env.ecs.example .env

# 编辑配置
vi .env
```

### 需要修改的配置项

```bash
# 1. 数据库密码（必须修改）
POSTGRES_PASSWORD=YourStrongPassword123!

# 2. Redis密码（必须修改）
REDIS_PASSWORD=YourRedisPassword456!

# 3. JWT密钥（生成方法见下文）
JWT_SECRET=你的32位随机字符串
JWT_REFRESH_SECRET=你的32位随机字符串

# 4. 加密密钥（生成方法见下文）
ENCRYPTION_KEY=你的32位随机字符串

# 5. 百度OCR配置
BAIDU_OCR_API_KEY=your_api_key_here
BAIDU_OCR_SECRET_KEY=your_secret_key_here
```

### 生成随机密钥

```bash
# 在ECS上执行
openssl rand -base64 32
# 复制输出的字符串作为JWT_SECRET

openssl rand -base64 32
# 复制输出的字符串作为JWT_REFRESH_SECRET

openssl rand -base64 32
# 复制输出的字符串作为ENCRYPTION_KEY
```

---

## 七、执行部署

```bash
# 1. 给部署脚本添加执行权限
chmod +x /opt/health-monitoring/infrastructure/scripts/deploy-ecs.sh

# 2. 执行部署
cd /opt/health-monitoring/infrastructure
./scripts/deploy-ecs.sh
```

部署过程大约需要5-10分钟，会看到以下输出：
```
[2026-03-30 10:00:00] === 开始ECS部署 ===
[2026-03-30 10:00:00] 检查部署环境...
[2026-03-30 10:00:01] ✓ Docker 已安装
[2026-03-30 10:00:01] ✓ Docker Compose 已安装
...
[2026-03-30 10:05:00] === 部署完成 ===
```

---

## 八、验证部署

### 1. 查看服务状态

```bash
cd /opt/health-monitoring/infrastructure
docker compose -f docker/docker-compose.ecs.yml ps
```

应该看到所有服务都是 `running` 状态：
```
NAME            IMAGE                STATUS
health-backend  health-backend:ecs   Up 2 minutes
health-web      health-frontend:ecs  Up 2 minutes
health-nginx    nginx:1.24-alpine    Up 2 minutes
health-postgres postgres:14-alpine   Up 2 minutes
health-redis    redis:7-alpine       Up 2 minutes
health-worker   health-worker:ecs    Up 2 minutes
```

### 2. 测试访问

```bash
# 在ECS上测试
curl http://localhost:3000/health
# 应该返回 {"status":"ok"}

# 测试前端
curl http://localhost
# 应该返回HTML内容
```

### 3. 浏览器访问

在浏览器打开：
```
http://你的ECS公网IP
```

如果看到登录页面，说明部署成功！

---

## 九、常用运维命令

### 查看日志
```bash
# 查看所有服务日志
docker compose -f docker/docker-compose.ecs.yml logs -f

# 查看后端日志
docker compose -f docker/docker-compose.ecs.yml logs -f backend

# 查看最后100行
docker compose -f docker/docker-compose.ecs.yml logs --tail=100 backend
```

### 重启服务
```bash
# 重启所有服务
docker compose -f docker/docker-compose.ecs.yml restart

# 重启单个服务
docker compose -f docker/docker-compose.ecs.yml restart backend
```

### 停止/启动
```bash
# 停止服务
docker compose -f docker/docker-compose.ecs.yml down

# 启动服务
docker compose -f docker/docker-compose.ecs.yml up -d
```

### 进入容器
```bash
# 进入后端容器
docker compose -f docker/docker-compose.ecs.yml exec backend sh

# 进入数据库
docker compose -f docker/docker-compose.ecs.yml exec postgres psql -U health_prod -d health_monitoring_prod
```

---

## 十、故障排查

### 1. 无法访问网站

```bash
# 检查防火墙
systemctl status firewalld  # CentOS
ufw status                  # Ubuntu

# 关闭防火墙（测试用）
systemctl stop firewalld    # CentOS
ufw disable                 # Ubuntu

# 检查安全组
# 登录阿里云控制台，确认安全组开放了80端口

# 检查服务状态
docker compose -f docker/docker-compose.ecs.yml ps
```

### 2. 数据库连接失败

```bash
# 查看postgres日志
docker compose -f docker/docker-compose.ecs.yml logs postgres

# 检查数据库是否启动
docker compose -f docker/docker-compose.ecs.yml exec postgres pg_isready -U health_prod
```

### 3. 内存不足

```bash
# 查看内存使用
free -h

# 增加Swap空间
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 4. 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理Docker
docker system prune -a -f
docker volume prune -f
```

---

## 十一、配置域名（可选）

### 1. 购买域名
- 阿里云域名注册：https://wanwang.aliyun.com/

### 2. 解析域名
在阿里云控制台 → 域名解析 → 添加记录：
- 记录类型：A
- 主机记录：@（或www）
- 记录值：你的ECS公网IP

### 3. 配置Nginx
编辑 `infrastructure/nginx/conf.d/default.conf`，将 `server_name` 改为你的域名

---

## 十二、配置HTTPS（可选）

### 使用Let's Encrypt免费证书

```bash
# 安装certbot
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  certbot/certbot certonly --standalone \
  -d your-domain.com

# 复制证书
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem infrastructure/nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem infrastructure/nginx/ssl/

# 重启nginx
docker compose -f docker/docker-compose.ecs.yml restart nginx
```

---

## 快速检查清单

部署前确认：
- [ ] ECS已购买，2核4G以上
- [ ] 安全组已开放80端口
- [ ] 能通过SSH连接到服务器
- [ ] Docker已安装
- [ ] 项目文件已上传到/opt目录
- [ ] .env文件已配置

部署后确认：
- [ ] 所有容器运行正常
- [ ] 能通过公网IP访问
- [ ] 能正常注册/登录
- [ ] OCR功能正常

---

如有问题，请检查日志或提交GitHub Issue。
