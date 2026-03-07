@echo off
chcp 65001 >nul
echo ========================================
echo WebSSH NSIS 安装程序生成脚本
echo ========================================
echo.

echo 检查 NSIS 是否已安装...
where makensh >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 NSIS
    echo.
    echo 请先安装 NSIS:
    echo 1. 访问 https://nsis.sourceforge.io/Download 下载
    echo 2. 或使用: choco install nsis
    echo.
    pause
    exit /b 1
)

echo ✓ NSIS 已安装

echo.
echo [1/3] 正在构建前端...
call npm run build
if errorlevel 1 (
    echo.
    echo ❌ 前端构建失败!
    pause
    exit /b 1
)
echo ✓ 前端构建完成

echo.
echo [2/3] 正在生成 NSIS 安装程序...
call npx electron-builder --win
echo ✓ 安装程序生成完成

echo.
echo [3/3] 检查生成结果...
if exist "dist-electron\WebSSH Setup 1.0.0.exe" (
    for %%F in ("dist-electron\WebSSH Setup 1.0.0.exe") do (
        set "EXE_SIZE=%%~zF"
    )

    echo ========================================
    echo ✅ NSIS 安装程序生成成功!
    echo ========================================
    echo.
    echo 安装程序位置: dist-electron\WebSSH Setup 1.0.0.exe
    echo 安装程序大小: %EXE_SIZE% 字节
    echo.
    echo 分发说明:
    echo 1. 将 WebSSH Setup 1.0.0.exe 分发给用户
    echo 2. 用户双击安装
    echo 3. 自动创建桌面快捷方式和开始菜单项
) else (
    echo ⚠ 未找到安装程序文件
    echo 请检查 dist-electron 目录
)

echo.
pause
