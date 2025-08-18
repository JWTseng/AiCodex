import { CURRENT_VERSION } from '@/config/version';
import { getVersionModal } from '@/components/version-modal';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VersionManager');

export class VersionManager {
  private static readonly STORAGE_KEY = 'tetris_last_version';
  private static readonly FIRST_VISIT_KEY = 'tetris_first_visit';
  
  constructor() {
    this.checkForUpdates();
    this.bindKeyboardShortcuts();
  }

  /**
   * 检查是否有新版本更新
   */
  private checkForUpdates(): void {
    const lastSeenVersion = localStorage.getItem(VersionManager.STORAGE_KEY);
    const isFirstVisit = !localStorage.getItem(VersionManager.FIRST_VISIT_KEY);
    
    logger.debug('Version check:', { 
      current: CURRENT_VERSION.version, 
      lastSeen: lastSeenVersion,
      isFirstVisit 
    });

    // 首次访问，显示欢迎信息
    if (isFirstVisit) {
      this.showWelcomeMessage();
      localStorage.setItem(VersionManager.FIRST_VISIT_KEY, 'true');
      localStorage.setItem(VersionManager.STORAGE_KEY, CURRENT_VERSION.version);
      return;
    }

    // 版本更新检查
    if (lastSeenVersion !== CURRENT_VERSION.version) {
      this.showUpdateNotification(lastSeenVersion);
      localStorage.setItem(VersionManager.STORAGE_KEY, CURRENT_VERSION.version);
    }
  }

  /**
   * 显示首次访问欢迎信息
   */
  private showWelcomeMessage(): void {
    // 延迟显示，让游戏界面先加载
    setTimeout(() => {
      if (this.shouldShowAutoModal()) {
        const modal = getVersionModal();
        modal.show();
        
        // 显示欢迎toast
        this.showToast('🎮 欢迎来到 Tetris World！点击查看最新功能', 'welcome');
        
        logger.info('First visit welcome shown');
      }
    }, 2000);
  }

  /**
   * 显示更新通知
   */
  private showUpdateNotification(previousVersion: string | null): void {
    const message = previousVersion 
      ? `🚀 已更新至 v${CURRENT_VERSION.version}！点击查看新功能`
      : `🎉 欢迎使用 Tetris World v${CURRENT_VERSION.version}`;
    
    this.showToast(message, 'update');
    
    // 如果是重大版本更新，自动显示更新日志
    if (this.isMajorUpdate(previousVersion)) {
      setTimeout(() => {
        if (this.shouldShowAutoModal()) {
          getVersionModal().show();
        }
      }, 3000);
    }
    
    logger.info('Update notification shown', { 
      from: previousVersion, 
      to: CURRENT_VERSION.version 
    });
  }

  /**
   * 判断是否为重大版本更新
   */
  private isMajorUpdate(previousVersion: string | null): boolean {
    if (!previousVersion) return true;
    
    const [prevMajor] = previousVersion.split('.').map(Number);
    const [currMajor] = CURRENT_VERSION.version.split('.').map(Number);
    
    return currMajor > prevMajor;
  }

  /**
   * 显示Toast通知
   */
  private showToast(message: string, type: 'welcome' | 'update' | 'info' = 'info'): void {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `version-toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-action" onclick="window.showVersion?.()">查看详情</button>
        <button class="toast-close">×</button>
      </div>
    `;

    // 添加样式
    this.injectToastStyles();
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 绑定事件
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => this.removeToast(toast));
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => this.removeToast(toast), 8000);
  }

  /**
   * 移除Toast
   */
  private removeToast(toast: HTMLElement): void {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * 绑定键盘快捷键
   */
  private bindKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + V 显示版本信息
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        getVersionModal().show();
        logger.debug('Version modal opened via keyboard shortcut');
      }
      
      // F1 快速帮助（包含版本信息）
      if (e.key === 'F1') {
        e.preventDefault();
        getVersionModal().show();
        logger.debug('Version modal opened via F1 key');
      }
    });
  }

  /**
   * 检查是否应该自动显示模态框
   */
  private shouldShowAutoModal(): boolean {
    // 如果用户在玩游戏，不要打断
    const gameState = (window as any).gameState;
    if (gameState === 'playing') {
      return false;
    }
    
    // 检查是否有其他模态框显示
    const existingModals = document.querySelectorAll('.version-modal-overlay[style*="flex"]');
    if (existingModals.length > 0) {
      return false;
    }
    
    return true;
  }

  /**
   * 注入Toast样式
   */
  private injectToastStyles(): void {
    if (document.getElementById('version-toast-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'version-toast-styles';
    styles.textContent = `
      .version-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(26, 26, 46, 0.95);
        border: 2px solid #00ff00;
        border-radius: 8px;
        padding: 16px;
        z-index: 9999;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-family: 'Courier New', monospace;
        color: #00ff00;
        backdrop-filter: blur(5px);
      }
      
      .version-toast.show {
        transform: translateX(0);
      }
      
      .toast-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .toast-message {
        flex: 1;
        font-size: 13px;
        line-height: 1.4;
      }
      
      .toast-action {
        background: #00ff00;
        color: #1a1a2e;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }
      
      .toast-action:hover {
        background: #8bac0f;
        transform: scale(1.05);
      }
      
      .toast-close {
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .toast-close:hover {
        background: #00ff00;
        color: #1a1a2e;
      }
      
      .toast-welcome {
        border-color: #8bac0f;
      }
      
      .toast-update {
        border-color: #ff8000;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
      
      @media (max-width: 768px) {
        .version-toast {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
          transform: translateY(-100%);
        }
        
        .version-toast.show {
          transform: translateY(0);
        }
        
        .toast-content {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }
        
        .toast-action {
          align-self: center;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * 手动显示版本信息
   */
  showVersionModal(): void {
    getVersionModal().show();
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): string {
    return CURRENT_VERSION.version;
  }

  /**
   * 获取版本代号
   */
  getVersionCodename(): string | undefined {
    return CURRENT_VERSION.codename;
  }
}

// 导出单例实例
let versionManagerInstance: VersionManager | null = null;

export function getVersionManager(): VersionManager {
  if (!versionManagerInstance) {
    versionManagerInstance = new VersionManager();
  }
  return versionManagerInstance;
}

// 自动初始化
if (typeof window !== 'undefined') {
  // 等待DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => getVersionManager());
  } else {
    getVersionManager();
  }
}