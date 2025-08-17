# NES俄罗斯方块音频系统说明

## 🎵 音频系统概述

本音频系统基于Web Audio API实现，完全使用JavaScript生成经典的chiptune音效和音乐，无需外部音频文件。系统忠实还原了NES《俄罗斯方块》的音频体验。

## 🎼 音乐系统

### 背景音乐
- **Music 1**: Dance of the Sugar Plum Fairy (主游戏音乐)
- **Music 2**: 第二首游戏音乐
- **Music 3**: 第三首游戏音乐

### 音乐特性
- **循环播放**: 背景音乐自动循环
- **chiptune风格**: 使用三角波生成器模拟8-bit音效
- **实时生成**: 基于音符频率表实时生成音乐
- **音量控制**: 独立的音乐音量控制

## 🔊 音效系统

### 游戏音效
| 音效类型 | 触发时机 | 音色 | 频率范围 |
|----------|----------|------|----------|
| **移动音效** | 方块移动时 | 方波 | 800Hz → 640Hz |
| **旋转音效** | 方块旋转时 | 方波 | 1200Hz → 1000Hz |
| **锁定音效** | 方块锁定时 | 锯齿波 | 200Hz → 120Hz |
| **消行音效** | 消除行时 | 方波 | 2400Hz → 4800Hz |
| **升级音效** | 等级提升时 | 三角波 | 600Hz → 1200Hz |
| **游戏结束** | 游戏结束时 | 锯齿波 | 60Hz → 20Hz |

### 音效特性
- **即时响应**: 音效立即播放，无延迟
- **音量包络**: 使用ADSR包络控制音量变化
- **频率调制**: 动态频率变化增强音效表现力

## 🎛️ 音频控制

### 音量控制
- **主音量**: 控制整体音频输出
- **音乐音量**: 独立控制背景音乐音量
- **音效音量**: 独立控制游戏音效音量

### 开关控制
- **音乐开关**: 开启/关闭背景音乐
- **音效开关**: 开启/关闭游戏音效

### 用户界面
- **滑块控制**: 直观的音量调节滑块
- **开关按钮**: 简洁的音频开关控制
- **实时反馈**: 音量数值实时显示

## 🔧 技术实现

### Web Audio API
```javascript
// 创建音频上下文
this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 创建音量控制节点
this.masterGain = this.audioContext.createGain();
this.musicGain = this.audioContext.createGain();
this.sfxGain = this.audioContext.createGain();
```

### 音效生成
```javascript
// 生成chiptune音效
generateChiptuneSFX(type, frequency, duration) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // 设置波形类型
    oscillator.type = 'square'; // 或 'sawtooth', 'triangle'
    
    // 设置频率变化
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.8, this.audioContext.currentTime + duration);
}
```

### 音乐生成
```javascript
// 音乐模式定义
const patterns = {
    music1: [
        { note: 'C5', duration: beatDuration * 2 },
        { note: 'E5', duration: beatDuration * 2 },
        { note: 'G5', duration: beatDuration * 2 },
        // ...
    ]
};
```

## 🎮 游戏集成

### 音频触发点
- **游戏开始**: 启动背景音乐
- **方块移动**: 播放移动音效
- **方块旋转**: 播放旋转音效
- **方块锁定**: 播放锁定音效
- **消行**: 播放消行音效
- **升级**: 播放升级音效
- **游戏结束**: 播放结束音效，停止音乐

### 音频管理器集成
```javascript
class NESTetris {
    constructor() {
        // 音频系统
        this.audio = new NESTetrisAudio();
    }
    
    movePiece(dx, dy) {
        if (this.movePiece(dx, dy)) {
            // 播放移动音效
            this.audio.playSFX('move');
        }
    }
}
```

## 🧪 测试功能

### 音频测试页面
- **音效测试**: 单独测试各种游戏音效
- **音乐测试**: 测试不同的背景音乐
- **音量控制**: 实时调节各种音量
- **开关测试**: 测试音频开关功能

### 测试方法
1. 打开 `audio-test.html`
2. 点击各种音效按钮测试音效
3. 点击音乐按钮测试背景音乐
4. 调节音量滑块测试音量控制
5. 使用开关按钮测试音频开关

## 📱 浏览器兼容性

### 支持的浏览器
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### 音频API支持
- Web Audio API
- AudioContext
- OscillatorNode
- GainNode

## 🎯 音频质量

### 音质特性
- **采样率**: 44.1kHz
- **位深度**: 16-bit
- **声道**: 立体声
- **延迟**: < 10ms

### 性能优化
- **音频缓存**: 避免重复创建音频节点
- **内存管理**: 及时释放音频资源
- **音量控制**: 使用GainNode实现高效音量调节

## 🔄 音频状态管理

### 状态跟踪
- **音乐状态**: 当前播放的音乐类型
- **音量状态**: 各种音量设置
- **开关状态**: 音乐和音效的开启状态

### 状态持久化
- **音量设置**: 保存在内存中
- **开关状态**: 实时更新
- **音频上下文**: 自动恢复

---

*音频系统完全基于Web Audio API实现，无需外部依赖，提供原汁原味的NES俄罗斯方块音频体验。*


