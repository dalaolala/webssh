# WebSSH - 在线SSH终端工具

一个基于Web的SSH终端工具，模仿Xshell的功能，提供完整的Web版SSH客户端体验。

## ✨ 功能特性

### ✅ 已实现功能

#### 用户认证系统 (P0)
- 用户注册（邮箱+密码）
- 用户登录（JWT令牌认证）
- 密码加密存储（bcrypt）
- 路由守卫和权限控制

#### 服务器资产管理 (P0)
- 服务器增删改查
- 支持密码和私钥认证
- AES-256加密存储敏感信息
- 服务器分组管理
- 树形结构展示

#### SSH终端核心功能 (P0)
- 基于xterm.js的Web终端
- WebSocket实时通信
- SSH2库后端连接
- 终端窗口自适应
- 命令输入和输出
- 快捷键支持（Ctrl+C等）

#### 前端界面 (P0)
- Vue3 + Element Plus现代化界面
- 响应式设计
- 服务器管理面板
- 终端界面
- 快速连接功能

### 🔄 待实现功能

- [ ] SFTP文件传输功能 (P1)
- [ ] 多标签页支持 (P1)
- [ ] 分屏显示 (P1)
- [ ] 终端外观定制 (P2)
- [ ] 快捷命令功能 (P2)
- [ ] 连接保持和自动重连 (P1)
- [ ] 操作日志记录 (P2)

## 🏗️ 技术架构

### 前端技术栈
- **框架**: Vue 3 + Vite
- **UI组件库**: Element Plus
- **终端组件**: xterm.js + xterm-addon-fit
- **状态管理**: Pinia
- **路由**: Vue Router
- **HTTP客户端**: Axios
- **WebSocket**: socket.io-client

### 后端技术栈
- **运行时**: Node.js
- **Web框架**: Express.js
- **SSH连接**: ssh2库
- **实时通信**: Socket.IO
- **数据库**: MySQL
- **认证**: JWT + bcryptjs
- **加密**: AES-256-GCM

### 数据库设计
```sql
-- 用户表
users (id, email, phone, password_hash, created_at, updated_at)

-- 服务器表
servers (id, user_id, name, host, port, username, password_encrypted, 
         private_key_encrypted, auth_type, group_name, created_at, updated_at)

-- 连接日志表
connection_logs (id, user_id, server_id, host, start_time, end_time, duration)
```

## 📁 项目结构

```
webssh/
├── backend/                 # Node.js后端服务
│   ├── config/
│   │   └── database.js      # 数据库配置和初始化
│   ├── routes/              # API路由
│   │   ├── auth.js          # 认证相关路由
│   │   └── servers.js       # 服务器管理路由
│   ├── socket/              # WebSocket处理
│   │   └── socketHandler.js # SSH连接处理
│   ├── utils/
│   │   └── encryption.js    # 加密工具类
│   ├── .env                 # 环境变量配置
│   ├── package.json         # 后端依赖配置
│   └── server.js            # 主服务器入口
├── frontend/                # Vue3前端应用
│   ├── src/
│   │   ├── components/      # 可复用组件
│   │   │   └── ServerForm.vue # 服务器表单组件
│   │   ├── router/          # 路由配置
│   │   │   └── index.js     # 路由定义和守卫
│   │   ├── stores/          # 状态管理
│   │   │   ├── auth.js      # 用户认证状态
│   │   │   ├── servers.js   # 服务器管理状态
│   │   │   └── terminal.js  # 终端连接状态
│   │   ├── views/           # 页面组件
│   │   │   ├── Dashboard.vue # 主仪表板
│   │   │   ├── Login.vue    # 登录页面
│   │   │   ├── Register.vue # 注册页面
│   │   │   └── Terminal.vue # 终端页面
│   │   ├── App.vue          # 根组件
│   │   └── main.js          # 应用入口
│   ├── index.html           # HTML模板
│   ├── package.json         # 前端依赖配置
│   └── vite.config.js       # Vite构建配置
├── package.json             # 根项目配置
└── README.md               # 项目说明文档
```

## 🚀 快速开始

### 环境要求
- Node.js 16+
- MySQL 5.7+

### 1. 克隆项目
```bash
git clone <项目地址>
cd webssh
```

### 2. 数据库设置
```sql
-- 创建数据库
CREATE DATABASE webssh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选）
CREATE USER 'webssh'@'localhost' IDENTIFIED BY 'webssh';
GRANT ALL PRIVILEGES ON webssh.* TO 'webssh'@'localhost';
FLUSH PRIVILEGES;
```

### 3. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖  
cd ../frontend
npm install

# 返回根目录安装开发依赖
cd ..
npm install
```

### 4. 环境配置
```bash
# 复制环境配置文件
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件：
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=webssh
DB_PASSWORD=webssh
DB_NAME=webssh

# JWT Secret (生成随机密钥)
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Encryption Key (必须32字节长)
ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456
```

**重要提示**：
- `ENCRYPTION_KEY` 必须是正好32字节的字符串
- 生产环境请使用强密码生成器创建安全的密钥
- 不要将真实的密钥提交到版本控制系统

### 5. 启动应用

#### 开发模式（推荐）
```bash
# 同时启动前后端（需要concurrently）
npm run dev
```

#### 分别启动
```bash
# 启动后端服务（端口3000）
npm run dev:backend

# 启动前端服务（端口5173）  
npm run dev:frontend
```

#### 生产构建
```bash
# 构建前端
npm run build

# 启动生产服务器
npm start
```

### 6. 访问应用
- 前端地址：http://localhost:5173
- 后端API：http://localhost:3000

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

### 数据加密
- **用户密码**: bcrypt加密存储
- **服务器认证信息**: AES-256-GCM加密
- **传输加密**: WebSocket over HTTPS（生产环境）

### 认证授权
- JWT令牌认证
- 路由权限控制
- 用户数据隔离

### 输入验证
- 前后端双重验证
- SQL注入防护
- XSS攻击防护

## 🐛 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查MySQL服务状态
sudo systemctl status mysql

# 检查数据库用户权限
mysql -u webssh -p webssh
```

#### 2. 加密密钥错误
```bash
# 确保ENCRYPTION_KEY为32字节
node -e "console.log(process.env.ENCRYPTION_KEY.length)"
```

#### 3. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3000
netstat -tulpn | grep :5173
```

#### 4. 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 日志查看
```bash
# 后端日志
cd backend
npm run dev

# 前端日志  
cd frontend
npm run dev
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

## 📞 联系我们

如有问题或建议，请通过以下方式联系：
- 提交 Issue
- 发送邮件

---

**注意**: 本项目仍在开发中，部分功能可能不完善。生产环境使用前请充分测试。