@echo off
chcp 65001 >nul
echo ========================================
echo WebSSH 快速打包(跳过前端构建)
echo ========================================
echo.

echo [1/1] 正在打包应用...
npx electron-builder --win --dir
if errorlevel 1 (
    echo.
    echo ❌ 应用打包失败!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 打包完成!
echo ========================================
echo.
echo 打包文件位置: dist-electron\win-unpacked\WebSSH.exe
echo.
pause
