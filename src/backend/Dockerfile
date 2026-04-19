FROM node:18-slim

WORKDIR /app

# 安装系统依赖（bcrypt、Prisma 等需要）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖并生成 Prisma Client
RUN npm install
RUN npx prisma generate

# 复制源码
COPY . .

# 编译 TypeScript
RUN npm run build

# 创建上传目录
RUN mkdir -p uploads

EXPOSE 3001

# 启动前运行迁移，然后启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
