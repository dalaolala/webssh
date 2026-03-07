@echo off
chcp 65001 >nul
echo ========================================
echo WebSSH 重新打包脚本
echo ========================================
echo.

echo [1/2] 正在构建前端...
npm run build
if errorlevel 1 (
    echo.
    echo ❌ 前端构建失败!
    pause
    exit /b 1
)

echo.
echo [2/2] 正在打包应用...
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
