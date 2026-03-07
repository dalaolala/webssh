# NSIS 安装程序生成说明

## 什么是 NSIS?

NSIS (Nullsoft Scriptable Install System) 是一个专业的 Windows 安装程序制作工具,可以创建专业的 .exe 安装程序。

## 安装 NSIS

### 方法一: 官网下载安装(推荐)

1. 访问 NSIS 官网: https://nsis.sourceforge.io/Download
2. 下载最新版本的安装程序(例如: nsis-3.09-setup.exe)
3. 双击运行安装程序
4. 按照向导完成安装
5. 默认安装路径: `C:\Program Files (x86)\NSIS`

### 方法二: 使用 Chocolatey

如果你已经安装了 Chocolatey:

```bash
choco install nsis
```

### 方法三: 使用 Scoop

如果你已经安装了 Scoop:

```bash
scoop bucket add extras
scoop install nsis
```

## 验证 NSIS 安装

打开命令提示符,执行以下命令:

```bash
makensh /VERSION
```

如果显示版本号,说明安装成功。

## 使用 NSIS 生成安装程序

### 方法一: 使用脚本(推荐)

```bash
rebuild-nsis.bat
```

### 方法二: 使用 npm 命令

```bash
npm run dist:installer
```

### 方法三: 使用 npx 命令

```bash
npx electron-builder --win
```

## NSIS 配置说明

在 `package.json` 中的 NSIS 配置:

```json
{
  "build": {
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,                          // 禁用一键安装
      "allowToChangeInstallationDirectory": true, // 允许修改安装目录
      "createDesktopShortcut": true,             // 创建桌面快捷方式
      "createStartMenuShortcut": true,           // 创建开始菜单快捷方式
      "shortcutName": "WebSSH",                  // 快捷方式名称
      "perMachine": false,                       // 不安装到 Program Files
      "runAfterFinish": true                     // 安装完成后运行
    }
  }
}
```

## 输出文件

生成的安装程序位于:

```
dist-electron\WebSSH Setup 1.0.0.exe
```

文件大小通常约为 50-60 MB(压缩后)。

## 安装程序功能

使用 NSIS 生成的安装程序提供以下功能:

1. **安装向导**: 专业的安装界面
2. **选择安装目录**: 用户可以自定义安装路径
3. **创建快捷方式**:
   - 桌面快捷方式
   - 开始菜单快捷方式
4. **自动卸载**: 添加到"添加或删除程序"
5. **安装完成后运行**: 自动启动应用

## 用户安装步骤

1. 双击 `WebSSH Setup 1.0.0.exe`
2. 选择安装目录(默认: `C:\Users\[用户名]\AppData\Local\WebSSH`)
3. 点击"安装"按钮
4. 等待安装完成
5. 点击"完成"按钮,自动启动应用

## 卸载

用户可以通过以下方式卸载:

1. **控制面板**: 添加或删除程序
2. **开始菜单**: WebSSH -> 卸载
3. **安装目录**: 运行 unins000.exe

## 常见问题

### Q: 找不到 makensh 命令
A: NSIS 未安装或未添加到系统 PATH,请重新安装 NSIS。

### Q: 安装程序生成失败
A: 确保 electron-builder 已正确配置 NSIS target。

### Q: 安装程序文件过大
A: 这是正常的,NSIS 安装程序包含完整的应用文件和依赖。

### Q: 如何自定义安装界面?
A: 可以在 `package.json` 中添加更多 NSIS 配置选项。

## 比较三种打包方式

| 方式 | 文件大小 | 安装体验 | 专业度 | 推荐度 |
|------|---------|---------|--------|--------|
| 单文件 | ~177 MB | 直接运行 | ⭐⭐ | ⭐⭐ |
| 便携安装包 | ~13 MB | 解压+安装 | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| NSIS 安装程序 | ~50-60 MB | 专业安装 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 推荐方案

- **开发测试**: 使用单文件模式 (`rebuild.bat`)
- **内部分发**: 使用便携安装包 (`rebuild-installer.bat`)
- **公开发布**: 使用 NSIS 安装程序 (`rebuild-nsis.bat`)
