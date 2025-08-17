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
        
        // 初始化音频系统
        this.initAudio();
    }
    
    initAudio() {
        try {
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
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
            
            console.log('音频系统初始化成功');
        } catch (error) {
            console.error('音频系统初始化失败:', error);
        }
    }
    
    // 生成chiptune音效
    generateChiptuneSFX(type, frequency = 440, duration = 0.1) {
        if (!this.audioContext || !this.sfxEnabled) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            // 根据音效类型设置参数
            switch (type) {
                case 'move':
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.8, this.audioContext.currentTime + duration);
                    oscillator.type = 'square';
                    break;
                    
                case 'rotate':
                    oscillator.frequency.setValueAtTime(frequency * 1.2, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(frequency, this.audioContext.currentTime + duration);
                    oscillator.type = 'square';
                    break;
                    
                case 'lock':
                    oscillator.frequency.setValueAtTime(frequency * 0.5, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.3, this.audioContext.currentTime + duration);
                    oscillator.type = 'sawtooth';
                    break;
                    
                case 'line':
                    oscillator.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(frequency * 4, this.audioContext.currentTime + duration);
                    oscillator.type = 'square';
                    break;
                    
                case 'levelup':
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, this.audioContext.currentTime + duration);
                    oscillator.type = 'triangle';
                    break;
                    
                case 'gameover':
                    oscillator.frequency.setValueAtTime(frequency * 0.3, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.1, this.audioContext.currentTime + duration);
                    oscillator.type = 'sawtooth';
                    break;
            }
            
            // 设置音量包络
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
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
    
    // 播放音效
    playSFX(type) {
        switch (type) {
            case 'move':
                this.generateChiptuneSFX('move', 800, 0.05);
                break;
            case 'rotate':
                this.generateChiptuneSFX('rotate', 1000, 0.08);
                break;
            case 'lock':
                this.generateChiptuneSFX('lock', 400, 0.15);
                break;
            case 'line':
                this.generateChiptuneSFX('line', 1200, 0.2);
                break;
            case 'levelup':
                this.generateChiptuneSFX('levelup', 600, 0.3);
                break;
            case 'gameover':
                this.generateChiptuneSFX('gameover', 200, 0.5);
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
