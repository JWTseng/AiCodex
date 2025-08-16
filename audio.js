/**
 * NES俄罗斯方块音频管理器
 * 基于Web Audio API实现经典chiptune音效
 */

class NESTetrisAudio {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        // 音频状态
        this.musicEnabled = false; // 默认关闭音乐
        this.sfxEnabled = true;
        this.masterVolume = 0.3; // 默认30%
        this.musicVolume = 0.3;  // 默认30%
        this.sfxVolume = 0.8;
        
        // 当前播放的音乐
        this.currentMusic = null;
        this.lastMusicType = 'music1'; // 保存最后播放的音乐类型
        this.musicSource = null;
        
        // 音效缓存
        this.sfxCache = {};
        
        // 音频优化设置 - 超低延迟
        this.audioLatency = 0; // 零延迟
        this.lastPlayTime = 0;
        this.minPlayInterval = 0.005; // 5ms间隔，几乎无限制
        this.lastSFXType = ''; // 记录上次播放的音效类型
        this.moveSFXInterval = 0.03; // 30ms移动间隔，更快速响应
        this.lastMoveTime = 0; // 记录上次移动音效时间
        
        // 初始化音频系统
        this.initAudio();
    }
    
    initAudio() {
        try {
            // 创建音频上下文 - 超低延迟设置
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: 'interactive', // 交互式低延迟
                sampleRate: 48000, // 更高采样率，减少延迟
                bufferSize: 256 // 小缓冲区，最小化延迟
            });
            
            // 创建主音量控制
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            // 创建音乐音量控制
            this.musicGain = this.audioContext.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.musicVolume;
            
            // 创建音效音量控制
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;
            
            console.log('音频系统初始化成功 - 优化延迟模式');
        } catch (error) {
            console.error('音频系统初始化失败:', error);
        }
    }
    
    // 生成chiptune音效 - 超低延迟版本
    generateChiptuneSFX(type, frequency = 440, duration = 0.1) {
        if (!this.audioContext || !this.sfxEnabled) return;
        
        try {
            // 直接播放，不使用requestAnimationFrame，最小化延迟
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            const startTime = this.audioContext.currentTime; // 立即播放，零延迟
                
                // 舒适版音效参数 - 保持经典特色但更柔和
                switch (type) {
                    case 'move':
                        // 舒适移动音效 - 600Hz正弦波，更柔和
                        oscillator.frequency.setValueAtTime(600, startTime);
                        oscillator.type = 'sine'; // 正弦波，更舒适
                        break;
                        
                    case 'rotate':
                        // 舒适旋转音效 - 800Hz三角波，清脆但不刺耳
                        oscillator.frequency.setValueAtTime(800, startTime);
                        oscillator.type = 'triangle'; // 三角波，清脆
                        break;
                        
                    case 'lock':
                        // 舒适锁定音效 - 200Hz正弦波，更自然
                        oscillator.frequency.setValueAtTime(200, startTime);
                        oscillator.type = 'sine'; // 正弦波，更自然
                        break;
                        
                    case 'line':
                        // 舒适消行音效 - 1000Hz→1500Hz正弦波，更自然的上升
                        oscillator.frequency.setValueAtTime(1000, startTime);
                        oscillator.frequency.exponentialRampToValueAtTime(1500, startTime + duration * 0.6);
                        oscillator.type = 'sine'; // 正弦波，更自然的上升
                        break;
                        
                    case 'levelup':
                        // 舒适升级音效 - 500Hz→1200Hz正弦波，更舒适的上升音阶
                        oscillator.frequency.setValueAtTime(500, startTime);
                        oscillator.frequency.exponentialRampToValueAtTime(800, startTime + duration * 0.3);
                        oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + duration);
                        oscillator.type = 'sine'; // 正弦波，更舒适
                        break;
                        
                    case 'gameover':
                        // 舒适游戏结束音效 - 300Hz→80Hz正弦波，更自然的下降
                        oscillator.frequency.setValueAtTime(300, startTime);
                        oscillator.frequency.exponentialRampToValueAtTime(200, startTime + duration * 0.4);
                        oscillator.frequency.exponentialRampToValueAtTime(80, startTime + duration);
                        oscillator.type = 'sine'; // 正弦波，更自然
                        break;
                }
                
                // 舒适版音量包络 - 更自然的衰减
                switch (type) {
                    case 'move':
                        // 移动音效 - 舒适音量包络 (80ms)
                        gainNode.gain.setValueAtTime(0.2, startTime); // 降低音量
                        gainNode.gain.linearRampToValueAtTime(0.15, startTime + duration * 0.3);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                        
                    case 'rotate':
                        // 旋转音效 - 舒适音量包络 (100ms)
                        gainNode.gain.setValueAtTime(0.25, startTime); // 适中音量
                        gainNode.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.4);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                        
                    case 'lock':
                        // 锁定音效 - 舒适音量包络 (150ms)
                        gainNode.gain.setValueAtTime(0.3, startTime); // 中等音量
                        gainNode.gain.linearRampToValueAtTime(0.25, startTime + duration * 0.5);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                        
                    case 'line':
                        // 消行音效 - 舒适音量包络 (200ms)
                        gainNode.gain.setValueAtTime(0.4, startTime); // 较重音量
                        gainNode.gain.linearRampToValueAtTime(0.35, startTime + duration * 0.4);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                        
                    case 'levelup':
                        // 升级音效 - 舒适音量包络 (500ms)
                        gainNode.gain.setValueAtTime(0.5, startTime); // 重音量
                        gainNode.gain.linearRampToValueAtTime(0.45, startTime + duration * 0.4);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                        
                    case 'gameover':
                        // 游戏结束音效 - 舒适音量包络 (600ms)
                        gainNode.gain.setValueAtTime(0.6, startTime); // 最重音量
                        gainNode.gain.linearRampToValueAtTime(0.5, startTime + duration * 0.3);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                        
                    default:
                        // 默认舒适音量
                        gainNode.gain.setValueAtTime(0.25, startTime);
                        gainNode.gain.linearRampToValueAtTime(0.2, startTime + duration * 0.4);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        break;
                }
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            
        } catch (error) {
            console.error('音效生成失败:', error);
        }
    }
    
    // 生成背景音乐
    generateBackgroundMusic(type = 'music1') {
        if (!this.audioContext || !this.musicEnabled) return;
        
        try {
            // 停止当前音乐
            this.stopMusic();
            
            // 保存音乐类型
            this.lastMusicType = type;
            
            // 创建音乐生成器
            const musicGenerator = this.createMusicGenerator(type);
            this.currentMusic = type;
            
            // 开始播放音乐
            this.playMusicLoop(musicGenerator);
            
        } catch (error) {
            console.error('音乐生成失败:', error);
        }
    }
    
    // 创建音乐生成器
    createMusicGenerator(type) {
        const tempo = 120; // BPM
        const beatDuration = 60 / tempo;
        
        // 音乐模式定义 (简化的chiptune旋律)
        const patterns = {
            music1: [
                // Dance of the Sugar Plum Fairy 简化版
                { note: 'C5', duration: beatDuration * 2 },
                { note: 'E5', duration: beatDuration * 2 },
                { note: 'G5', duration: beatDuration * 2 },
                { note: 'C6', duration: beatDuration * 2 },
                { note: 'G5', duration: beatDuration * 2 },
                { note: 'E5', duration: beatDuration * 2 },
                { note: 'C5', duration: beatDuration * 2 },
                { note: 'rest', duration: beatDuration * 2 }
            ],
            music2: [
                // 第二首音乐
                { note: 'A4', duration: beatDuration },
                { note: 'C5', duration: beatDuration },
                { note: 'E5', duration: beatDuration },
                { note: 'A5', duration: beatDuration },
                { note: 'E5', duration: beatDuration },
                { note: 'C5', duration: beatDuration },
                { note: 'A4', duration: beatDuration },
                { note: 'rest', duration: beatDuration }
            ],
            music3: [
                // 第三首音乐
                { note: 'D4', duration: beatDuration * 1.5 },
                { note: 'F4', duration: beatDuration * 0.5 },
                { note: 'A4', duration: beatDuration * 1.5 },
                { note: 'D5', duration: beatDuration * 0.5 },
                { note: 'A4', duration: beatDuration * 1.5 },
                { note: 'F4', duration: beatDuration * 0.5 },
                { note: 'D4', duration: beatDuration * 1.5 },
                { note: 'rest', duration: beatDuration * 0.5 }
            ]
        };
        
        return patterns[type] || patterns.music1;
    }
    
    // 播放循环音乐
    playMusicLoop(pattern) {
        if (!this.audioContext || !this.musicEnabled) return;
        
        let currentTime = this.audioContext.currentTime;
        const noteFrequencies = {
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98, 'A6': 1760.00, 'B6': 1975.53
        };
        
        pattern.forEach((noteData, index) => {
            if (noteData.note === 'rest') {
                currentTime += noteData.duration;
                return;
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            oscillator.frequency.setValueAtTime(noteFrequencies[noteData.note], currentTime);
            oscillator.type = 'triangle';
            
            // 音量包络
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + noteData.duration);
            
            oscillator.start(currentTime);
            oscillator.stop(currentTime + noteData.duration);
            
            currentTime += noteData.duration;
        });
        
        // 循环播放
        setTimeout(() => {
            if (this.currentMusic) {
                this.playMusicLoop(pattern);
            }
        }, currentTime * 1000);
    }
    
    // 停止音乐
    stopMusic() {
        this.currentMusic = null;
    }
    
    // 暂停音乐（保持音乐类型）
    pauseMusic() {
        this.currentMusic = null;
    }
    
    // 播放音效 - 优化版本，恢复更多音效但保持低延迟
    playSFX(type) {
        if (!this.audioContext || !this.sfxEnabled) return;
        
        const currentTime = this.audioContext.currentTime;
        
        // 移动音效特殊处理 - 防止过于频繁
        if (type === 'move') {
            if (currentTime - this.lastMoveTime < this.moveSFXInterval) {
                return;
            }
            this.lastMoveTime = currentTime;
        } else {
            // 其他音效的防重复检查
            if (type === this.lastSFXType && currentTime - this.lastPlayTime < this.minPlayInterval) {
                return;
            }
        }
        
        this.lastPlayTime = currentTime;
        this.lastSFXType = type;
        
        // 直接播放，不使用requestAnimationFrame，最小化延迟
        switch (type) {
            case 'move':
                this.generateChiptuneSFX('move', 600, 0.08); // 舒适80ms
                break;
            case 'rotate':
                this.generateChiptuneSFX('rotate', 800, 0.1); // 舒适100ms
                break;
            case 'lock':
                this.generateChiptuneSFX('lock', 200, 0.15); // 舒适150ms
                break;
            case 'line':
                this.generateChiptuneSFX('line', 1000, 0.2); // 舒适200ms
                break;
            case 'levelup':
                this.generateChiptuneSFX('levelup', 500, 0.5); // 舒适500ms
                break;
            case 'gameover':
                this.generateChiptuneSFX('gameover', 300, 0.6); // 舒适600ms
                break;
        }
    }
    
    // 音量控制
    setMasterVolume(volume) {
        this.masterVolume = volume;
        if (this.masterGain) {
            this.masterGain.gain.value = volume;
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.musicGain) {
            this.musicGain.gain.value = volume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = volume;
        if (this.sfxGain) {
            this.sfxGain.gain.value = volume;
        }
    }
    
    // 开关控制
    toggleMusic(enabled) {
        this.musicEnabled = enabled;
        if (!enabled) {
            this.stopMusic();
        } else {
            // 重新开启音乐时，恢复最后播放的音乐
            this.generateBackgroundMusic(this.lastMusicType);
        }
    }
    
    toggleSFX(enabled) {
        this.sfxEnabled = enabled;
    }
    
    // 恢复音频上下文 (用户交互后)
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
