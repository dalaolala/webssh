# WebSSH - 在线SSH终端工具

一个基于Web的SSH终端工具，提供完整的Web版SSH客户端体验。

## ✨ 核心功能

- **用户认证**: 注册、登录、JWT令牌认证
- **服务器管理**: 服务器增删改查、分组管理
- **SSH终端**: 基于xterm.js的Web终端，支持密码和私钥认证
- **数据安全**: AES-256加密存储敏感信息

## 🚀 快速部署

### 📦 Docker 一键部署（推荐）

#### 方式一：使用官方镜像（推荐用于生产环境）

```bash
docker run -d \
  --name webssh-app \
  -p 3000:3000 \
  -e DB_HOST=your-mysql-host \
  -e DB_PORT=3306 \
  -e DB_USER=webssh_user \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=webssh \
  -e JWT_SECRET=your-jwt-secret \
  -e ENCRYPTION_KEY=your-32-byte-encryption-key \
  dalaolala/webssh:latest
```

*导入初始化数据请查看 [install.sql](install.sql)*

**最后两个参数相关密钥生成方法：**
```bash
# 生成32字节JWT密钥（推荐使用强随机字符串）
openssl rand -base64 32

# 生成32字节加密密钥（必须正好32个字符）
openssl rand -hex 16  # 输出32字符的十六进制字符串
```

#### 方式二：完整部署脚本（包含MySQL）

```bash
# 一键部署（包含Docker环境检查、镜像构建、服务启动）
git clone https://github.com/dalaolala/webssh.git
cd webssh
chmod +x deploy.sh
./deploy.sh

# 部署完成后访问：http://localhost:3000
```

**部署特点：**
- 自动构建多阶段Docker镜像
- 包含MySQL数据库服务，使用 `install.sql` 进行数据库初始化
- 自动生成安全的加密密钥（JWT_SECRET和ENCRYPTION_KEY）
- 健康检查和服务监控
- 生产环境配置

### 🛠️ 手动部署

**环境要求：** Node.js 16+, MySQL 5.7+

```bash
# 1. 克隆项目
git clone https://github.com/dalaolala/webssh.git
cd webssh

# 2. 数据库初始化（使用install.sql脚本）
mysql -u root -p < install.sql

# 3. 安装依赖
npm install

# 4. 环境配置
cp backend/.env.example backend/.env
# 编辑 backend/.env 文件，配置数据库连接和密钥

# 5. 启动应用
npm run dev
```

**重要说明：**
- 数据库初始化统一使用 `install.sql` 脚本
- `ENCRYPTION_KEY` 必须是正好32字节的字符串
- 生产环境请使用强密码生成器创建安全的密钥

生成符合要求的密钥：
```bash
# 生成32字节JWT密钥
openssl rand -base64 32

# 生成32字节加密密钥（必须正好32个字符）
openssl rand -hex 16
```

## 📁 项目结构

```
webssh/
├── backend/          # Node.js后端服务
├── frontend/         # Vue3前端应用
├── deploy.sh         # Docker部署脚本
├── docker-compose.yml # 容器编排配置
├── Dockerfile        # 容器构建配置
└── install.sql       # 数据库初始化脚本
```

## 🔧 技术栈

**前端**: Vue 3 + Vite + Element Plus + xterm.js  
**后端**: Node.js + Express + Socket.IO + MySQL  
**部署**: Docker + Docker Compose

---

*详细文档请查看 [docs/](docs/) 目录*
*数据库设计请查看 [install.sql](install.sql)*

## 🔧 使用指南

### 首次使用
1. 访问 http://localhost:3000 注册账号
2. 登录后进入仪表板
3. 添加你的第一个SSH服务器
4. 点击服务器名称开始连接

### 服务器配置
- **名称**: 服务器显示名称
- **主机**: IP地址或域名
- **端口**: SSH端口（默认22）
- **用户名**: SSH登录用户名
- **认证方式**: 密码认证或私钥认证
- **分组**: 服务器分组（可选）

### 终端操作
- **连接**: 点击"连接"按钮建立SSH会话
- **命令输入**: 在底部输入框输入命令
- **快捷键**: 
  - `Ctrl+C`: 中断当前命令
  - `Ctrl+D`: 退出会话
  - `Ctrl+L`: 清屏
- **断开**: 点击"断开"按钮结束连接

### 快速连接
- 不保存服务器信息，直接输入连接参数
- 适合临时连接或测试使用

## 🔧 使用指南

### 首次使用
1. 访问 http://localhost:5173/register 注册账号
2. 登录后进入仪表板
3. 添加你的第一个SSH服务器
4. 点击服务器名称开始连接

### 服务器配置
- **名称**: 服务器显示名称
- **主机**: IP地址或域名
- **端口**: SSH端口（默认22）
- **用户名**: SSH登录用户名
- **认证方式**: 密码认证或私钥认证
- **分组**: 服务器分组（可选）

### 终端操作
- **连接**: 点击"连接"按钮建立SSH会话
- **命令输入**: 在底部输入框输入命令
- **快捷键**: 
  - `Ctrl+C`: 中断当前命令
  - `Ctrl+D`: 退出会话
  - `Ctrl+L`: 清屏
- **断开**: 点击"断开"按钮结束连接

### 快速连接
- 不保存服务器信息，直接输入连接参数
- 适合临时连接或测试使用

## 🔒 安全特性

- **数据加密**: 用户密码使用bcrypt加密，服务器认证信息使用AES-256-GCM加密
- **认证授权**: JWT令牌认证，路由权限控制，用户数据隔离
- **输入验证**: 前后端双重验证，SQL注入防护，XSS攻击防护
- **传输安全**: WebSocket over HTTPS（生产环境）

## 🐛 故障排除

### 常见问题

- **数据库连接失败**: 检查MySQL服务状态和用户权限
- **加密密钥错误**: 确保ENCRYPTION_KEY为32字节
- **端口冲突**: 检查3000和5173端口是否被占用
- **依赖安装失败**: 清除npm缓存后重新安装

**日志查看：**
```bash
# 后端日志
cd backend && npm run dev

# 前端日志  
cd frontend && npm run dev
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [xterm.js](https://xtermjs.org/) - 强大的Web终端组件
- [ssh2](https://github.com/mscdex/ssh2) - Node.js SSH客户端库
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue3组件库

---

**注意**: 本项目仍在开发中，部分功能可能不完善。生产环境使用前请充分测试。
