@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo WebSSH 桌面应用卸载程序
echo ========================================
echo.

set "APP_NAME=WebSSH"
set "TARGET_DIR=%USERPROFILE%\Desktop\%APP_NAME%"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\%APP_NAME%.lnk"

echo 即将执行以下操作:
echo   - 删除桌面快捷方式: %SHORTCUT_PATH%
echo   - 删除应用目录: %TARGET_DIR%
echo.
echo ⚠️ 此操作将永久删除 WebSSH 及其所有数据!
echo.
set /p confirm="确认卸载? (输入 Y 确认, 其他键取消): "

if /i not "%confirm%"=="Y" (
    echo.
    echo 已取消卸载操作
    echo.
    pause
    exit /b 0
)

echo.
echo [1/3] 停止运行中的进程...
taskkill /F /IM WebSSH.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [2/3] 删除桌面快捷方式...
if exist "%SHORTCUT_PATH%" (
    del /F /Q "%SHORTCUT_PATH%"
    echo ✅ 已删除桌面快捷方式
) else (
    echo ℹ️  未找到桌面快捷方式
)

echo.
echo [3/3] 删除应用目录...
if exist "%TARGET_DIR%" (
    rmdir /S /Q "%TARGET_DIR%"
    echo ✅ 已删除应用目录
) else (
    echo ℹ️  未找到应用目录
)

echo.
echo ========================================
echo ✅ 卸载完成!
echo ========================================
echo.
echo WebSSH 已成功从您的系统中移除
echo.
pause
