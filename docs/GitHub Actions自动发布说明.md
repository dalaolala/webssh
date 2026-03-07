# GitHub Actions 自动化发布使用说明

## 概述

配置了 GitHub Actions 工作流,可以通过推送 tag 自动发布 WebSSH 便携版。

## 仓库信息

- **仓库地址**: https://github.com/dalaolala/webssh
- **分支**: feature-local
- **工作流**: `.github/workflows/release.yml`

## 配置说明

### 触发条件

工作流在以下情况下自动触发:

1. **推送 tag** 到仓库
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Tag 格式**: 必须以 `v` 开头
   - ✅ 正确: `v1.0.0`, `v1.0.1`, `v2.0.0`
   - ❌ 错误: `1.0.0`, `release-1.0.0`, `v1.0`

### 自动执行步骤

触发后,GitHub Actions 会自动执行以下步骤:

1. ✓ 检出代码
2. ✓ 设置 Node.js 18 环境
3. ✓ 安装依赖 (`npm install`)
4. ✓ 构建前端 (`npm run build`)
5. ✓ 打包应用 (`electron-builder --win --dir`)
6. ✓ 准备安装包目录
7. ✓ 复制安装脚本和文档
8. ✓ 创建 zip 压缩包
9. ✓ 创建 GitHub Release
10. ✓ 上传 zip 文件到 Release

## 使用步骤

### 第一步: 本地测试打包

在推送 tag 之前,建议先本地测试:

```bash
# 1. 确保代码已提交
git status

# 2. 本地测试打包
rebuild-installer.bat

# 3. 检查生成的文件
dir dist-electron\WebSSH_Portable_v1.0.0.zip
```

### 第二步: 更新版本号(可选)

如果需要发布新版本,先更新 `package.json`:

```json
{
  "version": "1.0.1"
}
```

### 第三步: 提交代码

```bash
# 添加所有更改
git add .

# 提交
git commit -m "chore: 准备发布 v1.0.1"
```

### 第四步: 创建并推送 tag

```bash
# 创建 tag
git tag v1.0.1

# 添加 tag 注释(可选)
git tag -a v1.0.1 -m "WebSSH v1.0.1 - 便携版"

# 推送 tag 到远程仓库
git push origin v1.0.1
```

### 第五步: 查看构建状态

1. 访问 GitHub 仓库
2. 点击 **Actions** 标签页
3. 找到最新的 "Release WebSSH Portable" 工作流
4. 点击工作流查看构建详情
5. 等待构建完成(约 5-10 分钟)

### 第六步: 发布完成

构建成功后:

1. 访问 **Releases** 页面
2. 查看新创建的 Release
3. 下载 `WebSSH_Portable_v1.0.0.zip`
4. 下载链接格式:
   ```
   https://github.com/dalaolala/webssh/releases/download/v1.0.1/WebSSH_Portable_v1.0.0.zip
   ```

## 权限配置

### 首次使用需要配置

在仓库设置中开启 Actions 权限:

1. 访问仓库 **Settings**
2. 点击 **Actions** → **General**
3. 找到 **Workflow permissions**
4. 勾选以下权限:
   - ✅ Read and write permissions
5. 点击 **Save** 保存

### GITHUB_TOKEN

工作流会自动使用 `${{ secrets.GITHUB_TOKEN }}`:
- ✅ GitHub 自动提供
- ✅ 无需手动配置
- ✅ 有创建 Release 和上传文件的权限

## 版本号管理

推荐使用语义化版本号:

```
v[主版本].[次版本].[修订版本]
```

示例:
- `v1.0.0` - 首次正式发布
- `v1.0.1` - bug 修复
- `v1.1.0` - 新增功能
- `v2.0.0` - 重大更新

## 发布内容

每次自动发布的文件:

```
WebSSH_Portable_v1.0.0.zip
├── WebSSH.exe              # 主程序
├── setup.bat                # 安装脚本
├── 安装说明.txt             # 使用文档
├── locales/                 # 语言包
├── resources/               # 应用资源
└── *.dll, *.pak          # 依赖文件
```

## 常见问题

### Q: tag 推送后没有触发 Actions?

A: 检查以下几点:
1. Tag 格式是否正确(必须以 `v` 开头)
2. tag 是否成功推送到远程仓库
3. 在 Actions 页面查看是否有工作流运行

### Q: 构建失败怎么办?

A: 查看失败步骤的日志:
1. 点击失败的工作流
2. 找到失败的步骤
3. 查看详细错误日志
4. 修复问题后重新推送 tag

### Q: 如何重新发布同一版本?

A: Git 不允许重复 tag:
1. 删除远程 tag: `git push origin :refs/tags/v1.0.0`
2. 删除本地 tag: `git tag -d v1.0.0`
3. 修复代码
4. 重新创建并推送 tag

### Q: 如何删除错误的 Release?

A: 在 GitHub Release 页面:
1. 找到需要删除的 Release
2. 点击 **Delete release**
3. 选择删除选项
   - 只删除 Release
   - 同时删除 tag

### Q: 如何查看构建历史?

A:
1. 访问仓库 **Actions** 页面
2. 查看所有工作流运行记录
3. 每次发布都有详细的构建日志

## 最佳实践

### 发布前检查清单

- [ ] 代码已测试,功能正常
- [ ] 本地打包成功
- [ ] 版本号已更新
- [ ] 代码已提交
- [ ] tag 格式正确(v开头)
- [ ] Actions 权限已配置

### 发布后操作

- [ ] 在 Release 中编写详细的更新说明
- [ ] 更新 README.md 添加下载链接
- [ ] 通知用户新版本发布
- [ ] 清理旧的 Release(可选)

### 分支管理

- **feature-local**: 开发分支
- **tag 发布**: 从 feature-local 分支推送
- **master/main**: 稳定版本(可选)

## 输出链接示例

发布成功后,用户可以通过以下方式下载:

```
# 直接下载链接
https://github.com/dalaolala/webssh/releases/download/v1.0.0/WebSSH_Portable_v1.0.0.zip

# Release 页面
https://github.com/dalaolala/webssh/releases/tag/v1.0.0

# 最新版本
https://github.com/dalaolala/webssh/releases/latest
```

## 技术细节

### 工作流文件位置

```
.github/workflows/release.yml
```

### 运行环境

- **平台**: Windows (windows-latest)
- **Node.js**: v18
- **构建工具**: Electron Builder

### 生成的文件

- **文件名**: `WebSSH_Portable_v1.0.0.zip`
- **文件大小**: 约 13 MB
- **包含**: 完整的应用文件 + 安装脚本

### 自动生成的 Release 说明

Release 的描述会自动包含:
- Git commit 信息
- 相关的变更
- 版本对比(如果有多个版本)
