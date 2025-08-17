# 🔄 Git同步指南 - TG3 Tetris v3.0.0

## 📋 同步前检查清单

### 文件结构确认
确保以下文件结构正确：
```
TG3/
├── index.html                       # ✅ 游戏主页面（用户入口）
├── launcher.html                    # ✅ 开发者工具页面
├── clear-scores.html                # ✅ 清除分数页面
├── src/                             # ✅ 源代码目录
│   ├── css/
│   │   └── styles_responsive.css    # ✅ 响应式样式
│   └── js/                          # ✅ JavaScript文件
│       ├── tetris.js                # ✅ 游戏核心逻辑
│       ├── audio_manager.js         # ✅ 音频管理器
│       ├── unified_scaling.js       # ✅ 统一缩放系统
│       ├── leaderboard.js           # ✅ 排行榜功能
│       ├── score_submission.js      # ✅ 分数提交
│       ├── player_name_manager.js   # ✅ 玩家名称管理
│       ├── config.js                # ✅ 配置文件
│       ├── google_apps_script.js    # ✅ Google Apps Script
│       ├── input/                   # ✅ 输入控制
│       │   ├── input_manager.js
│       │   ├── keyboard_controller.js
│       │   ├── gamepad_controller.js
│       │   └── haptics.js
│       └── logging/                 # ✅ 日志系统
│           └── logger.js
├── tests/                           # ✅ 测试页面目录
│   ├── combo_audio_test.html
│   ├── audio_comparison_test.html
│   ├── test_unified_scaling.html
│   └── ... (其他测试页面)
└── docs/                            # ✅ 文档目录
    ├── RELEASE_NOTES_v3.0.0.md     # ✅ 发布说明
    ├── DEPLOYMENT_GUIDE_v3.0.0.md  # ✅ 部署指南
    └── GIT_SYNC_GUIDE.md           # ✅ 本文件
```

## 🚀 Git同步步骤

### 1. 检查当前状态
```bash
# 检查当前分支
git branch

# 检查文件状态
git status

# 查看未跟踪的文件
git status --porcelain
```

### 2. 添加所有文件
```bash
# 添加所有新文件和修改
git add .

# 或者分别添加
git add TG3/
git add TG3/tests/
git add TG3/*.md
```

### 3. 检查暂存区
```bash
# 查看暂存的文件
git diff --cached --name-only

# 查看暂存的内容
git diff --cached
```

### 4. 提交更改
```bash
# 创建提交
git commit -m "Release v3.0.0: Audio alignment and unified scaling

🎵 音频系统全面优化
- 音频对齐修复，与线上版本完全一致
- 连击音效增强，2-8连击钢琴音阶音效
- 压哨"叮"声，增强游戏反馈
- 超低延迟音频播放

📐 统一缩放系统
- PC专用统一缩放系统
- 双窗口同步缩放
- 居中显示，响应式适配
- 支持最小0.1倍缩放

🎮 游戏体验优化
- 动态连击窗口，累计时间限制
- 压哨奖励，额外分数和特效
- UI优化，连击显示和计时器动画
- 完善的游戏重置机制

🔧 技术架构改进
- 模块化设计，音频管理器独立
- 完整测试套件
- 性能优化和代码重构
- 保持跨平台兼容性

📁 文件结构优化
- 新增launcher.html开发者工具页面
- tests/目录整理所有测试页面
- 完整的文档和部署指南"
```

### 5. 推送到远程仓库
```bash
# 推送到主分支
git push origin main

# 或者推送到gh-pages分支（如果使用GitHub Pages）
git push origin gh-pages
```

## 🏷️ 创建版本标签

### 创建标签
```bash
# 创建带注释的标签
git tag -a v3.0.0 -m "TG3 Tetris v3.0.0 - Audio alignment and unified scaling"

# 推送标签到远程
git push origin v3.0.0
```

### 查看标签
```bash
# 查看所有标签
git tag -l

# 查看标签详情
git show v3.0.0
```

## 📊 同步后验证

### 1. 检查远程仓库
```bash
# 检查远程分支
git branch -r

# 检查远程标签
git ls-remote --tags origin
```

### 2. 验证文件完整性
```bash
# 克隆到新目录验证
git clone <your-repo-url> test-clone
cd test-clone
ls -la TG3/
```

### 3. 测试部署
- 访问GitHub Pages（如果启用）
- 测试所有功能页面
- 验证音频和缩放功能

## 🔧 故障排除

### 常见问题

#### 1. 文件过大
**症状**: 推送失败，文件过大
**解决方案**:
```bash
# 检查大文件
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | sort -nr -k 2 | head -10

# 使用Git LFS（如果需要）
git lfs track "*.zip"
git lfs track "*.pdf"
```

#### 2. 权限问题
**症状**: 推送被拒绝
**解决方案**:
```bash
# 检查远程URL
git remote -v

# 重新设置远程URL
git remote set-url origin <your-repo-url>
```

#### 3. 合并冲突
**症状**: 推送时出现冲突
**解决方案**:
```bash
# 拉取最新更改
git pull origin main

# 解决冲突后
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## 📝 提交信息模板

### 标准提交格式
```
type(scope): description

[optional body]

[optional footer]
```

### 示例提交信息
```bash
# 功能提交
git commit -m "feat(audio): implement legacy audio profile alignment

- Add LEGACY_AUDIO_PROFILE configuration
- Implement complex sound effects (line, levelup, gameover)
- Optimize audio initialization timing
- Reduce audio latency to < 10ms"

# 修复提交
git commit -m "fix(scaling): resolve window separation issue

- Fix transform origin conflicts
- Implement unified ui-root container
- Ensure consistent scaling behavior
- Add proper CSS variable handling"

# 文档提交
git commit -m "docs: add comprehensive release notes and deployment guide

- Add v3.0.0 release notes
- Create deployment guide with server configs
- Document audio alignment process
- Include troubleshooting section"
```

## 🎯 发布检查清单

### 发布前检查
- [ ] 所有文件已添加到Git
- [ ] 提交信息清晰完整
- [ ] 测试页面功能正常
- [ ] 文档完整准确
- [ ] 版本号正确

### 发布后检查
- [ ] 远程仓库同步成功
- [ ] 标签创建成功
- [ ] GitHub Pages部署正常
- [ ] 所有功能测试通过
- [ ] 用户反馈收集

## 📈 版本管理建议

### 分支策略
```bash
# 主分支：稳定版本
main

# 开发分支：新功能开发
develop

# 功能分支：具体功能开发
feature/audio-alignment
feature/unified-scaling

# 修复分支：bug修复
hotfix/audio-delay
```

### 版本号规范
- **主版本号**: 重大更新，不兼容的API修改
- **次版本号**: 新功能添加，向后兼容
- **修订号**: bug修复，向后兼容

### 示例版本号
- v3.0.0: 音频对齐和统一缩放
- v3.1.0: 新增游戏模式
- v3.1.1: 修复音频延迟bug

## 🎉 同步完成

完成以上步骤后，TG3 Tetris v3.0.0 已成功同步到GitHub！

### 下一步
1. 在GitHub上创建Release
2. 更新项目README
3. 通知用户新版本发布
4. 收集用户反馈

恭喜！版本发布完成！🎮✨
