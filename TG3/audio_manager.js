/**
 * 全局音频管理器
 * 解决声音系统反复失效的问题
 * 独立于游戏逻辑，确保UI调整时不影响音频
 */

class GlobalAudioManager {
    constructor() {
        // 单例模式
        if (GlobalAudioManager.instance) {
            return GlobalAudioManager.instance;
        }
        GlobalAudioManager.instance = this;
        
        // 音频状态
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        // 音频设置
        this.musicEnabled = false; // 默认关闭音乐
        this.sfxEnabled = true;
        this.masterVolume = 0.3;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.8;
        
        // 当前播放的音乐
        this.currentMusic = null;
        this.lastMusicType = 'music1';
        this.musicSource = null;
        
        // 音效缓存
        this.sfxCache = {};
        
        // 音频优化设置
        this.audioLatency = 0;
        this.lastPlayTime = 0;
        this.minPlayInterval = 0.005;
        this.lastSFXType = '';
        this.moveSFXInterval = 0.03;
        this.lastMoveTime = 0;
        
        // 初始化状态
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // 用户交互检测
        this.userInteracted = false;
        this.setupUserInteractionDetection();
        
        // 线上版本音效配置 - 精细调优参数（严格对齐 af9e9a7）
        this.LEGACY_AUDIO_PROFILE = {
            // 简单音效：固定频率 + 类型 + 时长 + 初始音量
            move:    { freq: 600, duration: 0.08, volume: 0.20, type: 'sine',     simple: true },
            rotate:  { freq: 800, duration: 0.10, volume: 0.25, type: 'triangle', simple: true },
            lock:    { freq: 200, duration: 0.15, volume: 0.30, type: 'sine',     simple: true },
            // 复杂音效：带频率变化与特定包络
            line:    { duration: 0.20, volume: 0.40, type: 'sine',    complex: true },
            levelup: { duration: 0.50, volume: 0.50, type: 'sine',    complex: true },
            gameover:{ duration: 0.60, volume: 0.60, type: 'sine',    complex: true }
        };
        
        console.log('GlobalAudioManager: 全局音频管理器已创建');
    }
    
