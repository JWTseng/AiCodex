@echo off
echo ========================================
echo   俄罗斯方块游戏 - 独立版本
echo ========================================
echo.
echo 正在启动本地服务器...
echo.
echo 请在浏览器中访问: http://localhost:8000
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

REM 检查是否安装了Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Python，请先安装Python
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 启动Python服务器
python -m http.server 8000

pause
