# 部署指南

## Docker 部署

### 快速开始
```bash
# 一键部署
./deploy.sh

# 访问应用
http://localhost:3000
```

### 部署脚本功能
- 自动检查Docker环境
- 清理现有容器和镜像
- 生成生产环境配置文件
- 构建Docker镜像
- 启动服务并健康检查

### 环境变量
部署脚本会自动生成 `.env.production` 文件：

```env
# 数据库配置
DB_HOST=mysql
DB_PORT=3306
DB_USER=webssh_user
DB_PASSWORD=webssh_password
DB_NAME=webssh

# JWT配置
JWT_SECRET=<随机生成>

# 服务器配置
PORT=3000
NODE_ENV=production

# 加密密钥（32字节）
ENCRYPTION_KEY=<随机生成>
```

## 手动部署

### 环境要求
- Node.js 16+
- MySQL 5.7+

### 步骤

1. **安装依赖**
```bash
npm install
```

2. **数据库初始化**
```bash
mysql -u root -p < install.sql
```

3. **环境配置**
```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env 文件
```

4. **启动应用**
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 端口配置
- 前端：5173 (开发) / 3000 (生产)
- 后端：3000
- MySQL：3306

## 故障排除

### 常见问题

**Docker 部署问题**
```bash
# 检查服务状态
docker compose ps

# 查看日志
docker compose logs

# 重启服务
docker compose restart
```

**加密密钥错误**
确保 ENCRYPTION_KEY 为32字节长度：
```bash
node -e "console.log(process.env.ENCRYPTION_KEY.length)"
```

**数据库连接失败**
检查MySQL服务状态和用户权限：
```bash
# 检查服务状态
sudo systemctl status mysql

# 检查数据库连接
mysql -u webssh_user -p webssh
```