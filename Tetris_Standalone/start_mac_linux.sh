#!/bin/bash

echo "========================================"
echo "  俄罗斯方块游戏 - 独立版本"
echo "========================================"
echo ""
echo "正在启动本地服务器..."
echo ""
echo "请在浏览器中访问: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "========================================"
echo ""

# 检查是否安装了Python3
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python3，请先安装Python3"
    echo "macOS: brew install python3"
    echo "Ubuntu/Debian: sudo apt-get install python3"
    exit 1
fi

# 启动Python服务器
python3 -m http.server 8000
