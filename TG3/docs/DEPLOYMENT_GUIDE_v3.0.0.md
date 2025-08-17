# 🚀 TG3 Tetris v3.0.0 部署指南

## 📋 部署前准备

### 系统要求
- **Web服务器**: 支持静态文件服务的Web服务器
- **浏览器**: 现代浏览器（Chrome 60+, Firefox 55+, Safari 11+）
- **音频支持**: 支持Web Audio API的浏览器
- **存储空间**: 至少50MB可用空间

### 文件检查清单
确保以下核心文件存在：
```
TG3/
├── index.html                 # ✅ 发布入口（主游戏页面）
├── launcher.html              # ✅ 开发者工具（开发入口）
├── src/
│   ├── css/
│   │   └── styles_responsive.css  # ✅ 响应式样式
│   └── js/
│       ├── tetris.js              # ✅ 游戏核心逻辑
│       ├── audio_manager.js       # ✅ 音频管理器
│       ├── unified_scaling.js     # ✅ 统一缩放系统
│       ├── config.js              # ✅ 配置文件
│       └── ... （其他脚本）
└── tests/                         # ✅ 测试页面目录
    ├── combo_audio_test.html
    ├── audio_comparison_test.html
    └── ... （其他测试页面）
```

## 🎯 部署步骤

### 1. 文件上传
```bash
# 方法1: 使用FTP/SFTP上传
scp -r TG3/ user@your-server:/var/www/html/

# 方法2: 使用Git部署
git add .
git commit -m "Release v3.0.0: Audio alignment and unified scaling"
git push origin main
```

### 2. 服务器配置

#### Apache配置
```apache
# .htaccess 文件
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # 启用CORS（如果需要）
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type"
    
    # 设置正确的MIME类型
    AddType application/javascript .js
    AddType text/css .css
    AddType text/html .html
    
    # 启用压缩
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/css application/javascript
    </IfModule>
    
    # 设置缓存
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType text/css "access plus 1 month"
        ExpiresByType application/javascript "access plus 1 month"
        ExpiresByType image/png "access plus 1 month"
        ExpiresByType image/jpg "access plus 1 month"
        ExpiresByType image/jpeg "access plus 1 month"
    </IfModule>
</IfModule>
```

#### Nginx配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/html/TG3;
    index index.html launcher.html;
    
    # 启用gzip压缩
    gzip on;
    gzip_types text/html text/css application/javascript;
    
    # 设置缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico)$ {
        expires 1M;
        add_header Cache-Control "public, immutable";
    }
    
    # 处理HTML文件
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # 启用CORS（如果需要）
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type" always;
}
```

### 3. GitHub Pages部署

#### 自动部署
1. 确保代码已推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择部署分支（通常是`main`或`gh-pages`）
4. 设置自定义域名（可选）

#### 手动部署
```bash
# 创建gh-pages分支
git checkout -b gh-pages

# 添加所有文件
git add .

# 提交更改
git commit -m "Deploy v3.0.0 to GitHub Pages"

# 推送到gh-pages分支
git push origin gh-pages
```

### 4. 验证部署

#### 功能测试清单
- [ ] 游戏主页面正常加载
- [ ] 开发者工具页面可以访问
- [ ] 音频系统正常工作
- [ ] 统一缩放功能正常
- [ ] 连击系统正常工作
- [ ] 测试页面可以访问

#### 性能测试
```bash
# 使用curl测试响应时间
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/TG3/launcher.html"

# 使用Lighthouse进行性能测试
npx lighthouse https://your-domain.com/TG3/launcher.html --output html --output-path ./lighthouse-report.html
```

## 🔧 配置选项

### 音频配置
在 `audio_manager.js` 中可以调整：
```javascript
// 音频设置
this.masterVolume = 0.3;    // 主音量
this.musicVolume = 0.3;     // 音乐音量
this.sfxVolume = 0.8;       // 音效音量
```

### 缩放配置
在 `unified_scaling.js` 中可以调整：
```javascript
// 缩放设置
this.minScale = 0.1;        // 最小缩放比例
this.maxScale = 1.0;        // 最大缩放比例
this.padding = 0;           // 边距
```

### 游戏配置
在 `config.js` 中可以调整：
```javascript
// 游戏设置
const GAME_CONFIG = {
    enableAudio: true,       // 启用音频
    enableScaling: true,     // 启用缩放
    enableGamepad: true,     // 启用手柄
    // ... 其他配置
};
```

## 🧪 测试部署

### 自动化测试
创建测试脚本 `test-deployment.sh`：
```bash
#!/bin/bash

# 测试URL列表
URLS=(
    "https://your-domain.com/TG3/launcher.html"
    "https://your-domain.com/TG3/index.html"
    "https://your-domain.com/TG3/tests/combo_audio_test.html"
)

# 测试每个URL
for url in "${URLS[@]}"; do
    echo "Testing: $url"
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    if [ "$response" = "200" ]; then
        echo "✅ $url - OK"
    else
        echo "❌ $url - Failed (HTTP $response)"
    fi
done
```

### 手动测试步骤
1. **基础功能测试**
   - 打开游戏主页面
   - 直接开始游戏
   - 测试基本游戏功能

2. **音频测试**
   - 访问音频测试页面
   - 测试各种音效
   - 验证连击音效

3. **缩放测试**
   - 调整浏览器窗口大小
   - 验证缩放功能
   - 检查居中显示

4. **兼容性测试**
   - 测试不同浏览器
   - 测试不同设备
   - 验证响应式布局

## 🚨 故障排除

### 常见问题

#### 1. 音频不工作
**症状**: 游戏没有声音
**解决方案**:
- 检查浏览器是否允许音频播放
- 确认Web Audio API支持
- 检查音频文件路径

#### 2. 缩放不工作
**症状**: 界面不随窗口大小变化
**解决方案**:
- 检查JavaScript控制台错误
- 确认unified_scaling.js已加载
- 验证CSS变量设置

#### 3. 游戏无法启动
**症状**: 点击启动按钮无反应
**解决方案**:
- 检查文件路径
- 确认所有依赖文件存在
- 查看浏览器控制台错误

#### 4. 测试页面无法访问
**症状**: 测试页面返回404
**解决方案**:
- 检查tests目录是否存在
- 确认文件权限设置
- 验证服务器配置

### 调试工具
```javascript
// 在浏览器控制台中运行
// 检查音频系统状态
console.log('Audio Manager:', window.globalAudioManager);

// 检查缩放系统状态
console.log('Unified Scaling:', window.unifiedScaling);

// 检查游戏状态
console.log('Game Instance:', window.game);
```

## 📊 监控和维护

### 性能监控
- 使用Google Analytics跟踪用户行为
- 监控页面加载时间
- 跟踪错误率

### 定期维护
- 检查文件完整性
- 更新依赖库
- 备份重要数据

### 用户反馈
- 收集用户反馈
- 监控错误报告
- 持续改进功能

## 🎉 部署完成

部署完成后，用户可以通过以下方式访问：
- **游戏入口**: `https://your-domain.com/TG3/index.html`
- **开发者工具**: `https://your-domain.com/TG3/launcher.html`
- **测试页面**: `https://your-domain.com/TG3/tests/`

恭喜！TG3 Tetris v3.0.0 已成功部署！🎮✨
