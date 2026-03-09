## 部署与运行（简版）

### 开发模式
- 安装依赖：`npm install`
- 启动：`npm run dev`（并发启动前端 Vite 与后端 Express/Socket.IO）
  - 前端：`http://localhost:5173`
  - 后端：`http://localhost:3000`

### 桌面打包
- 构建命令：`npm run dist`
- 构建工具：electron-builder（默认输出 Windows x64 安装包）
- 产物位置：项目根目录下 `dist-electron/`（及发布产物）

### 下载
- 推荐直接下载已构建的安装包：`https://github.com/dalaolala/webssh/releases`
