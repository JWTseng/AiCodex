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
        this.moveSFXInterval = 0.02;
        this.lastMoveTime = 0;
        
        // 初始化状态
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // 外部延迟探针：当音效调度开始时调用（用于测量输入→音频延迟）
        // 签名: onSFXStart?.({ type, audioTime, perfNow })
        this.onSFXStart = null;

        // 保活节点，防止音频图在空闲时被过度优化导致首帧延迟
        this._keepAliveOsc = null;
        this._keepAliveGain = null;
        
        // 用户交互检测
        this.userInteracted = false;
        this.setupUserInteractionDetection();
        
        // 线上版本音效配置 - 精细调优参数
        this.LEGACY_AUDIO_PROFILE = {
            move: { freq: 600, duration: 0.08, volume: 0.12, type: 'square', decay: 0.05, simple: true },
            rotate: { freq: 800, duration: 0.10, volume: 0.15, type: 'square', decay: 0.08, simple: true },
            lock: { freq: 200, duration: 0.15, volume: 0.25, type: 'sawtooth', decay: 0.15, simple: true },
            line: { freq: 1000, duration: 0.2, volume: 0.4, type: 'sine', complex: true },
            levelup: { freq: 500, duration: 0.5, volume: 0.5, type: 'sine', complex: true },
            gameover: { freq: 300, duration: 0.6, volume: 0.6, type: 'sine', complex: true }
        };

        // 使用更接近旧版的波形/包络以获得“更硬”的瞬态
        this.useLegacyWaveforms = true;
        
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
                // 仅提供低延迟提示，避免强制指定sampleRate导致潜在重采样或缓冲延迟
                const audioContextOptions = { latencyHint: 'interactive' };
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
    
    // 播放音效 - 低延迟即时播放（不在此处等待就绪）
    playSFX(type) {
        if (!this.sfxEnabled) return;

        try {
            // 若音频未初始化，尽量不阻塞地触发初始化；但本次仍直接尝试播放
            if (!this.isInitialized) {
                // 触发一次异步初始化，但不等待
                this.initializeAudio().catch(() => {});
            }

            // 确保有上下文与输出增益
            if (!this.audioContext || !this.sfxGain) return;

            // 如果被浏览器挂起，尝试立即恢复，并在恢复后紧接着播放，避免在suspended状态下丢帧
            const schedulePlay = () => {
                // 移动音效：节流，避免过密
                if (type === 'move') {
                    const currentTime = this.audioContext.currentTime || 0;
                    if (currentTime - this.lastMoveTime < this.moveSFXInterval) return;
                    this.lastMoveTime = currentTime;
                }
                // 触发外部探针
                try {
                    if (typeof this.onSFXStart === 'function') {
                        this.onSFXStart({ type, audioTime: this.audioContext.currentTime, perfNow: (performance?.now?.() || Date.now()) });
                    }
                } catch (_) {}
                // 直接生成音效
                this.generateChiptuneSFX(type);
            };

            if (this.audioContext.state === 'suspended') {
                try {
                    const p = this.audioContext.resume();
                    if (p && typeof p.then === 'function') {
                        p.then(() => schedulePlay()).catch(() => schedulePlay());
                    } else {
                        schedulePlay();
                    }
                } catch (_) {
                    schedulePlay();
                }
            } else {
                schedulePlay();
            }

        } catch (error) {
            console.error('GlobalAudioManager: 音效播放失败:', error);
        }
    }

    // 预热音频图（极低音量、极短时长，不可感知）
    primeAudio() {
        try {
            if (!this.audioContext || !this.masterGain) return;
            // 建立一个极低音量的保活节点，持续存在，避免首次播放慢热
            if (this._keepAliveOsc && this._keepAliveGain) return;
            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(40, this.audioContext.currentTime);
            g.gain.setValueAtTime(0.000002, this.audioContext.currentTime);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start();
            this._keepAliveOsc = osc;
            this._keepAliveGain = g;
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
    
    // 生成chiptune音效 - 对齐线上版本精细调优，并增强硬降/软降
    generateChiptuneSFX(type, frequency = 440, duration = 0.1) {
        if (!this.audioContext || !this.sfxEnabled) return;
        
        try {
            const startTime = this.audioContext.currentTime;

            // 特例：硬降（hardlock）— 更炸裂的低频“砸落”
            if (type === 'hardlock') {
                const ctx = this.audioContext;
                const now = startTime;

                // 局部总线+压缩器：推大而不削波
                const slamBus = ctx.createGain();
                slamBus.gain.setValueAtTime(1.0, now);
                const comp = ctx.createDynamicsCompressor();
                comp.threshold.setValueAtTime(-18, now);
                comp.knee.setValueAtTime(24, now);
                comp.ratio.setValueAtTime(4, now);
                comp.attack.setValueAtTime(0.003, now);
                comp.release.setValueAtTime(0.25, now);
                slamBus.connect(comp).connect(this.sfxGain);

                // 主低频：240→70Hz 下滑，lowshelf 强化
                const mainOsc = ctx.createOscillator();
                const mainGain = ctx.createGain();
                const lowShelf = ctx.createBiquadFilter();
                const mainLP = ctx.createBiquadFilter();
                lowShelf.type = 'lowshelf';
                lowShelf.frequency.setValueAtTime(120, now);
                lowShelf.gain.setValueAtTime(7.5, now);
                mainLP.type = 'lowpass';
                mainLP.frequency.setValueAtTime(700, now);
                mainOsc.type = 'sine';
                mainOsc.frequency.setValueAtTime(240, now);
                mainOsc.frequency.exponentialRampToValueAtTime(70, now + 0.21);
                const mainVol = Math.min(0.95, this.sfxVolume * 1.1) * 0.5;
                mainGain.gain.setValueAtTime(0, now);
                mainGain.gain.linearRampToValueAtTime(mainVol, now + 0.006);
                mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                mainOsc.connect(lowShelf).connect(mainLP).connect(mainGain).connect(slamBus);
                mainOsc.start(now);
                mainOsc.stop(now + 0.23);

                // 次低频：square 带谐波增强可听度
                const subOsc = ctx.createOscillator();
                const subGain = ctx.createGain();
                const subLP = ctx.createBiquadFilter();
                subLP.type = 'lowpass';
                subLP.frequency.setValueAtTime(600, now);
                subOsc.type = 'square';
                subOsc.frequency.setValueAtTime(110, now);
                subOsc.frequency.exponentialRampToValueAtTime(65, now + 0.17);
                const subVol = Math.min(0.60, this.sfxVolume * 0.85) * 0.5;
                subGain.gain.setValueAtTime(0, now);
                subGain.gain.linearRampToValueAtTime(subVol, now + 0.012);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                subOsc.connect(subLP).connect(subGain).connect(slamBus);
                subOsc.start(now);
                subOsc.stop(now + 0.19);

                // 冲击点击 + 第二击
                const click = (t, freq, peak) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'triangle';
                    o.frequency.setValueAtTime(freq, t);
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(peak, t + 0.002);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.037);
                    o.connect(g).connect(slamBus);
                    o.start(t);
                    o.stop(t + 0.04);
                };
                click(now, 650, Math.min(0.48, this.sfxVolume * 0.7) * 0.5);
                click(now + 0.015, 420, Math.min(0.32, this.sfxVolume * 0.5) * 0.5);

                // 高频“snap”噪声：2kHz 短促空气感，提升落地硬度
                {
                    const snapDur = 0.02;
                    const nbuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * snapDur), ctx.sampleRate);
                    const nch = nbuf.getChannelData(0);
                    for (let i = 0; i < nch.length; i++) nch[i] = (Math.random() * 2 - 1) * 0.7;
                    const snap = ctx.createBufferSource();
                    snap.buffer = nbuf;
                    const bp2 = ctx.createBiquadFilter();
                    bp2.type = 'bandpass';
                    bp2.frequency.setValueAtTime(2000, now);
                    bp2.Q.setValueAtTime(1.2, now);
                    const sg = ctx.createGain();
                    const sVol = Math.min(0.22, this.sfxVolume * 0.35);
                    sg.gain.setValueAtTime(0, now);
                    sg.gain.linearRampToValueAtTime(sVol, now + 0.0015);
                    sg.gain.exponentialRampToValueAtTime(0.001, now + snapDur);
                    snap.connect(bp2).connect(sg).connect(slamBus);
                    snap.start(now);
                    snap.stop(now + snapDur);
                }

                // 金属“ping”：高频方波极短音，增加“坚硬”感
                {
                    const ping = ctx.createOscillator();
                    const pg = ctx.createGain();
                    ping.type = 'square';
                    ping.frequency.setValueAtTime(2200, now);
                    const pVol = Math.min(0.20, this.sfxVolume * 0.3);
                    pg.gain.setValueAtTime(0, now);
                    pg.gain.linearRampToValueAtTime(pVol, now + 0.001);
                    pg.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
                    ping.connect(pg).connect(slamBus);
                    ping.start(now);
                    ping.stop(now + 0.025);
                }

                // 气压冲击：低频带通噪声
                const noiseDur = 0.06;
                const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDur), ctx.sampleRate);
                const ch = buf.getChannelData(0);
                for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.8;
                const noise = ctx.createBufferSource();
                noise.buffer = buf;
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.setValueAtTime(160, now);
                bp.Q.setValueAtTime(0.8, now);
                const ng = ctx.createGain();
                const nvol = Math.min(0.35, this.sfxVolume * 0.5) * 0.5;
                ng.gain.setValueAtTime(0, now);
                ng.gain.linearRampToValueAtTime(nvol, now + 0.003);
                ng.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
                noise.connect(bp).connect(ng).connect(slamBus);
                noise.start(now);
                noise.stop(now + noiseDur);

                return;
            }

            // 特例：软降（softlock）— 更轻、更短
            if (type === 'softlock') {
                const ctx = this.audioContext;
                const now = startTime;
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(220, now);
                o.frequency.exponentialRampToValueAtTime(140, now + 0.12);
                const vol = Math.min(0.28, this.sfxVolume * 0.35);
                g.gain.setValueAtTime(0, now);
                g.gain.linearRampToValueAtTime(vol, now + 0.006);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
                o.connect(g).connect(this.sfxGain);
                o.start(now);
                o.stop(now + 0.18);
                return;
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 为落地三类音效加入低通以增强低频厚重感
            let filterNode = null;
            const useBassFilter = (type === 'lock' || type === 'softlock' || type === 'hardlock');
            if (useBassFilter) {
                filterNode = this.audioContext.createBiquadFilter();
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(1200, this.audioContext.currentTime);
                oscillator.connect(filterNode);
                filterNode.connect(gainNode);
            } else {
                oscillator.connect(gainNode);
            }
            
            gainNode.connect(this.sfxGain);
            
            // startTime 在上方定义
            
            // 使用线上版本精细调优的音效参数
            const legacyProfile = this.LEGACY_AUDIO_PROFILE[type];
            if (legacyProfile) {
                // 应用线上版本的精确参数
                oscillator.frequency.setValueAtTime(legacyProfile.freq, startTime);
                oscillator.type = legacyProfile.type;
                
                if (legacyProfile.simple) {
                    // 简单音效：快速攻击，精确衰减（更靠近旧实现的硬瞬态）
                    const volume = legacyProfile.volume * this.sfxVolume;
                    gainNode.gain.setValueAtTime(0, startTime);
                    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.0008);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + legacyProfile.decay);

                    oscillator.start(startTime);
                    oscillator.stop(startTime + legacyProfile.duration);
                } else if (legacyProfile.complex) {
                    // 复杂音效：线上版本的频率变化和音量包络
                    const duration = legacyProfile.duration;
                    const volume = legacyProfile.volume * this.sfxVolume;
                    
                    // 频率变化（线上版本）
                    switch (type) {
                        case 'line':
                            // 消行音效 - 1000Hz→1500Hz正弦波，更自然的上升
                            oscillator.frequency.setValueAtTime(1000, startTime);
                            oscillator.frequency.exponentialRampToValueAtTime(1500, startTime + duration * 0.6);
                            break;
                            
                        case 'levelup':
                            // 升级音效 - 500Hz→1200Hz正弦波，更舒适的上升音阶
                            oscillator.frequency.setValueAtTime(500, startTime);
                            oscillator.frequency.exponentialRampToValueAtTime(800, startTime + duration * 0.3);
                            oscillator.frequency.exponentialRampToValueAtTime(1200, startTime + duration);
                            break;
                            
                        case 'gameover':
                            // 游戏结束音效 - 300Hz→80Hz正弦波，更自然的下降
                            oscillator.frequency.setValueAtTime(300, startTime);
                            oscillator.frequency.exponentialRampToValueAtTime(200, startTime + duration * 0.4);
                            oscillator.frequency.exponentialRampToValueAtTime(80, startTime + duration);
                            break;
                    }
                    
                    // 音量包络（线上版本）
                    switch (type) {
                        case 'line':
                            // 消行音效 - 舒适音量包络 (200ms)
                            gainNode.gain.setValueAtTime(volume, startTime);
                            gainNode.gain.linearRampToValueAtTime(volume * 0.875, startTime + duration * 0.4);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                            break;
                            
                        case 'levelup':
                            // 升级音效 - 舒适音量包络 (500ms)
                            gainNode.gain.setValueAtTime(volume, startTime);
                            gainNode.gain.linearRampToValueAtTime(volume * 0.9, startTime + duration * 0.4);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                            break;
                            
                        case 'gameover':
                            // 游戏结束音效 - 舒适音量包络 (600ms)
                            gainNode.gain.setValueAtTime(volume, startTime);
                            gainNode.gain.linearRampToValueAtTime(volume * 0.833, startTime + duration * 0.3);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                            break;
                    }
                    
                    oscillator.start(startTime);
                    oscillator.stop(startTime + duration);
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
