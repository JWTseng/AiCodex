# TG3 Tetris Game - GitHub Pages 部署

## 🎮 游戏访问

你的经典NES俄罗斯方块游戏已经成功部署到GitHub Pages！

### 访问地址
- **主游戏页面**: https://jwtseng.github.io/AiCodex/
- **开发者工具**: https://jwtseng.github.io/AiCodex/TG3/launcher.html
- **游戏手柄测试**: https://jwtseng.github.io/AiCodex/TG3/tests/gamepad_test.html
- **简单手柄测试**: https://jwtseng.github.io/AiCodex/TG3/tests/simple_gamepad_test.html
- **清除分数页面**: https://jwtseng.github.io/AiCodex/TG3/clear-scores.html
- **缩放测试**: https://jwtseng.github.io/AiCodex/TG3/tests/test_unified_scaling.html
- **音频对比测试**: https://jwtseng.github.io/AiCodex/TG3/audio_comparison_test.html

## 🚀 部署状态

✅ **部署完成**
- 代码已推送到 `gh-pages` 分支
- GitHub Pages 服务已启用
- 游戏文件已正确配置
- 新增Xbox手柄支持功能
- **PC浏览器适配问题已修复**

## 🎯 游戏特色

- **NES物理引擎**: 精确的方块旋转和下落
- **经典音效**: 8位复古音效系统
- **连击系统**: 10秒时间窗口的连击机制
- **高分记录**: 本地存储最高分
- **响应式设计**: 支持不同屏幕尺寸
- **🎮 Xbox手柄支持**: 完整的手柄控制体验
- **📳 振动反馈**: 游戏事件触发的振动效果
- **🔧 输入系统**: 统一的键盘和手柄输入管理
- **📐 智能缩放**: 自动适配PC浏览器窗口大小

## 🎮 游戏控制

### 键盘控制
- **Enter/Space**: 开始游戏/暂停
- **← →**: 左右移动
- **↓**: 软降（加速下落）
- **Q/W**: 旋转方块
- **D**: 硬降（立即下落）
- **R**: 重置游戏
- **M**: 音乐开关

### 🎮 Xbox手柄控制
- **左摇杆/十字键**: 移动方块
- **右摇杆**: 旋转方块
- **A按钮**: 软降
- **X/Y按钮**: 旋转
- **Start按钮**: 开始/暂停
- **Back按钮**: 重置游戏
- **LB/RB按钮**: 音乐开关

### 📳 振动反馈
- 移动方块时短振动
- 旋转方块时双短振动
- 消除行时模式振动
- 游戏结束时长模式振动

## 📱 兼容性

- ✅ Chrome/Edge (推荐，完整手柄支持)
- ✅ Firefox (完整手柄支持)
- ✅ Safari (部分手柄支持)
- ✅ 移动设备浏览器
- ✅ **PC浏览器窗口缩放适配**

## 🔧 技术栈

- **前端**: HTML5 + CSS3 + JavaScript
- **游戏引擎**: Canvas API
- **音频**: Web Audio API
- **存储**: LocalStorage
- **手柄支持**: Web Gamepad API
- **振动**: Vibration API + Gamepad Haptic Actuator API
- **响应式**: 智能缩放系统 (responsive/scale.js)

## 🎮 手柄测试

访问 `gamepad_test.html` 可以：
- 查看手柄连接状态
- 实时监控按钮和摇杆
- 测试振动功能
- 查看手柄详细信息

## 📐 PC适配特性

### 智能缩放系统
- **自动适配**: 根据浏览器窗口大小自动调整游戏界面
- **保持比例**: 确保游戏画面不会变形
- **最小缩放**: 0.6倍，避免界面过小
- **最大缩放**: 1.0倍，保持原始大小
- **实时响应**: 窗口大小改变时自动重新计算

### 适配参数
- **视口边距**: 32px，确保界面不会贴边
- **缩放算法**: 基于窗口宽高的最小值计算
- **布局保护**: 防止缩放导致的布局坍塌

---

**部署时间**: 2024年8月16日
**版本**: 2.1.0 (PC浏览器适配修复)
**维护者**: JWTseng
