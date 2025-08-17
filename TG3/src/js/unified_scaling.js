/**
 * 统一缩放管理模块
 * 实现游戏窗口和世界排行榜窗口的统一缩放和居中
 */

class UnifiedScaling {
    constructor() {
        this.minScale = 0.1; // 最小缩放比例
        this.maxScale = 1.0; // 最大不放大
        this.padding = 0;    // 不预留边距
        this.init();
    }
    
    init() {
        // 禁用原有的游戏容器缩放系统
        this.disableOriginalScaling();
        // iPad自动缩放到80%
        if (this.isIPadDevice()) {
            try { this.setScale(0.8); } catch (_) {}
        }
        this.bindEvents();
        this.updateScale();
    }
    
    disableOriginalScaling() {
        // 移除原有的缩放包装器
        const wrapper = document.querySelector('.scale-wrapper');
        if (wrapper) {
            const container = wrapper.querySelector('.game-container');
            if (container) {
                wrapper.parentNode.insertBefore(container, wrapper);
                wrapper.remove();
            }
        }
        
        // 重置游戏容器的transform，确保不干扰主容器缩放
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.transform = 'none';
            gameContainer.style.transformOrigin = 'initial';
        }
        
        // 重置排行榜容器的transform
        const leaderboardContainer = document.querySelector('.leaderboard-container');
        if (leaderboardContainer) {
            leaderboardContainer.style.transform = 'none';
            leaderboardContainer.style.transformOrigin = 'initial';
        }
        
        // 清理可能残留的 transform（子容器不可独立缩放）
        
        // 强制应用PC专用布局
        this.forcePCLayout();
    }
    
    forcePCLayout() {
        // 强制保持水平布局，防止响应式媒体查询干扰
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.style.flexDirection = 'row';
            mainContainer.style.alignItems = 'flex-start';
            mainContainer.style.justifyContent = 'center';
            mainContainer.style.gap = '20px';
        }
        
        // 强制保持排行榜容器尺寸
        const leaderboardContainer = document.querySelector('.leaderboard-container');
        if (leaderboardContainer) {
            leaderboardContainer.style.width = '400px';
            leaderboardContainer.style.maxWidth = '400px';
            leaderboardContainer.style.order = 'unset';
            leaderboardContainer.style.flexShrink = '0';
        }
        
        // 强制保持游戏容器布局
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.style.order = 'unset';
            gameContainer.style.width = 'auto';
            gameContainer.style.maxWidth = 'none';
        }
        
        // 强制保持游戏主区域水平布局
        const gameMain = document.querySelector('.game-main');
        if (gameMain) {
            gameMain.style.flexDirection = 'row';
            gameMain.style.gap = '25px';
        }
        
        // 强制保持游戏侧边栏尺寸
        const gameSidebar = document.querySelector('.game-sidebar');
        if (gameSidebar) {
            gameSidebar.style.width = '280px';
            gameSidebar.style.flexShrink = '0';
        }
    }
    
    bindEvents() {
        // 监听窗口大小改变
        window.addEventListener('resize', () => {
            this.updateScale();
        });
        
        // 页面加载完成后更新缩放
        window.addEventListener('load', () => {
            this.updateScale();
        });
        
        // DOM内容加载完成后更新缩放
        document.addEventListener('DOMContentLoaded', () => {
            this.updateScale();
        });
    }
    
    updateScale() {
        const uiRoot = document.querySelector('.ui-root');
        const mainContainer = document.querySelector('.main-container');
        if (!uiRoot || !mainContainer) {
            console.warn('UnifiedScaling: .ui-root or .main-container not found');
            return;
        }
        
        // 获取主容器的原始尺寸
        const containerWidth = mainContainer.scrollWidth;
        const containerHeight = mainContainer.scrollHeight;
        
        // 获取浏览器窗口尺寸
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 计算可用空间（减去边距）
        const availableWidth = windowWidth - (this.padding * 2);
        const availableHeight = windowHeight - (this.padding * 2);
        
        // 计算缩放比例（基于宽度和高度的最小值）
        const scaleX = availableWidth / containerWidth;
        const scaleY = availableHeight / containerHeight;
        const scale = Math.min(scaleX, scaleY);
        
        // 限制缩放范围
        let finalScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
        // iPad固定80%优先
        if (this.isIPadDevice()) {
            finalScale = Math.min(finalScale, 0.8);
        }
        
        // 应用缩放到 UI 根容器
        document.documentElement.style.setProperty('--game-scale', finalScale);
        uiRoot.style.transform = `scale(${finalScale})`;
        uiRoot.style.transformOrigin = 'center center';
        
        // 输出调试信息
        console.log('UnifiedScaling:', {
            containerSize: { width: containerWidth, height: containerHeight },
            windowSize: { width: windowWidth, height: windowHeight },
            availableSize: { width: availableWidth, height: availableHeight },
            scale: { x: scaleX, y: scaleY, final: finalScale }
        });
        
        if (window.GameLogger) {
            window.GameLogger.debug('UnifiedScaling', {
                containerSize: { width: containerWidth, height: containerHeight },
                windowSize: { width: windowWidth, height: windowHeight },
                availableSize: { width: availableWidth, height: availableHeight },
                scale: { x: scaleX, y: scaleY, final: finalScale }
            });
        }
    }
    
    // 获取当前缩放比例
    getCurrentScale() {
        return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale')) || 1;
    }
    
    // 手动设置缩放比例
    setScale(scale) {
        const finalScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
        document.documentElement.style.setProperty('--game-scale', finalScale);
    }

    // 设备检测：iPad（包含桌面Safari的iPadOS UA特例）
    isIPadDevice() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isIPad = /iPad/.test(ua);
        // iPadOS 13+ 桌面Safari会把平台标为Mac，但支持触摸
        const isIPadOS13Plus = !isIPad && navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
        return isIPad || isIPadOS13Plus || (isIOS && /iPad/.test(ua));
    }
    
    // 重置缩放
    resetScale() {
        this.updateScale();
    }
    
    // 获取缩放信息
    getScaleInfo() {
        const mainContainer = document.querySelector('.main-container');
        if (!mainContainer) return null;
        
        return {
            currentScale: this.getCurrentScale(),
            containerSize: {
                width: mainContainer.scrollWidth,
                height: mainContainer.scrollHeight
            },
            windowSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            scaleLimits: {
                min: this.minScale,
                max: this.maxScale
            }
        };
    }
}

// 页面加载完成后初始化统一缩放
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保原有缩放系统先运行
    setTimeout(() => {
        window.unifiedScaling = new UnifiedScaling();
    }, 100);
});

// 如果DOM已经加载完成，立即初始化
if (document.readyState !== 'loading') {
    setTimeout(() => {
        window.unifiedScaling = new UnifiedScaling();
    }, 100);
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedScaling;
}
