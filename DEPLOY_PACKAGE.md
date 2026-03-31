# ECS部署文件清单

## 部署前准备

### 1. 打包以下文件上传到ECS服务器

```
health-monitoring/
├── src/
│   ├── backend/              # 后端代码
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── package.json
│   │   └── ...
│   └── frontend/             # 前端代码
│       ├── src/
│       ├── index.html
│       ├── package.json
│       └── ...
├── infrastructure/           # 部署配置
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   ├── Dockerfile.worker
│   │   ├── docker-compose.ecs.yml   # ECS部署配置
│   │   └── ...
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── conf.d/
│   │       └── default.conf
│   ├── scripts/
│   │   └── deploy-ecs.sh     # 部署脚本
│   └── .env.ecs.example      # 环境变量模板
├── ECS_DEPLOY.md             # 部署指南
└── CHANGELOG.md
```

### 2. 快速打包命令（本地执行）

```bash
# 在项目根目录执行
tar -czvf health-monitoring-ecs.tar.gz \
  src/backend \
  src/frontend \
  infrastructure/docker \
  infrastructure/nginx \
  infrastructure/scripts \
  infrastructure/.env.ecs.example \
  ECS_DEPLOY.md \
  CHANGELOG.md
```

### 3. 上传到ECS服务器

```bash
# 使用scp上传
scp health-monitoring-ecs.tar.gz root@your-ecs-ip:/opt/

# 连接服务器解压
ssh root@your-ecs-ip
cd /opt
tar -xzvf health-monitoring-ecs.tar.gz
mv health-monitoring-ecs health-monitoring
cd health-monitoring/infrastructure
```

### 4. 配置并部署

```bash
# 1. 配置环境变量
cp .env.ecs.example .env
vi .env  # 编辑配置

# 2. 执行部署
chmod +x scripts/deploy-ecs.sh
./scripts/deploy-ecs.sh
```

## 部署后验证

```bash
# 查看服务状态
docker compose -f docker/docker-compose.ecs.yml ps

# 测试API
curl http://localhost:3000/health

# 查看日志
docker compose -f docker/docker-compose.ecs.yml logs -f backend
```

## 访问应用

```
http://your-ecs-ip
```

## 注意事项

1. **安全组配置**: 确保ECS安全组开放80端口
2. **内存要求**: 建议2核4G以上配置
3. **磁盘空间**: 建议40GB以上
4. **防火墙**: 确保firewalld/ufw允许80端口

## 故障排查

```bash
# 查看服务状态
docker compose -f docker/docker-compose.ecs.yml ps

# 查看后端日志
docker compose -f docker/docker-compose.ecs.yml logs backend

# 重启服务
docker compose -f docker/docker-compose.ecs.yml restart

# 检查端口占用
netstat -tlnp | grep 80
```
