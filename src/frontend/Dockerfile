# 阶段1: 构建前端
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件并安装
COPY package.json ./
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# 阶段2: 使用 Nginx 提供静态文件
FROM nginx:1.24-alpine

# 复制构建产物到 Nginx 默认目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置（如果存在）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
