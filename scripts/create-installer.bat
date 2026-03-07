@echo off
chcp 65001 >nul
setlocal

echo ========================================
echo WebSSH 便携安装包创建工具
echo ========================================
echo.

set "APP_NAME=WebSSH"
set "APP_VERSION=1.0.0"
set "SOURCE_DIR=%~dp0..\dist-electron\win-unpacked"
set "OUTPUT_DIR=%~dp0..\dist-electron\installer"
set "OUTPUT_FILE=%OUTPUT_DIR%\%APP_NAME%_Portable_v%APP_VERSION%.zip"

if not exist "%SOURCE_DIR%" (
    echo ❌ 错误: 找不到源目录
    echo 请先运行 npm run dist 生成应用
    pause
    exit /b 1
)

echo [1/2] 创建输出目录...
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo [2/2] 创建便携安装包...
cd "%SOURCE_DIR%"

if exist "%OUTPUT_FILE%" del "%OUTPUT_FILE%"

powershell -Command "Compress-Archive -Path * -DestinationPath '%OUTPUT_FILE%' -Force"

if errorlevel 1 (
    echo.
    echo ❌ 创建安装包失败!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 便携安装包创建成功!
echo ========================================
echo.
echo 安装包位置: %OUTPUT_FILE%
echo 文件大小:
for %%F in ("%OUTPUT_FILE%") do echo %%~zF 字节
echo.
pause
