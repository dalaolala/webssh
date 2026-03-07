@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo WebSSH 桌面应用安装程序
echo ========================================
echo.

set "APP_NAME=WebSSH"
set "TARGET_DIR=%USERPROFILE%\Desktop\%APP_NAME%"
set "SHORTCUT_NAME=%APP_NAME%.lnk"

echo [1/3] 创建安装目录...
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo.
echo [2/3] 复制应用文件...
xcopy "%~dp0*" "%TARGET_DIR%\" /E /I /Y /H /R >nul 2>&1
xcopy "%~dp0*" "%TARGET_DIR%\" /E /I /Y /H /R /Q

echo.
echo [3/3] 创建桌面快捷方式...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\%SHORTCUT_NAME%'); $s.TargetPath = '%TARGET_DIR%\WebSSH.exe'; $s.WorkingDirectory = '%TARGET_DIR%'; $s.Description = 'WebSSH 桌面应用'; $s.Save()"

echo.
echo ========================================
echo ✅ 安装完成!
echo ========================================
echo.
echo 安装位置: %TARGET_DIR%
echo 快捷方式: 桌面
echo.
echo 您现在可以从桌面快捷方式启动 WebSSH
echo.
pause
