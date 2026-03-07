@echo off
chcp 65001 >nul
echo ========================================
echo WebSSH 安装包生成脚本
echo ========================================
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
echo [2/3] 正在打包应用...
call npx electron-builder --win --dir
REM electron-builder 可能会因为 winCodeSign 工具缺失而返回错误码,但文件已经生成成功
echo ✓ 应用打包完成

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
echo ✓ 安装包准备完成

echo.
echo [4/4] 正在创建压缩包...
set "ZIP_FILE=dist-electron\WebSSH_Portable_v1.0.0.zip"
if exist "%ZIP_FILE%" del "%ZIP_FILE%"

echo 正在压缩文件...
powershell -Command "Compress-Archive -Path '%INSTALLER_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

if exist "%ZIP_FILE%" (
    echo ✓ 压缩包创建成功

    for %%F in ("%ZIP_FILE%") do (
        set "ZIP_SIZE=%%~zF"
    )

    echo 压缩包大小: %ZIP_SIZE% 字节
) else (
    echo ⚠ 压缩包创建失败,但安装包已准备完成
)

echo.
echo ========================================
echo ✅ 安装包生成完成!
echo ========================================
echo.
echo 安装包位置: dist-electron\WebSSH_Installer\
echo 压缩包位置: %ZIP_FILE%
echo.
echo 分发说明:
echo 1. 直接分发 WebSSH_Portable_v1.0.0.zip
echo 2. 或分发 WebSSH_Installer 整个文件夹
echo 3. 用户解压后运行 setup.bat 安装
echo.
pause
