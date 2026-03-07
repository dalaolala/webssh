@echo off
chcp 65001 >nul
echo ========================================
echo WebSSH 安装包生成脚本
echo ========================================
echo.

echo [1/3] 正在构建前端...
npm run build
if errorlevel 1 (
    echo.
    echo ❌ 前端构建失败!
    pause
    exit /b 1
)

echo.
echo [2/3] 正在打包应用...
npx electron-builder --win --dir
if errorlevel 1 (
    echo.
    echo ❌ 应用打包失败!
    pause
    exit /b 1
)

echo.
echo [3/3] 准备安装包文件...
set "INSTALLER_DIR=dist-electron\WebSSH_Installer"
if exist "%INSTALLER_DIR%" rmdir /s /q "%INSTALLER_DIR%"
mkdir "%INSTALLER_DIR%"

echo 正在复制应用文件...
xcopy "dist-electron\win-unpacked\*" "%INSTALLER_DIR%\" /E /I /Y /H /R /Q

echo 正在复制安装脚本...
copy "scripts\install.bat" "%INSTALLER_DIR%\setup.bat" /Y >nul

echo 正在创建说明文档...
(
echo WebSSH 桌面应用安装包
echo ====================
echo.
echo 安装方法:
echo 1. 双击运行 setup.bat 安装程序
echo 2. 或直接运行 WebSSH.exe 使用
echo.
echo 安装后将创建桌面快捷方式
echo.
echo 版本: 1.0.0
echo 日期: %date%
) > "%INSTALLER_DIR%\安装说明.txt"

echo.
echo ========================================
echo ✅ 安装包生成完成!
echo ========================================
echo.
echo 安装包位置: dist-electron\WebSSH_Installer\
echo.
echo 分发说明:
echo 1. 将 WebSSH_Installer 整个文件夹压缩
echo 2. 分发给用户
echo 3. 用户解压后运行 setup.bat 安装
echo.
pause
