# 多阶段构建Dockerfile
FROM node:18-alpine AS frontend-build

# 设置工作目录
WORKDIR /app

# 复制前端文件
COPY frontend/package*.json ./frontend/
COPY frontend/ ./frontend/

# 安装前端依赖并构建
RUN cd frontend && npm ci && npm run build

# 后端构建阶段
FROM node:18-alpine AS backend-build

# 设置工作目录
WORKDIR /app

# 复制后端文件
COPY backend/package*.json ./backend/
COPY backend/ ./backend/

# 安装后端依赖
RUN cd backend && npm ci --only=production

# 最终镜像
FROM node:18-alpine

# 安装必要的系统工具
RUN apk add --no-cache \
    openssh-client \
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --from=backend-build /app/backend ./backend
RUN rm -f ./backend/.env || true

# 复制根目录文件
COPY package*.json ./
COPY install.sql ./backend/

# 设置权限
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/auth/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 启动命令
CMD ["node", "backend/server.js"]