    // 设置用户交互检测 - 优化为线上版本的立即初始化
    setupUserInteractionDetection() {
        const interactionEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        const handleUserInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                console.log('GlobalAudioManager: 检测到用户交互，立即初始化音频（对齐线上版本）');
                
                // 线上版本策略：立即初始化，不等待
                this.initializeAudio()
                    .then(() => {
                        this.primeAudio();
                        console.log('GlobalAudioManager: 音频系统已预热，准备就绪');
                    })
                    .catch(error => {
                        console.warn('GlobalAudioManager: 初始化失败，将在播放时重试:', error);
                    });
                
                // 移除事件监听器
                interactionEvents.forEach(event => {
                    document.removeEventListener(event, handleUserInteraction, true);
                });
            }
        };
        
        // 添加事件监听器
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleUserInteraction, { capture: true, once: true });
        });
    }
    
    // 延迟初始化音频系统
    async initializeAudio() {
        if (this.isInitialized) {
            return Promise.resolve();
        }
        
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = new Promise(async (resolve, reject) => {
            try {
                // 等待用户交互
                if (!this.userInteracted) {
                    console.log('GlobalAudioManager: 等待用户交互...');
                    await this.waitForUserInteraction();
                }
                
                // 创建音频上下文 - Safari兼容性处理
                const audioContextOptions = {
                    latencyHint: 'interactive'
                };
                
                // Safari兼容性：不设置sampleRate和bufferSize
                if (!navigator.userAgent.includes('Safari') || navigator.userAgent.includes('Chrome')) {
                    audioContextOptions.sampleRate = 48000;
                }
                
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)(audioContextOptions);
                
                // 创建音频节点
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                this.masterGain.gain.value = this.masterVolume;
                
                this.musicGain = this.audioContext.createGain();
                this.musicGain.connect(this.masterGain);
                this.musicGain.gain.value = this.musicVolume;
                
                this.sfxGain = this.audioContext.createGain();
                this.sfxGain.connect(this.masterGain);
                this.sfxGain.gain.value = this.sfxVolume;
                
                // 监听音频上下文状态变化
                this.audioContext.addEventListener('statechange', () => {
                    console.log('GlobalAudioManager: AudioContext状态变化:', this.audioContext.state);
                    if (this.audioContext.state === 'suspended') {
                        this.autoResume();
                    }
                });
                
                this.isInitialized = true;
                console.log('GlobalAudioManager: 音频系统初始化成功');
                // 初始化后立即做一次预热，避免首次播放抖动
                this.primeAudio();
                resolve();
                
            } catch (error) {
                console.error('GlobalAudioManager: 音频系统初始化失败:', error);
                reject(error);
            }
        });
        
        return this.initializationPromise;
    }
    
    // 等待用户交互
    waitForUserInteraction() {
        return new Promise((resolve) => {
            if (this.userInteracted) {
                resolve();
                return;
            }
            
            const checkInteraction = () => {
                if (this.userInteracted) {
                    resolve();
                } else {
                    setTimeout(checkInteraction, 100);
                }
            };
            
            checkInteraction();
        });
    }
    
    // 自动恢复音频上下文
    async autoResume() {
        if (!this.audioContext || this.audioContext.state !== 'suspended') {
            return;
        }
        
        try {
            await this.audioContext.resume();
            console.log('GlobalAudioManager: AudioContext已自动恢复');
        } catch (error) {
            console.error('GlobalAudioManager: AudioContext恢复失败:', error);
        }
    }
    
    // 确保音频系统可用
    async ensureAudioReady() {
        if (!this.isInitialized) {
            await this.initializeAudio();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.autoResume();
        }
        
        // Safari特殊处理：如果AudioContext仍然不可用，尝试重新创建
        if (!this.audioContext || this.audioContext.state !== 'running') {
            if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
                console.log('GlobalAudioManager: Safari AudioContext不可用，尝试重新创建');
                this.isInitialized = false;
                this.initializationPromise = null;
                await this.initializeAudio();
            }
        }
        
        return this.audioContext && this.audioContext.state === 'running';
    }
    
    // 播放音效 - 线上版本的直接播放方式（无 await）
    playSFX(type) {
        if (!this.sfxEnabled) return;
        if (!this.audioContext) return;
        
        try {
            // 若被暂停，尝试恢复（非阻塞）
            if (this.audioContext.state === 'suspended') {
                try { this.audioContext.resume(); } catch (_) {}
            }
            
            const currentTime = this.audioContext.currentTime || 0;
            
            // 移动音效节流（线上逻辑）
            if (type === 'move') {
                if (currentTime - this.lastMoveTime < this.moveSFXInterval) {
                    return;
                }
                this.lastMoveTime = currentTime;
            } else {
                // 其他音效最小间隔（线上逻辑）
                if (type === this.lastSFXType && currentTime - this.lastPlayTime < this.minPlayInterval) {
                    return;
                }
            }
            
            this.lastPlayTime = currentTime;
            this.lastSFXType = type;
            
            // 直接生成音效
            this.generateChiptuneSFX(type);
        } catch (error) {
            console.error('GlobalAudioManager: 音效播放失败:', error);
        }
    }

    // 预热音频图（极低音量、极短时长，不可感知）
    primeAudio() {
        try {
            if (!this.audioContext || !this.masterGain) return;
            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
            g.gain.setValueAtTime(0.00001, this.audioContext.currentTime);
            osc.connect(g);
            g.connect(this.masterGain);
            const t0 = this.audioContext.currentTime;
            osc.start(t0);
            osc.stop(t0 + 0.03);
        } catch (_) {
            // 忽略预热失败
        }
    }

    // 提供给游戏开局前的显式预加载入口
    async preloadForGameStart() {
        try {
            await this.ensureAudioReady();
            this.primeAudio();
        } catch (_) {}
    }
    
    // 播放音乐
    async playMusic(type = 'music1') {
        if (!this.musicEnabled) return;
        
        const audioReady = await this.ensureAudioReady();
        if (!audioReady) {
            console.warn('GlobalAudioManager: 音频系统不可用，跳过音乐播放');
            return;
        }
        
        try {
            this.generateBackgroundMusic(type);
        } catch (error) {
            console.error('GlobalAudioManager: 音乐播放失败:', error);
        }
    }
    
    // 停止音乐
    stopMusic() {
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource = null;
        }
        this.currentMusic = null;
    }
    
    // 暂停音乐
    pauseMusic() {
        if (this.musicSource && this.audioContext) {
            this.audioContext.suspend();
        }
    }
    
    // 恢复音乐
    resumeMusic() {
        if (this.audioContext) {
            this.audioContext.resume();
        }
    }
    
    // 切换音乐开关
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (this.musicEnabled) {
            this.playMusic(this.lastMusicType);
        } else {
            this.stopMusic();
        }
        return this.musicEnabled;
    }
    
    // 切换音效开关
    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    }
    
    // 设置音量
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }
    
    // 生成chiptune音效 - 对齐线上版本精细调优，并增强硬降/软降落地手感
    generateChiptuneSFX(type, frequency = 440, duration = 0.1) {
        if (!this.audioContext || !this.sfxEnabled) return;
        
        try {
            const startTime = this.audioContext.currentTime;

            // 特例：硬降（hardlock）——成倍加强的厚重“砸落”
            if (type === 'hardlock') {
                const ctx = this.audioContext;
                const now = startTime;

                // 局部总线与压缩器：允许整体推大而不削波
                const slamBus = ctx.createGain();
                slamBus.gain.setValueAtTime(1.0, now);
                const comp = ctx.createDynamicsCompressor();
                comp.threshold.setValueAtTime(-18, now);
                comp.knee.setValueAtTime(24, now);
                comp.ratio.setValueAtTime(4, now);
                comp.attack.setValueAtTime(0.003, now);
                comp.release.setValueAtTime(0.25, now);
                slamBus.connect(comp).connect(this.sfxGain);

                // 主低频：更低、更长 + 低搁架强化
                const mainOsc = ctx.createOscillator();
                const mainGain = ctx.createGain();
                const lowShelf = ctx.createBiquadFilter();
                const mainLP = ctx.createBiquadFilter();
                lowShelf.type = 'lowshelf';
                lowShelf.frequency.setValueAtTime(120, now);
                lowShelf.gain.setValueAtTime(7.5, now); // 更强低频（减半）
                mainLP.type = 'lowpass';
                mainLP.frequency.setValueAtTime(700, now);
                mainLP.Q && mainLP.Q.setValueAtTime(0.7, now);
                mainOsc.type = 'sine';
                mainOsc.frequency.setValueAtTime(240, now);
                mainOsc.frequency.exponentialRampToValueAtTime(70, now + 0.42);
                const mainVol = Math.min(0.95, this.sfxVolume * 1.1) * 0.5;
                mainGain.gain.setValueAtTime(0, now);
                mainGain.gain.linearRampToValueAtTime(mainVol, now + 0.006);
                mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
                mainOsc.connect(lowShelf).connect(mainLP).connect(mainGain).connect(slamBus);
                mainOsc.start(now);
                mainOsc.stop(now + 0.46);

                // 次低频层（更可听）：方波带谐波，增强在普通设备上的可感知度
                const subOsc = ctx.createOscillator();
                const subGain = ctx.createGain();
                const subLP = ctx.createBiquadFilter();
                subLP.type = 'lowpass';
                subLP.frequency.setValueAtTime(600, now);
                subOsc.type = 'square';
                subOsc.frequency.setValueAtTime(110, now);
                subOsc.frequency.exponentialRampToValueAtTime(65, now + 0.34);
                const subVol = Math.min(0.60, this.sfxVolume * 0.85) * 0.5;
                subGain.gain.setValueAtTime(0, now);
                subGain.gain.linearRampToValueAtTime(subVol, now + 0.012);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
                subOsc.connect(subLP).connect(subGain).connect(slamBus);
                subOsc.start(now);
                subOsc.stop(now + 0.38);

                // 冲击瞬音：短三角波点击
                const clickOsc = ctx.createOscillator();
                const clickGain = ctx.createGain();
                clickOsc.type = 'triangle';
                clickOsc.frequency.setValueAtTime(650, now);
                clickGain.gain.setValueAtTime(0, now);
                clickGain.gain.linearRampToValueAtTime(Math.min(0.48, this.sfxVolume * 0.7) * 0.5, now + 0.002);
                clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
                clickOsc.connect(clickGain).connect(slamBus);
                clickOsc.start(now);
                clickOsc.stop(now + 0.08);

                // 第二击：30ms 后更低频的短击，增强“炸裂”层次
                const click2Osc = ctx.createOscillator();
                const click2Gain = ctx.createGain();
                const t2 = now + 0.03;
                click2Osc.type = 'triangle';
                click2Osc.frequency.setValueAtTime(420, t2);
                click2Gain.gain.setValueAtTime(0, t2);
                click2Gain.gain.linearRampToValueAtTime(Math.min(0.32, this.sfxVolume * 0.5) * 0.5, t2 + 0.002);
                click2Gain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.07);
                click2Osc.connect(click2Gain).connect(slamBus);
                click2Osc.start(t2);
                click2Osc.stop(t2 + 0.08);

                // 气压冲击层：更强的低频带通噪声
                const noiseDur = 0.12;
                const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
                const data = noiseBuf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * 0.8;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuf;
                const noiseBP = ctx.createBiquadFilter();
                noiseBP.type = 'bandpass';
                noiseBP.frequency.setValueAtTime(160, now);
                noiseBP.Q.setValueAtTime(0.8, now);
                const noiseGain = ctx.createGain();
                const noiseVol = Math.min(0.35, this.sfxVolume * 0.5) * 0.5;
                noiseGain.gain.setValueAtTime(0, now);
                noiseGain.gain.linearRampToValueAtTime(noiseVol, now + 0.003);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
                noise.connect(noiseBP).connect(noiseGain).connect(slamBus);
                noise.start(now);
                noise.stop(now + noiseDur);

                return;
            }

            // 特例：软降落地（softlock）——更轻、更短
            if (type === 'softlock') {
                const bassOsc = this.audioContext.createOscillator();
                const bassGain = this.audioContext.createGain();
                bassOsc.type = 'sine';
                bassOsc.frequency.setValueAtTime(220, startTime);
                bassOsc.frequency.exponentialRampToValueAtTime(140, startTime + 0.12);
                const vol = Math.min(0.28, this.sfxVolume * 0.35);
                bassGain.gain.setValueAtTime(0, startTime);
                bassGain.gain.linearRampToValueAtTime(vol, startTime + 0.006);
                bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);
                bassOsc.connect(bassGain).connect(this.sfxGain);
                bassOsc.start(startTime);
                bassOsc.stop(startTime + 0.18);
                return;
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 线上版本无低通滤波，直接连接
            oscillator.connect(gainNode);
            
            gainNode.connect(this.sfxGain);
            
            // startTime 已在上方定义
            
            // 使用线上版本精细调优的音效参数
            const legacyProfile = this.LEGACY_AUDIO_PROFILE[type];
            if (legacyProfile) {
                // 应用线上版本的精确参数
                oscillator.type = legacyProfile.type;
                if (legacyProfile.simple) {
                    // 简单音效（move/rotate/lock）：固定频率 + 舒适包络（精确对齐线上）
                    oscillator.frequency.setValueAtTime(legacyProfile.freq, startTime);
                    const volume = legacyProfile.volume * this.sfxVolume;
                    gainNode.gain.setValueAtTime(volume, startTime);
                    switch (type) {
                        case 'move':
                            // 0.2 → 0.15 @ 30%
                            gainNode.gain.linearRampToValueAtTime(volume * 0.75, startTime + legacyProfile.duration * 0.3);
                            break;
                        case 'rotate':
                            // 0.25 → 0.20 @ 40%
                            gainNode.gain.linearRampToValueAtTime(volume * 0.8, startTime + legacyProfile.duration * 0.4);
                            break;
                        case 'lock':
                            // 0.30 → 0.25 @ 50%
                            gainNode.gain.linearRampToValueAtTime(volume * (0.25/0.30), startTime + legacyProfile.duration * 0.5);
                            break;
                    }
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + legacyProfile.duration);
                    oscillator.start(startTime);
                    oscillator.stop(startTime + legacyProfile.duration);
                } else if (legacyProfile.complex) {
                    // 复杂音效（line/levelup/gameover）：频率滑变 + 舒适包络
                    const d = legacyProfile.duration;
                    const volume = legacyProfile.volume * this.sfxVolume;
                    switch (type) {
                        case 'line':
                            oscillator.frequency.setValueAtTime(1000, startTime);
                            oscillator.frequency.exponentialRampToValueAtTime(1500, startTime + d * 0.6);
                            break;
                        case 'levelup':
                            oscillator.frequency.setValueAtTime(500, startTime);
                            oscillator.frequency.exponentialRampToValueAtTime(800, startTime + d * 0.3);
                            oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + d);
                            break;
                        case 'gameover':
                            oscillator.frequency.setValueAtTime(300, startTime);
                            oscillator.frequency.exponentialRampToValueAtTime(200, startTime + d * 0.4);
                            oscillator.frequency.exponentialRampToValueAtTime(80, startTime + d);
                            break;
                    }
                    // 包络严格对齐线上
                    switch (type) {
                        case 'line':
                            gainNode.gain.setValueAtTime(volume, startTime);
                            gainNode.gain.linearRampToValueAtTime(volume * 0.875, startTime + d * 0.4);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + d);
                            break;
                        case 'levelup':
                            gainNode.gain.setValueAtTime(volume, startTime);
                            gainNode.gain.linearRampToValueAtTime(volume * 0.9, startTime + d * 0.4);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + d);
                            break;
                        case 'gameover':
                            gainNode.gain.setValueAtTime(volume, startTime);
                            gainNode.gain.linearRampToValueAtTime(volume * 0.833, startTime + d * 0.3);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + d);
                            break;
                    }
                    oscillator.start(startTime);
                    oscillator.stop(startTime + d);
                }
            } else {
                // 保留原有音效（drop, tetris等）
                switch (type) {
                    case 'drop':
                        oscillator.frequency.setValueAtTime(400, startTime);
                        gainNode.gain.setValueAtTime(0.2, startTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                        break;
                        
                    case 'tetris':
                        oscillator.frequency.setValueAtTime(1200, startTime);
                        gainNode.gain.setValueAtTime(0.4, startTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                        break;
                        
                    default:
                        oscillator.frequency.setValueAtTime(frequency, startTime);
                        gainNode.gain.setValueAtTime(0.2, startTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                }
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            }
            
        } catch (error) {
            console.error('GlobalAudioManager: 音效生成失败:', error);
        }
    }
    
    // 生成背景音乐
    generateBackgroundMusic(type = 'music1') {
        if (!this.audioContext || !this.musicEnabled) return;
        
        try {
            // 停止当前音乐
            this.stopMusic();
            
            this.currentMusic = type;
            this.lastMusicType = type;
            
            // 简单的背景音乐模式
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            const startTime = this.audioContext.currentTime;
            
            // 音乐参数
            oscillator.frequency.setValueAtTime(440, startTime);
            gainNode.gain.setValueAtTime(0.1, startTime);
            
            oscillator.start(startTime);
            
            this.musicSource = oscillator;
            
        } catch (error) {
            console.error('GlobalAudioManager: 音乐生成失败:', error);
        }
    }
    
    // 获取音频状态
    getAudioStatus() {
        return {
            isInitialized: this.isInitialized,
            userInteracted: this.userInteracted,
            audioContextState: this.audioContext ? this.audioContext.state : 'not_created',
            musicEnabled: this.musicEnabled,
            sfxEnabled: this.sfxEnabled,
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume
        };
    }
    
    // 重置音频系统
    reset() {
        this.stopMusic();
        this.isInitialized = false;
        this.initializationPromise = null;
        console.log('GlobalAudioManager: 音频系统已重置');
    }
}

// 创建全局实例
window.globalAudioManager = new GlobalAudioManager();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalAudioManager;
}
