@echo off
chcp 65001 >nul
title WebSSH服务关闭工具

echo ========================================
echo    WebSSH后台服务关闭工具
echo ========================================
echo.

:: 设置颜色
color 0C

:: 检查是否以管理员身份运行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] 建议以管理员身份运行此脚本以获得最佳效果
    echo.
)

echo 正在停止所有WebSSH相关服务...
echo.

:: 1. 停止Node.js进程（后端服务）
echo [1/3] 停止Node.js后台服务...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node"') do (
    echo 正在停止Node进程 PID: %%i
    taskkill /f /pid %%i >nul 2>&1
)
echo ✓ Node.js服务已停止

:: 2. 停止Vite开发服务器（前端服务）
echo [2/3] 停止前端开发服务器...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "vite"') do (
    echo 正在停止Vite进程 PID: %%i
    taskkill /f /pid %%i >nul 2>&1
)
echo ✓ Vite开发服务器已停止

:: 3. 停止npm相关进程
echo [3/3] 停止npm相关进程...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "npm"') do (
    echo 正在停止npm进程 PID: %%i
    taskkill /f /pid %%i >nul 2>&1
)

:: 停止concurrently进程
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "concurrently"') do (
    echo 正在停止concurrently进程 PID: %%i
    taskkill /f /pid %%i >nul 2>&1
)

echo ✓ npm相关进程已停止
echo.

:: 4. 检查端口占用情况
echo 检查端口占用情况...
netstat -ano | findstr ":3000" >nul
if %errorLevel% equ 0 (
    echo [警告] 端口3000仍被占用，正在强制释放...
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":3000"') do (
        if not "%%i"=="0" (
            echo 强制停止占用端口3000的进程 PID: %%i
            taskkill /f /pid %%i >nul 2>&1
        )
    )
)

netstat -ano | findstr ":5173" >nul
if %errorLevel% equ 0 (
    echo [警告] 端口5173仍被占用，正在强制释放...
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":5173"') do (
        if not "%%i"=="0" (
            echo 强制停止占用端口5173的进程 PID: %%i
            taskkill /f /pid %%i >nul 2>&1
        )
    )
)

echo ✓ 端口检查完成
echo.

:: 5. 清理临时文件
echo 清理临时文件...
if exist "backend\node_modules\.cache" (
    rmdir /s /q "backend\node_modules\.cache" >nul 2>&1
    echo ✓ 后端缓存已清理
)

if exist "frontend\node_modules\.vite" (
    rmdir /s /q "frontend\node_modules\.vite" >nul 2>&1
    echo ✓ 前端缓存已清理
)

if exist "frontend\dist" (
    echo ✓ 前端构建目录存在
)

echo.
echo ========================================
echo    所有WebSSH服务已成功停止！
echo ========================================
echo.
echo 已停止的服务包括：
echo   • Node.js后端服务 (端口3000)
echo   • Vite前端开发服务器 (端口5173)
echo   • npm和concurrently进程
echo   • 相关端口占用已释放
echo.
echo 如需重新启动服务，请运行：
echo   npm run dev    (开发模式)
echo   npm start      (生产模式)
echo.

:: 恢复默认颜色
color 07

pause