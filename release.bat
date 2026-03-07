@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo WebSSH 自动发布脚本
echo ========================================
echo.

rem 获取版本号
set /p VERSION="请输入版本号(如: 1.0.0): "

if "!VERSION!"=="" (
    echo ❌ 错误: 版本号不能为空
    pause
    exit /b 1
)

set "TAG=v%VERSION%"

echo.
echo ========================================
echo 发布信息
echo ========================================
echo 版本号: %VERSION%
echo Tag:    %TAG%
echo 仓库:   dalaolala/webssh
echo 分支:   feature-local
echo ========================================
echo.

rem 确认发布
set /p CONFIRM="确认发布? (y/n): "
if /i not "!CONFIRM!"=="y" (
    echo 已取消发布
    pause
    exit /b 0
)

echo.
echo [1/4] 正在构建应用...
call rebuild-installer.bat
if errorlevel 1 (
    echo.
    echo ❌ 构建失败!
    pause
    exit /b 1
)

echo.
echo [2/4] 检查 git 状态...
for /f "delims=" %%i in ('git status --short') do set "CHANGES=%%i"

if "%CHANGES%"=="" (
    echo ✓ 工作区干净
) else (
    echo ⚠ 工作区有未提交的更改
    git status --short
)

echo.
echo [3/4] 添加并提交代码...
git add .
git commit -m "release: %TAG% - WebSSH 便携版发布" || echo 无新提交

echo.
echo [4/4] 创建并推送 tag...
git tag %TAG%
git push origin feature-local

if errorlevel 1 (
    echo ❌ 推送失败!
    pause
    exit /b 1
)

echo.
git push origin %TAG%

if errorlevel 1 (
    echo ❌ Tag 推送失败!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ 发布流程已启动!
echo ========================================
echo.
echo 接下来的步骤:
echo 1. GitHub Actions 会自动构建
echo 2. 构建时间约 5-10 分钟
echo 3. 访问以下地址查看构建状态:
echo    https://github.com/dalaolala/webssh/actions
echo 4. 构建完成后,访问以下地址下载:
echo    https://github.com/dalaolala/webssh/releases/tag/%TAG%
echo.
echo 📦 自动生成的文件:
echo    WebSSH_Portable_%VERSION%.zip
echo.
pause
