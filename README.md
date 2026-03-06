# WebSSH Quick Connect - 快速SSH连接工具

一个基于Web的SSH终端工具，专注于快速连接功能，无需登录和数据库。

## ✨ 核心功能

- **快速连接**: 直接输入SSH连接信息即可连接，无需注册登录
- **SSH终端**: 基于xterm.js的Web终端，支持密码和私钥认证
- **SFTP文件管理**: 支持文件上传下载和文件管理
- **本地历史**: 连接历史保存在浏览器本地存储中
- **无数据库**: 无需数据库配置，开箱即用

## 🚀 快速部署

### 📦 Docker 一键部署（推荐）

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
- 无需数据库配置，简化部署流程
- 生产环境配置

### 🛠️ 手动部署

**环境要求：** Node.js 16+

```bash
# 1. 克隆项目
git clone https://github.com/dalaolala/webssh.git
cd webssh

# 2. 安装依赖
npm install

# 3. 启动应用
npm run dev

# 4. 前后端分别启动
cd frontend
npm run dev:frontend
http://localhost:5173

cd backend
npm run dev:backend
http://localhost:3000
```

## 📁 项目结构

```
webssh/
├── backend/          # Node.js后端服务（快速连接专用）
├── frontend/         # Vue3前端应用（快速连接界面）
├── deploy.sh         # Docker部署脚本
├── docker-compose.yml # 容器编排配置
└── Dockerfile        # 容器构建配置
```

## 🔧 技术栈

**前端**: Vue 3 + Vite + Element Plus + xterm.js  
**后端**: Node.js + Express + Socket.IO  
**部署**: Docker + Docker Compose

---

## 🔧 使用指南

### 快速使用
1. 访问 http://localhost:3000 直接进入快速连接界面
2. 输入SSH连接信息（主机、端口、用户名、密码/私钥）
3. 点击"连接SSH"或"连接SFTP"按钮开始连接

### 连接配置
- **主机**: IP地址或域名
- **端口**: SSH端口（默认22）
- **用户名**: SSH登录用户名
- **认证方式**: 密码认证或私钥认证
- **保存凭据**: 可选择将密码保存在浏览器本地（可选）

### 终端操作
- **连接**: 点击"连接"按钮建立SSH会话
- **命令输入**: 直接在终端中输入命令
- **快捷键**: 
  - `Ctrl+C`: 中断当前命令
  - `Ctrl+D`: 退出会话
  - `Ctrl+L`: 清屏
- **断开**: 关闭标签页或断开连接

### 快速连接特点
- **无需注册登录**: 直接使用，无需账号
- **本地历史**: 连接信息保存在浏览器本地
- **分组管理**: 自动按分组管理连接历史
- **导入导出**: 支持连接历史的导入导出
- **无数据库**: 无需配置数据库，简化部署

## 🌐 Nginx 反向代理配置

如需通过 Nginx 将域名/端口转发到 WebSSH（默认运行在 `3000` 端口），参考以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    location / {
        # 核心指令：将请求转发到目标地址
        proxy_pass http://127.0.0.1:3000;

        # --- 以下是标准请求头设置 (推荐保留) ---

        # 将客户端真实的 Host 传递给后端
        proxy_set_header Host $host;

        # 传递客户端的真实 IP
        proxy_set_header X-Real-IP $remote_addr;

        # 记录代理链上的 IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 告诉后端原本的请求协议是 http 还是 https
        proxy_set_header X-Forwarded-Proto $scheme;

        # --- WebSocket 支持（Socket.IO 必须） ---
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;  # 长连接超时（秒），SSH 会话期间不断开
    }
}
```

> **注意**：本项目使用 Socket.IO 建立 WebSocket 长连接来传输 SSH 数据，  
> 必须保留 `Upgrade` 和 `Connection` 头，否则终端连接会失败。

---

## 🐛 故障排除

### 常见问题

- **端口冲突**: 检查3000和5173端口是否被占用
- **依赖安装失败**: 清除npm缓存后重新安装
- **连接失败**: 检查SSH服务器配置和网络连接

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

**注意**: 本项目专注于快速连接功能，移除了用户认证和数据库依赖，适合快速部署和使用。
