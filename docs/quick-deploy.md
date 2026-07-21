# 快速部署指南（IP 直连内测版）

> 适合还没有域名和 ICP 备案，想先把应用部署到云服务器上给开发团队测试的场景。

---

## 前置条件

- [ ] 已购买云服务器（2核4G，Ubuntu 22.04）
- [ ] 已通过 SSH 连接到服务器
- [ ] IP 直连内测：安全组已开放 **80 端口**（HTTP）
- [ ] 正式域名上线：安全组已开放 **80 和 443 端口**（HTTP/HTTPS）

---

## 一键部署（在服务器上执行）

### 1. 下载并运行部署脚本

```bash
# 下载脚本
wget https://raw.githubusercontent.com/creatishare/HealthMonitoringAssistant/main/scripts/deploy.sh

# 赋予执行权限
chmod +x deploy.sh

# 运行（需要 root 权限）
sudo ./deploy.sh
```

### 2. 首次运行会提示缺少 .env 文件

脚本会自动克隆代码，但第一次运行会因为缺少 `.env` 而退出。这是正常的，按提示操作：

```bash
cd /opt/HealthMonitoringAssistant
cp .env.example .env
vim .env
```

**必须修改的配置项：**

| 配置项 | 说明 | 是否必须 |
|--------|------|---------|
| `DB_PASSWORD` | 数据库密码 | ✅ 必须修改 |
| `JWT_SECRET` | JWT 签名密钥 | ✅ 必须修改 |
| `SMS_ACCESS_KEY` | 阿里云短信 | ✅ 生产注册/找回密码必需 |
| `BAIDU_OCR_API_KEY` | 百度OCR | ❌ 可选（无则不启用OCR） |

> 💡 **本地测试用**：仅在非生产环境未配置短信时，注册页先请求一次验证码，再输入任意合法 6 位验证码（如 `123456`）即可测试流程。生产环境必须配置短信服务。

### 3. 再次运行部署脚本

```bash
cd /opt/HealthMonitoringAssistant
sudo ./scripts/deploy.sh
```

### 4. 访问应用

打开浏览器，输入你的 **服务器公网 IP**：

```
http://你的服务器IP
```

---

## 手动部署（不想用脚本）

如果一键脚本出问题，可以手动执行：

```bash
# 1. 安装 Docker
sudo apt update
sudo apt install -y docker.io docker-compose git

# 2. 克隆代码
sudo git clone https://github.com/creatishare/HealthMonitoringAssistant.git /opt/HealthMonitoringAssistant
cd /opt/HealthMonitoringAssistant

# 3. 复制并编辑配置
sudo cp .env.example .env
sudo vim .env  # 修改 DB_PASSWORD 和 JWT_SECRET

# 4. 构建并启动
sudo docker-compose up -d --build

# 5. 查看状态
sudo docker-compose ps
```

---

## 常见问题

### Q: 部署后访问 IP 打不开？

1. 检查安全组是否放行了 **80 端口**
2. 检查服务状态：`sudo docker-compose ps`
3. 查看日志：`sudo docker-compose logs -f`

### Q: 如何更新代码？

```bash
cd /opt/HealthMonitoringAssistant
sudo git pull origin main
sudo docker-compose up -d --build
```

### Q: 如何查看后端日志？

```bash
cd /opt/HealthMonitoringAssistant
sudo docker-compose logs -f backend
```

### Q: 数据库数据会丢失吗？

不会。PostgreSQL 和 Redis 数据都存储在 Docker Volume 中，即使容器重启数据也不会丢失。

### Q: 没有短信服务怎么注册测试账号？

仅限本地/非生产环境：在 `.env` 中不配置 SMS 相关字段，注册页面先请求一次验证码，再输入任意 6 位数字（如 `123456`）即可通过。生产环境未配置短信服务时，验证码接口会明确报错。

---

## 下一步：正式生产部署

内测通过后，需要完成以下步骤才能正式对外提供服务：

1. **购买域名** + 实名认证
2. **ICP 备案**（7-20 天）
3. **配置 HTTPS**（域名备案后，用阿里云 DV 证书或 Let's Encrypt）
4. **将 `http://IP` 切换为 `https://域名`**

当前仓库已准备好正式 HTTPS 模板，实际生产路径为：

- Compose：`/opt/HealthMonitoringAssistant/docker-compose.yml`
- Nginx：`/opt/HealthMonitoringAssistant/nginx/default.conf`
- 证书：`/opt/HealthMonitoringAssistant/nginx/ssl/fullchain.pem`
- 私钥：`/opt/HealthMonitoringAssistant/nginx/ssl/privkey.pem`

域名备案通过后，按 `docs/deployment-guide.md` 的“正式域名 + HTTPS 上线”章节放置证书并启动：

```bash
cd /opt/HealthMonitoringAssistant
sudo bash infrastructure/scripts/test-https-config.sh
sudo docker compose up -d --build nginx
sudo docker compose exec nginx nginx -t
```

验收重点：

- `http://域名/` 自动跳转 `https://域名/`
- `https://域名/records` 刷新不 404
- `https://域名/api/auth/verification-code` 不返回 404/502
- 浏览器控制台无 mixed content 报错
