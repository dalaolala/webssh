@echo off
chcp 65001 >nul
echo ========================================
echo WebSSH 压缩包创建工具
echo ========================================
echo.

set "SOURCE_DIR=dist-electron\WebSSH_Installer"
set "ZIP_FILE=dist-electron\WebSSH_Portable_v1.0.0.zip"

if not exist "%SOURCE_DIR%" (
    echo ❌ 错误: 找不到安装包目录
    echo 请先运行 rebuild-installer.bat 生成安装包
    pause
    exit /b 1
)

echo 正在创建压缩包...
if exist "%ZIP_FILE%" del "%ZIP_FILE%"

powershell -Command "Compress-Archive -Path '%SOURCE_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

if exist "%ZIP_FILE%" (
    echo.
    echo ========================================
    echo ✅ 压缩包创建成功!
    echo ========================================
    echo.

    for %%F in ("%ZIP_FILE%") do (
        echo 压缩包位置: %%~fF
        echo 压缩包大小: %%~zF 字节
    )

    echo.
    echo 现在可以分发 WebSSH_Portable_v1.0.0.zip 文件
) else (
    echo.
    echo ❌ 压缩包创建失败!
)

echo.
pause
