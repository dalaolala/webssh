## CI/CD 简要指南

本项目支持自动构建发布，普通用户直接从 Releases 获取安装包：`https://github.com/dalaolala/webssh/releases`。

### 流水线要点
- 安装依赖 → 运行测试（如有） → `npm run dist` 生成桌面安装包。
- 构建产物上传至 GitHub Releases，便于分发。
- 可在 Actions 手动触发或按分支策略自动触发。

### 额外提示
- 如需自建流水线，请确保环境具备 Node.js、electron-builder 依赖及必要的签名配置（如需要）。
- 若只需使用应用，无需关心流水线，直接下载即可。
