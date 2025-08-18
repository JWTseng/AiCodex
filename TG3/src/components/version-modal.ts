import { CURRENT_VERSION, VERSION_HISTORY, type VersionInfo, type VersionFeature } from '@/config/version';
import { createLogger } from '@/utils/logger';

const logger = createLogger('VersionModal');

export class VersionModal {
  private modal: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.createModal();
    this.bindEvents();
  }

  private createModal(): void {
    // 检查是否已存在
    if (document.getElementById('version-modal')) {
      this.modal = document.getElementById('version-modal');
      return;
    }

    this.modal = document.createElement('div');
    this.modal.id = 'version-modal';
    this.modal.className = 'version-modal-overlay';
    this.modal.innerHTML = this.generateModalHTML();
    
    document.body.appendChild(this.modal);
    
    // 添加样式
    this.injectStyles();
  }

  private generateModalHTML(): string {
    const currentVersion = CURRENT_VERSION;
    
    return `
      <div class="version-modal-content">
        <div class="version-modal-header">
          <div class="version-title">
            <h2>🎮 Tetris World</h2>
            <div class="version-info">
              <span class="version-number">v${currentVersion.version}</span>
              ${currentVersion.codename ? `<span class="version-codename">"${currentVersion.codename}"</span>` : ''}
            </div>
            <div class="release-date">发布日期: ${this.formatDate(currentVersion.releaseDate)}</div>
          </div>
          <button class="version-modal-close" id="version-modal-close">✕</button>
        </div>
        
        <div class="version-modal-body">
          ${this.generateFeaturesHTML(currentVersion.features)}
          ${this.generateSectionHTML('🔧 改进优化', currentVersion.improvements)}
          ${this.generateSectionHTML('🐛 问题修复', currentVersion.bugFixes)}
          ${currentVersion.breaking && currentVersion.breaking.length > 0 
            ? this.generateSectionHTML('⚠️ 重大变更', currentVersion.breaking, 'warning') 
            : ''
          }
          
          <div class="version-section">
            <h3>📋 版本历史</h3>
            <div class="version-history">
              ${VERSION_HISTORY.slice(1, 4).map(version => this.generateVersionHistoryItem(version)).join('')}
            </div>
          </div>
          
          <div class="version-footer">
            <div class="tech-info">
              <span>🏗️ 基于 TypeScript + Vite 构建</span>
              <span>🧪 包含 ${this.getTotalTestCount()} 个单元测试</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateFeaturesHTML(features: VersionFeature[]): string {
    return `
      <div class="version-section features-section">
        <h3>✨ 新功能特性</h3>
        <div class="features-grid">
          ${features.map(feature => `
            <div class="feature-item feature-${feature.type}">
              <div class="feature-header">
                ${feature.icon || '🔥'} <strong>${feature.title}</strong>
                <span class="feature-badge badge-${feature.type}">${this.getFeatureTypeLabel(feature.type)}</span>
              </div>
              <div class="feature-description">${feature.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private generateSectionHTML(title: string, items: string[], type: string = 'default'): string {
    if (!items || items.length === 0) return '';
    
    return `
      <div class="version-section section-${type}">
        <h3>${title}</h3>
        <ul class="version-list">
          ${items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  private generateVersionHistoryItem(version: VersionInfo): string {
    return `
      <div class="version-history-item">
        <div class="version-history-header">
          <span class="version-number">v${version.version}</span>
          <span class="version-date">${this.formatDate(version.releaseDate)}</span>
        </div>
        <div class="version-summary">
          ${version.features.slice(0, 2).map(f => `• ${f.title}`).join('<br>')}
          ${version.features.length > 2 ? `<br>• 以及 ${version.features.length - 2} 项其他更新` : ''}
        </div>
      </div>
    `;
  }

  private getFeatureTypeLabel(type: string): string {
    switch (type) {
      case 'new': return '新功能';
      case 'improved': return '改进';
      case 'experimental': return '实验性';
      default: return '更新';
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private getTotalTestCount(): number {
    // 动态计算测试数量，这里先用固定值
    return 34;
  }

  private bindEvents(): void {
    document.addEventListener('click', (e) => {
      if (e.target && (e.target as HTMLElement).id === 'version-modal-close') {
        this.hide();
      }
      
      if (e.target === this.modal) {
        this.hide();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  show(): void {
    if (!this.modal) return;
    
    this.modal.style.display = 'flex';
    this.isVisible = true;
    
    // 防止背景滚动
    document.body.style.overflow = 'hidden';
    
    // 添加显示动画
    setTimeout(() => {
      this.modal?.classList.add('show');
    }, 10);
    
    logger.info('Version modal opened');
  }

  hide(): void {
    if (!this.modal) return;
    
    this.modal.classList.remove('show');
    
    setTimeout(() => {
      if (this.modal) {
        this.modal.style.display = 'none';
      }
      document.body.style.overflow = '';
      this.isVisible = false;
    }, 300);
    
    logger.info('Version modal closed');
  }

  private injectStyles(): void {
    if (document.getElementById('version-modal-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'version-modal-styles';
    styles.textContent = `
      .version-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .version-modal-overlay.show {
        opacity: 1;
      }
      
      .version-modal-content {
        background: #1a1a2e;
        border: 2px solid #00ff00;
        border-radius: 8px;
        max-width: 800px;
        max-height: 90vh;
        width: 90%;
        color: #00ff00;
        font-family: 'Courier New', monospace;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .version-modal-overlay.show .version-modal-content {
        transform: scale(1);
      }
      
      .version-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 20px;
        border-bottom: 1px solid #00ff00;
      }
      
      .version-title h2 {
        margin: 0 0 8px 0;
        color: #00ff00;
        font-size: 24px;
      }
      
      .version-info {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 8px;
      }
      
      .version-number {
        background: #00ff00;
        color: #1a1a2e;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 14px;
      }
      
      .version-codename {
        font-style: italic;
        color: #8bac0f;
      }
      
      .release-date {
        font-size: 12px;
        color: #888;
      }
      
      .version-modal-close {
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s ease;
      }
      
      .version-modal-close:hover {
        background: #00ff00;
        color: #1a1a2e;
      }
      
      .version-modal-body {
        padding: 20px;
        max-height: calc(90vh - 120px);
        overflow-y: auto;
      }
      
      .version-section {
        margin-bottom: 24px;
      }
      
      .version-section h3 {
        margin: 0 0 12px 0;
        color: #00ff00;
        font-size: 16px;
        border-bottom: 1px solid #333;
        padding-bottom: 4px;
      }
      
      .features-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
      
      .feature-item {
        background: rgba(0, 255, 0, 0.05);
        border: 1px solid rgba(0, 255, 0, 0.2);
        border-radius: 6px;
        padding: 12px;
      }
      
      .feature-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      
      .feature-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        text-transform: uppercase;
      }
      
      .badge-new {
        background: #00ff00;
        color: #1a1a2e;
      }
      
      .badge-improved {
        background: #8bac0f;
        color: #1a1a2e;
      }
      
      .badge-experimental {
        background: #ff8000;
        color: #1a1a2e;
      }
      
      .feature-description {
        font-size: 13px;
        color: #bbb;
        line-height: 1.4;
      }
      
      .version-list {
        margin: 0;
        padding-left: 20px;
        color: #bbb;
      }
      
      .version-list li {
        margin-bottom: 6px;
        line-height: 1.4;
      }
      
      .section-warning {
        border-left: 3px solid #ff6b6b;
        padding-left: 12px;
        background: rgba(255, 107, 107, 0.1);
      }
      
      .version-history {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .version-history-item {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid #333;
        border-radius: 6px;
        padding: 12px;
      }
      
      .version-history-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      
      .version-history-header .version-number {
        font-size: 12px;
      }
      
      .version-date {
        font-size: 11px;
        color: #666;
      }
      
      .version-summary {
        font-size: 12px;
        color: #999;
        line-height: 1.3;
      }
      
      .version-footer {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #333;
      }
      
      .tech-info {
        display: flex;
        gap: 16px;
        font-size: 11px;
        color: #666;
        flex-wrap: wrap;
      }
      
      @media (max-width: 768px) {
        .version-modal-content {
          width: 95%;
          max-height: 95vh;
        }
        
        .features-grid {
          grid-template-columns: 1fr;
        }
        
        .version-modal-header {
          padding: 16px;
        }
        
        .version-modal-body {
          padding: 16px;
        }
        
        .tech-info {
          flex-direction: column;
          gap: 8px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// 导出单例实例
let versionModalInstance: VersionModal | null = null;

export function getVersionModal(): VersionModal {
  if (!versionModalInstance) {
    versionModalInstance = new VersionModal();
  }
  return versionModalInstance;
}