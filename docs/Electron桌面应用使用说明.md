# WebSSH 桌面版使用说明

## 文件位置
打包后的应用程序位于: `dist-electron/win-unpacked/WebSSH.exe`

## GitHub Actions 自动发布 ⭐ 推荐用于公开发布

项目已配置 GitHub Actions 自动发布,可以通过推送 tag 自动生成便携版并发布到 GitHub Release。

### 快速发布命令

```bash
# 使用发布脚本(最简单)
release.bat

# 或手动推送 tag
git tag v1.0.0
git push origin v1.0.0
```

### 发布流程

1. **本地测试**: 运行 `release.bat`,输入版本号
2. **自动构建**: 脚本会自动构建前端和打包应用
3. **提交代码**: 自动提交并推送到 feature-local 分支
4. **推送 tag**: 自动创建并推送 tag 到 GitHub
5. **自动发布**: GitHub Actions 自动构建并创建 Release
6. **下载文件**: 用户从 Release 页面下载 zip 文件

### 详细说明

详见: `docs/GitHub Actions自动发布说明.md`

### 仓库信息

- 仓库: https://github.com/dalaolala/webssh
- 分支: feature-local
- 工作流: `.github/workflows/release.yml`

### 输出

```
https://github.com/dalaolala/webssh/releases/download/v1.0.0/WebSSH_Portable_v1.0.0.zip
```

## 打包方式

### 方式一: 单文件模式(默认)
生成单文件可执行程序,用户可以直接运行:
```bash
npm run dist
# 或
rebuild.bat
```
- **输出**: `dist-electron/win-unpacked/WebSSH.exe`
- **优点**: 单文件,无依赖,直接运行
- **缺点**: 文件较大(~177MB)

### 方式二: 便携安装包(推荐) ⭐
自动生成带安装脚本的 zip 压缩包:
```bash
rebuild-installer.bat
```
- **输出**: `dist-electron/WebSSH_Portable_v1.0.0.zip` (~12.7MB)
- **包含**: WebSSH.exe + setup.bat 安装脚本 + 说明文档
- **优点**: 压缩后文件小(~13MB),方便分发,一键安装
- **缺点**: 用户需要解压后运行

### 方式三: 便携安装包(手动)
将应用目录手动压缩成 zip 包:
```bash
# 1. 先生成应用目录
npm run dist:dir

# 2. 然后手动压缩
cd dist-electron
# 使用 WinRAR/7-Zip 等工具压缩 WebSSH_Installer 目录
```
- **输出**: 手动创建的 zip 文件
- **优点**: 完全控制压缩方式和文件内容
- **缺点**: 需要手动操作

### 方式四: NSIS 安装程序(专业) ⭐⭐⭐
生成专业的 Windows 安装程序(.exe),提供完整安装向导:
```bash
# 需要先安装 NSIS 工具
# 下载地址: https://nsis.sourceforge.io/Download

# 然后运行
rebuild-nsis.bat

# 或使用 npm 命令
npm run dist:installer
```
- **输出**: `dist-electron/WebSSH Setup 1.0.0.exe` (~50-60MB)
- **优点**: 专业的安装体验,支持自定义安装路径、快捷方式、卸载等
- **缺点**: 需要额外安装 NSIS 工具
- **适用场景**: 公开发布、企业部署

详细说明请参考: `docs/NSIS安装说明.md`

## 重新打包步骤

### 方法一: 完整重新打包(推荐)
```bash
npm run dist
```
这个命令会:
1. 重新构建前端项目
2. 重新打包整个应用为 Windows 可执行文件

### 方法二: 仅重新构建前端
```bash
npm run build
```
然后手动启动应用测试:
```bash
npm run electron:dev
```

### 方法三: 仅打包(不重新构建前端)
```bash
npx electron-builder --win --dir
```

### 方法四: 直接运行批处理脚本(推荐)
```bash
rebuild.bat         # 完整打包
rebuild-quick.bat   # 快速打包(跳过前端构建)
```

## 修改代码后重新打包
如果你修改了代码,按以下顺序操作:

1. **修改前端代码后**:
   ```bash
   rebuild.bat
   # 或
   npm run build && npx electron-builder --win --dir
   ```

2. **修改后端代码后**:
   ```bash
   rebuild-quick.bat
   # 或
   npx electron-builder --win --dir
   ```

3. **修改 Electron 配置后**:
   ```bash
   rebuild.bat
   # 或
   npx electron-builder --win --dir
   ```

## 常见问题

### 打包时出现 winCodeSign 错误
这是正常的,可以忽略。electron-builder 会尝试设置应用图标,但即使失败也不会影响打包结果。只要看到 `dist-electron\win-unpacked\WebSSH.exe` 文件生成,就说明打包成功。

## 主要特点
1. **独立运行**: 无需安装 Node.js 环境,打开即可使用
2. **完整功能**: 包含前端(Vue3)和后端(Express + Socket.io)的所有功能
3. **自动启动**: 双击 exe 文件会自动启动后端服务器和前端界面
4. **内置环境**: 包含完整的 Node.js 运行时和 Chromium 浏览器内核

## 使用方法
1. 双击 `WebSSH.exe` 启动应用
2. 应用会自动打开浏览器界面访问 `http://localhost:3000`
3. 开始使用 SSH 连接功能

## 技术说明
- **打包工具**: Electron + electron-builder
- **前端**: Vue3 + Vite + Element Plus + xterm.js
- **后端**: Express + Socket.io + ssh2
- **Node.js 版本**: 内置 Electron 自带的 Node.js 运行时

## 文件大小
- WebSSH.exe: ~177 MB
- 包含完整的运行环境,无需额外依赖

## 注意事项
1. 首次启动可能需要几秒钟时间
2. 确保 3000 端口未被占用
3. 关闭应用时会自动停止后端服务
