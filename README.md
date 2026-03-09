<div align="center">
  <h1>🚀 WebSSH Desktop</h1>
  <p>基于 <strong>Electron + Vue3 + Express + Socket.IO</strong> 打造的现代化桌面级 SSH & SFTP 客户端。</p>
  <p>主打开箱即用、极致的快速连接与优雅的多会话体验。</p>

  <p>
    <a href="https://github.com/dalaolala/webssh/releases"><img src="https://img.shields.io/github/v/release/dalaolala/webssh?style=flat-square&color=007AFF" alt="Release" /></a>
    <a href="https://github.com/dalaolala/webssh/stargazers"><img src="https://img.shields.io/github/stars/dalaolala/webssh?style=flat-square&color=34C759" alt="Stars" /></a>
  </p>
</div>

---

## 📥 立即下载

获取最新版本的安装包，即刻体验：
👉 **[点击前往 Releases 下载最新版](https://github.com/dalaolala/webssh/releases)**

---

## ✨ 核心特性

- ⚡️ **极速连接**：表单一次填完，SSH 与 SFTP 一键直连，支持密码及私钥认证。
- 📑 **多标签会话**：类似浏览器的 Tab 管理，终端与 SFTP 互不打扰，支持多任务并行工作。
- 💻 **沉浸式终端**：基于 `xterm.js`，支持窗口自适应、状态栏实时监控及便捷的常用命令库。
- 📁 **SFTP 文件管理**：提供直观的图形化文件树，轻松完成上传、下载、重命名、删除及新建目录等高频操作。
- 🔍 **主机历史与搜索**：本地保存连接历史，支持按分组树形展示与快速模糊搜索。
- 🔄 **数据迁移与同步**：
  - **导入 / 导出**：历史记录可通过 AES 加密进行本地导出与导入。
  - **WebDAV 同步**：支持将加密后的主机列表一键推送到 WebDAV，或从远端拉取并与本地合并。
- 🌗 **主题切换**：内置精美的明暗主题（Apple 风格），一键无缝切换，适配你的工作习惯。

---

## 🛠️ 开发与构建

确保你已安装了 Node.js 环境。

### 1. 启动开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器（并发启动前后端）
npm run dev
```

> **提示**：开发环境下，后端运行在 `3000` 端口，前端 Vite 运行在 `5173` 端口。

### 2. 构建桌面应用

```bash
# 基于 electron-builder 打包（默认输出 Windows x64 安装包）
npm run dist
```

> 打包完成后，可在项目的 `dist-electron/` 目录中找到生成的 `.exe` 安装文件。

---

## 🔒 数据与安全

本项目高度注重用户数据的安全性：
- **本地存储**：所有连接历史及凭证（勾选保存时）均仅存储在本地设备中。
- **端到端加密**：无论是导出备份，还是 WebDAV 远程同步，系统均会要求用户输入自定义密钥，使用 **AES 算法** 进行强加密，确保数据在任何存储介质上的绝对安全。

---

## 📂 目录结构速览

```text
webssh/
├── frontend/    # Vue3 + Vite 前端代码（UI 视图、状态管理、WebDAV 同步组件）
├── backend/     # Express + Socket.IO 后端代码（SSH 会话代理、WebDAV 转发）
├── electron/    # Electron 主进程入口脚本（应用生命周期与窗口管理）
└── docs/        # 附加文档说明
```
