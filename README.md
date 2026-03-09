## WebSSH Desktop

Electron + Vue3 + Express/Socket.IO 打造的桌面级 SSH & SFTP 客户端，主打开箱即用的快速连接与多会话体验。

### 下载
- 最新安装包：`https://github.com/dalaolala/webssh/releases`

### 主要功能
- **快速连接**：表单一次填完，SSH 与 SFTP 一键直连，支持密码/私钥认证。
- **多标签会话**：类似浏览器的标签管理，终端与 SFTP 互不打扰，可并行工作。
- **终端体验**：基于 xterm.js，支持尺寸自适应、状态栏、常用命令库。
- **SFTP 文件管理**：图形化文件树、上传/下载/重命名/删除/新建目录等高频操作。
- **主机历史与搜索**：本地保存连接历史，按分组树形展示，快速搜索主机/名称。
- **导入导出**：历史记录 AES 加密导出/导入，便于备份迁移。
- **WebDAV 同步**：将导出的加密主机列表推送到 WebDAV，或从 WebDAV 拉取并合并。
- **主题**：内置明暗主题切换。

### 开发&运行
- 开发模式：`npm run dev`（并发启动前后端）
- 桌面打包：`npm run dist`（基于 electron-builder，默认输出 Windows x64 安装包）
- 后端端口：3000；前端 Vite 端口：5173（开发时）

### 数据与安全提示
- 连接历史存储在本地（可选保存密码/私钥）。
- 导出/同步文件使用用户提供的密钥进行 AES 加密，请妥善保管密钥。

### 目录速览
- `frontend/`：Vue3 + Vite 前端
- `backend/`：Express + Socket.IO 后端
- `electron/`：Electron 主进程入口
- `docs/`：附加说明文档
