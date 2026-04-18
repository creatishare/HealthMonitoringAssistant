FROM node:18-alpine

WORKDIR /app

# 安装系统依赖（bcrypt 等原生模块需要编译工具）
RUN apk add --no-cache python3 make g++

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

# 启动前等待数据库就绪，然后运行迁移，最后启动服务
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
