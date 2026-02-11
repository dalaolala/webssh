#!/bin/bash

# WebSSH 部署脚本
set -e

echo "🚀 开始部署 WebSSH..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查Docker Compose是否安装（新版Docker内置compose）
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 清理现有环境
echo "🧹 清理现有环境..."
echo "   停止并删除现有容器..."
docker compose down --remove-orphans --volumes --rmi local 2>/dev/null || true

echo "   清理未使用的镜像、容器和网络..."
docker system prune -f 2>/dev/null || true

# 删除旧的镜像
echo "   删除旧的WebSSH镜像..."
docker images | grep "webssh" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

# 删除旧的容器
echo "   删除旧的WebSSH容器..."
docker ps -a | grep "webssh" | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 创建/校验生产环境配置文件
echo "📝 创建/校验环境配置文件..."
if [ ! -f .env.production ]; then
    NEW_KEY=$(openssl rand -hex 16)
    cat > .env.production << EOF
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_USER=webssh_user
DB_PASSWORD=webssh_password
DB_NAME=webssh

# JWT配置
JWT_SECRET=$(openssl rand -base64 32)

# 服务器配置
PORT=3000
NODE_ENV=production

# 加密密钥（长度必须为32字符）
ENCRYPTION_KEY=${NEW_KEY}
EOF
    echo "✅ 环境配置文件已创建"
else
    # 读取并校验现有KEY长度
    CURRENT_KEY=$(grep -E '^ENCRYPTION_KEY=' .env.production | cut -d= -f2 | tr -d '\r\n')
    if [ -z "$CURRENT_KEY" ] || [ ${#CURRENT_KEY} -ne 32 ]; then
        echo "⚠️ ENCRYPTION_KEY 无效或缺失，正在重新生成..."
        NEW_KEY=$(openssl rand -hex 16)
        if grep -q '^ENCRYPTION_KEY=' .env.production; then
            awk -v k="$NEW_KEY" 'BEGIN{FS=OFS="="} /^ENCRYPTION_KEY=/ {$2=k} {print}' .env.production > .env.production.tmp && mv .env.production.tmp .env.production
        else
            echo "ENCRYPTION_KEY=$NEW_KEY" >> .env.production
        fi
        echo "✅ ENCRYPTION_KEY 已修复为有效的32字符值"
    else
        echo "✅ ENCRYPTION_KEY 已有效（长度32）"
    fi
fi

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker compose build --no-cache

# 启动服务
echo "🚀 启动服务..."
docker compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
if docker compose ps | grep -q "Up"; then
    echo "✅ 服务启动成功！"
    echo ""
    echo "📊 服务信息："
    echo "   - WebSSH 应用: http://localhost:3000"
    echo "   - MySQL 数据库: localhost:3306"
    echo ""
    echo "🔧 常用命令："
    echo "   - 查看日志: docker compose logs -f"
    echo "   - 停止服务: docker compose down"
    echo "   - 重启服务: docker compose restart"
    echo "   - 查看状态: docker compose ps"
else
    echo "❌ 服务启动失败，请检查日志"
    docker compose logs
    exit 1
fi

echo "🎉 部署完成！"
