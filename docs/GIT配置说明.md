# Git 配置说明

## 已忽略的文件类型

`.gitignore` 文件已经配置好,以下内容不会被提交到 Git:

### 依赖包
- `node_modules/` - Node.js 依赖包
- npm 和 yarn 的 lock 文件已经被包含(需要提交)

### 打包产物
- `dist/` - 前端构建输出
- `dist-electron/` - Electron 打包输出
- `*.exe` - Windows 可执行文件
- `*.dmg` - macOS 安装包
- `*.deb` / `*.rpm` - Linux 安装包
- `*.AppImage` - Linux AppImage

### 日志文件
- `*.log` - 所有日志文件
- `npm-debug.log*` - npm 调试日志
- `yarn-debug.log*` / `yarn-error.log*` - yarn 日志

### 环境配置
- `.env` - 环境变量配置文件(包含敏感信息)
- `.env.local` / `.env.*.local` - 本地环境配置

### 临时文件
- `temp/` / `.tmp/` - 临时目录
- `*.tmp` / `*.temp` - 临时文件
- `*.swp` / `*.swo` - Vim 临时文件

### 编辑器配置
- `.vscode/` - VS Code 配置
- `.idea/` - IntelliJ IDEA 配置
- `.DS_Store` - macOS 系统文件
- `Thumbs.db` - Windows 缩略图缓存

### 系统文件
- `.*` - 隐藏文件
- `ehthumbs.db` - Windows 缩略图
- `.Spotlight-V100` - macOS Spotlight 索引

### 其他
- `*.bak` / `*.backup` - 备份文件
- `prompt.txt` - 用户自定义提示文件
- `ysxq.txt` - 用户文件

## 已提交的重要文件

以下文件已正确提交到 Git:

### 核心代码
- ✅ `electron/` - Electron 主进程代码
- ✅ `backend/` - 后端服务器代码
- ✅ `frontend/` - 前端源代码
- ✅ `scripts/` - 打包和构建脚本

### 配置文件
- ✅ `package.json` - 项目依赖和脚本配置
- ✅ `package-lock.json` - 依赖版本锁定
- ✅ `.gitignore` - Git 忽略规则
- ✅ `rebuild.bat` / `rebuild-quick.bat` - 打包脚本
- ✅ `backend/.env.example` - 环境变量示例(应该保留)

### 文档
- ✅ `README.md` - 项目说明
- ✅ `docs/` - 项目文档

## 已从 Git 移除的敏感文件

以下文件已从 Git 历史中移除:

- ❌ `backend/.env` - 环境变量配置(包含敏感信息)

## 打包后文件处理

打包生成的文件位于 `dist-electron/` 目录,这些文件不会被提交:

```
dist-electron/
├── win-unpacked/
│   ├── WebSSH.exe          # 可执行文件
│   ├── locales/            # 语言包
│   ├── resources/          # 应用资源
│   └── ...                 # 其他依赖
└── 使用说明.md              # 使用说明文档
```

## 推荐的工作流程

### 日常开发
1. 修改代码
2. 测试功能
3. 提交更改到 Git

### 打包发布
1. 确保所有更改已提交
2. 运行打包命令:
   ```bash
   # 完整打包
   npm run dist

   # 或使用批处理脚本
   rebuild.bat
   ```
3. 生成的 `dist-electron/win-unpacked/WebSSH.exe` 可以直接分发

### 分发应用
- ✅ 可以分发: `WebSSH.exe` 可执行文件
- ❌ 不要分发: `dist-electron/` 整个目录(包含源代码)
- ✅ 推荐方式: 将 `WebSSH.exe` 单独复制出来分发

## 环境变量管理

对于需要环境变量的配置:

1. 使用 `.env.example` 作为模板
2. 用户首次运行时复制为 `.env`
3. `.env` 文件会被 `.gitignore` 自动忽略
4. 本地开发时可以使用 `.env.local`

## 注意事项

1. **不要提交敏感信息**: API 密钥、密码、Token 等
2. **不要提交大文件**: 依赖包、打包产物等
3. **不要提交临时文件**: 日志、缓存、临时文件等
4. **保持 .gitignore 更新**: 新增需要忽略的文件类型时及时更新
5. **定期清理**: 使用 `git clean -fd` 清理未跟踪的文件(慎用)
