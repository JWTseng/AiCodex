/**
 * Changelog 显示模块
 * 动态读取 CHANGELOG.md 并渲染版本信息
 */

class ChangelogManager {
    constructor() {
        this.changelogData = null;
    }

    /**
     * 读取并解析 CHANGELOG.md 文件
     */
    async loadChangelog() {
        try {
            console.log('🔄 开始加载 CHANGELOG.md...');
            const response = await fetch('./CHANGELOG.md');
            console.log('📥 Fetch响应:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('📄 读取到文本长度:', text.length);
            console.log('📄 前100字符:', text.substring(0, 100));
            
            this.changelogData = this.parseMarkdown(text);
            console.log('✅ 解析完成，版本数量:', this.changelogData ? this.changelogData.length : 0);
            
            return this.changelogData;
        } catch (error) {
            console.error('❌ 加载changelog失败:', error);
            console.error('错误详情:', error.message);
            return null;
        }
    }

    /**
     * 解析 Markdown 格式的 changelog
     */
    parseMarkdown(text) {
        const versions = [];
        const lines = text.split('\n');
        let currentVersion = null;
        let currentSection = null;
        let currentList = [];

        for (let line of lines) {
            line = line.trim();
            
            // 版本标题 (## v3.1.0 "Modern Mechanics" - 2025-08-18)
            if (line.match(/^## v\d+\.\d+\.\d+/)) {
                if (currentVersion) {
                    if (currentSection && currentList.length > 0) {
                        currentVersion[currentSection] = [...currentList];
                    }
                    versions.push(currentVersion);
                }
                
                const match = line.match(/^## v(\d+\.\d+\.\d+)(?:\s+"([^"]+)")?\s*-\s*(.+)$/);
                if (match) {
                    currentVersion = {
                        version: match[1],
                        codename: match[2] || '',
                        date: match[3],
                        features: [],
                        improvements: [],
                        optimizations: [],
                        bugFixes: [],
                        breaking: []
                    };
                }
                currentSection = null;
                currentList = [];
            }
            // 段落标题
            else if (line.match(/^### /)) {
                if (currentSection && currentList.length > 0) {
                    currentVersion[currentSection] = [...currentList];
                }
                currentList = [];
                
                if (line.includes('主要新功能') || line.includes('🆕')) {
                    currentSection = 'features';
                } else if (line.includes('改进功能') || line.includes('⚡')) {
                    currentSection = 'improvements';
                } else if (line.includes('优化改进') || line.includes('🔧')) {
                    currentSection = 'optimizations';
                } else if (line.includes('Bug修复') || line.includes('🐛')) {
                    currentSection = 'bugFixes';
                } else if (line.includes('破坏性变更') || line.includes('⚠️')) {
                    currentSection = 'breaking';
                }
            }
            // 功能项目 (- **功能名** 描述)
            else if (line.match(/^- \*\*(.+?)\*\*/)) {
                const match = line.match(/^- \*\*(.+?)\*\*\s*(.*)$/);
                if (match && currentSection && currentSection !== 'optimizations') {
                    currentList.push({
                        title: match[1],
                        description: match[2]
                    });
                }
            }
            // 描述行 - 直接跟在**功能名**后面的描述
            else if (line && currentList.length > 0 && currentSection && currentSection !== 'optimizations' && currentSection !== 'bugFixes' && currentSection !== 'breaking') {
                const lastItem = currentList[currentList.length - 1];
                if (lastItem && typeof lastItem === 'object' && !line.startsWith('-') && !line.startsWith('##') && !line.startsWith('###')) {
                    lastItem.description += (lastItem.description ? ' ' : '') + line;
                }
            }
            // 简单列表项 (- 描述)
            else if (line.match(/^- /)) {
                const text = line.replace(/^- /, '');
                if (currentSection) {
                    if (currentSection === 'optimizations' || currentSection === 'bugFixes' || currentSection === 'breaking') {
                        currentList.push(text);
                    }
                }
            }
        }

        // 处理最后一个版本
        if (currentVersion) {
            if (currentSection && currentList.length > 0) {
                currentVersion[currentSection] = [...currentList];
            }
            versions.push(currentVersion);
        }

        return versions;
    }

    /**
     * 渲染版本信息HTML
     */
    renderVersion(version) {
        const codename = version.codename ? `"${version.codename}"` : '';
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div style="flex: 1;">
                    <h2 style="margin: 0; color: #00ff00; text-transform: uppercase; font-size: 18px; font-weight: bold;">
                        TETRIS WORLD v${version.version}
                    </h2>
                    ${codename ? `<p style="margin: 4px 0 2px 0; color: #8bac0f; font-style: normal; text-transform: uppercase; font-size: 12px;">${codename}</p>` : ''}
                    <p style="margin: 0; font-size: 10px; color: #888; text-transform: uppercase; opacity: 0.8;">
                        发布日期: ${version.date}
                    </p>
                </div>
                <button id="close-version-modal" style="
                    background: #0f380f; border: 2px solid #00ff00; color: #00ff00;
                    width: 36px; height: 36px; border-radius: 0px; cursor: pointer; font-size: 16px;
                    font-family: 'Courier New', monospace; font-weight: bold; flex-shrink: 0; margin-left: 16px;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#00ff00'; this.style.color='#0f380f';" 
                   onmouseout="this.style.background='#0f380f'; this.style.color='#00ff00';">×</button>
            </div>
            
            <div style="max-height: 450px; overflow-y: auto; font-size: 12px;">
        `;

        // 主要新功能
        if (version.features && version.features.length > 0) {
            html += `
                <h3 style="color: #00ff00; margin: 16px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #306230; padding-bottom: 4px; font-size: 13px; font-weight: bold;">主要新功能</h3>
                <ul style="color: #8bac0f; line-height: 1.5; margin: 0; padding-left: 16px; list-style: none;">
            `;
            version.features.forEach(feature => {
                html += `
                    <li style="margin-bottom: 10px;">
                        <div style="font-weight: bold; font-size: 11px;">- ${feature.title}</div>
                        <div style="font-size: 10px; color: #999; margin-top: 2px; padding-left: 8px;">${feature.description}</div>
                    </li>
                `;
            });
            html += `</ul>`;
        }

        // 改进功能
        if (version.improvements && version.improvements.length > 0) {
            html += `
                <h3 style="color: #00ff00; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #306230; padding-bottom: 4px; font-size: 13px; font-weight: bold;">改进功能</h3>
                <ul style="color: #8bac0f; line-height: 1.5; margin: 0; padding-left: 16px; list-style: none;">
            `;
            version.improvements.forEach(improvement => {
                html += `
                    <li style="margin-bottom: 10px;">
                        <div style="font-weight: bold; font-size: 11px;">- ${improvement.title}</div>
                        <div style="font-size: 10px; color: #999; margin-top: 2px; padding-left: 8px;">${improvement.description}</div>
                    </li>
                `;
            });
            html += `</ul>`;
        }

        // 优化改进
        if (version.optimizations && version.optimizations.length > 0) {
            html += `
                <h3 style="color: #00ff00; margin: 20px 0 10px 0; text-transform: uppercase; border-bottom: 1px solid #306230; padding-bottom: 4px; font-size: 13px; font-weight: bold;">优化改进</h3>
                <ul style="color: #8bac0f; line-height: 1.4; margin: 0; padding-left: 16px; list-style: none;">
            `;
            version.optimizations.forEach(opt => {
                html += `<li style="margin-bottom: 6px; font-size: 11px;">- ${opt}</li>`;
            });
            html += `</ul>`;
        }

        html += `
                <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #306230; font-size: 9px; color: #666; line-height: 1.3;">
                    <div>基于 TypeScript + Vite 构建 &nbsp;•&nbsp; 包含 43 个单元测试</div>
                </div>
            </div>
        `;

        return html;
    }

    /**
     * 显示版本信息弹窗
     */
    async showVersionModal() {
        console.log('🚀 开始显示版本弹窗...');
        
        const versions = await this.loadChangelog();
        console.log('📦 获取到的版本数据:', versions);
        
        if (!versions || versions.length === 0) {
            console.error('❌ 没有changelog数据可用');
            // 显示一个错误提示弹窗
            alert('无法加载更新日志，请检查网络连接或稍后重试。');
            return;
        }

        const currentVersion = versions[0]; // 获取最新版本
        console.log('🎯 当前版本数据:', currentVersion);
        
        const modalHTML = this.renderVersion(currentVersion);

        const modal = document.createElement('div');
        modal.id = 'version-info-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; justify-content: center; align-items: center;
        `;

        modal.innerHTML = `
            <div style="
                background: #0f380f; border: 2px solid #00ff00; border-radius: 0px;
                max-width: 650px; width: 90%; color: #00ff00;
                font-family: 'Courier New', monospace; padding: 24px;
                font-size: 13px; line-height: 1.4;
            ">
                ${modalHTML}
            </div>
        `;

        document.body.appendChild(modal);

        // 绑定关闭事件
        const closeBtn = modal.querySelector('#close-version-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// 全局实例
console.log('🔧 正在初始化 ChangelogManager...');
window.changelogManager = new ChangelogManager();
console.log('✅ ChangelogManager 初始化完成:', window.changelogManager);

// 测试函数 - 在控制台直接调用测试
window.testChangelog = function() {
    console.log('🧪 测试 changelog 功能...');
    if (window.changelogManager) {
        console.log('✅ changelogManager 可用');
        window.changelogManager.showVersionModal();
    } else {
        console.error('❌ changelogManager 不可用');
    }
};