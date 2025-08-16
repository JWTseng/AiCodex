/**
 * 响应式设计自动化测试脚本
 * 用于验证游戏在不同屏幕尺寸下的表现
 */

class ResponsiveTest {
    constructor() {
        this.testResults = [];
        this.breakpoints = [
            { name: '大屏幕设备', width: 1920, height: 1080, scale: 1.2 },
            { name: '标准桌面', width: 1200, height: 800, scale: 1.0 },
            { name: '小桌面', width: 1024, height: 768, scale: 0.9 },
            { name: '平板设备', width: 768, height: 1024, scale: 0.8 },
            { name: '手机设备', width: 480, height: 800, scale: 0.7 },
            { name: '小屏手机', width: 320, height: 568, scale: 0.6 },
            { name: '超小屏', width: 280, height: 400, scale: 0.5 }
        ];
    }

    async runTests() {
        console.log('开始响应式设计测试...');
        
        for (const breakpoint of this.breakpoints) {
            await this.testBreakpoint(breakpoint);
        }
        
        this.displayResults();
        return this.testResults;
    }

    async testBreakpoint(breakpoint) {
        console.log(`测试断点: ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`);
        
        // 模拟窗口大小
        this.simulateWindowSize(breakpoint.width, breakpoint.height);
        
        // 等待CSS重新计算
        await this.wait(100);
        
        const result = {
            breakpoint: breakpoint.name,
            dimensions: `${breakpoint.width}x${breakpoint.height}`,
            expectedScale: breakpoint.scale,
            actualScale: this.getActualScale(),
            canvasSize: this.getCanvasSize(),
            sidebarSize: this.getSidebarSize(),
            isResponsive: true,
            issues: []
        };
        
        // 验证缩放比例
        if (Math.abs(result.actualScale - breakpoint.scale) > 0.1) {
            result.isResponsive = false;
            result.issues.push(`缩放比例不匹配: 期望 ${breakpoint.scale}, 实际 ${result.actualScale}`);
        }
        
        // 验证Canvas尺寸
        const expectedCanvasWidth = this.getExpectedCanvasWidth(breakpoint);
        if (result.canvasSize.width !== expectedCanvasWidth) {
            result.isResponsive = false;
            result.issues.push(`Canvas宽度不匹配: 期望 ${expectedCanvasWidth}px, 实际 ${result.canvasSize.width}px`);
        }
        
        // 验证侧边栏尺寸
        const expectedSidebarWidth = this.getExpectedSidebarWidth(breakpoint);
        if (result.sidebarSize.width !== expectedSidebarWidth) {
            result.isResponsive = false;
            result.issues.push(`侧边栏宽度不匹配: 期望 ${expectedSidebarWidth}px, 实际 ${result.sidebarSize.width}px`);
        }
        
        // 验证游戏容器是否在视口内
        const container = document.querySelector('.game-container');
        if (container) {
            const rect = container.getBoundingClientRect();
            if (rect.width > breakpoint.width || rect.height > breakpoint.height) {
                result.isResponsive = false;
                result.issues.push(`游戏容器超出视口: ${rect.width}x${rect.height}`);
            }
        }
        
        this.testResults.push(result);
        console.log(`✓ ${breakpoint.name}: ${result.isResponsive ? '通过' : '失败'}`);
        
        if (result.issues.length > 0) {
            console.log(`  问题: ${result.issues.join(', ')}`);
        }
    }

    simulateWindowSize(width, height) {
        // 模拟窗口大小变化
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: width
        });
        
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: height
        });
        
        // 触发resize事件
        window.dispatchEvent(new Event('resize'));
    }

    getActualScale() {
        const container = document.querySelector('.game-container');
        if (!container) return 1;
        
        const transform = getComputedStyle(container).transform;
        if (transform === 'none') return 1;
        
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        if (matrix) {
            const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
            return values[0]; // 第一个值是X轴缩放
        }
        
        return 1;
    }

    getCanvasSize() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return { width: 0, height: 0 };
        
        return {
            width: canvas.width,
            height: canvas.height
        };
    }

    getSidebarSize() {
        const sidebar = document.querySelector('.game-sidebar');
        if (!sidebar) return { width: 0, height: 0 };
        
        const rect = sidebar.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }

    getExpectedCanvasWidth(breakpoint) {
        const baseWidth = 400;
        if (breakpoint.width < 768) {
            // 平板及以下设备使用较小的Canvas
            return Math.max(200, Math.min(350, breakpoint.width * 0.7));
        }
        return baseWidth;
    }

    getExpectedSidebarWidth(breakpoint) {
        const baseWidth = 280;
        if (breakpoint.width < 768) {
            // 平板及以下设备使用较小的侧边栏
            return Math.max(150, Math.min(240, breakpoint.width * 0.3));
        }
        return baseWidth;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayResults() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        let html = '<h3>响应式测试结果</h3>';
        
        const passedTests = this.testResults.filter(r => r.isResponsive).length;
        const totalTests = this.testResults.length;
        const score = Math.round((passedTests / totalTests) * 100);
        
        html += `<h4>总体评分: ${score}% (${passedTests}/${totalTests})</h4>`;
        
        this.testResults.forEach(result => {
            const status = result.isResponsive ? '✓' : '✗';
            const color = result.isResponsive ? 'green' : 'red';
            
            html += `<div style="margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">`;
            html += `<h5 style="color: ${color}; margin: 0 0 5px 0;">${status} ${result.breakpoint}</h5>`;
            html += `<p style="margin: 2px 0;">尺寸: ${result.dimensions}</p>`;
            html += `<p style="margin: 2px 0;">缩放: ${result.actualScale.toFixed(2)} (期望: ${result.expectedScale})</p>`;
            html += `<p style="margin: 2px 0;">Canvas: ${result.canvasSize.width}x${result.canvasSize.height}</p>`;
            html += `<p style="margin: 2px 0;">侧边栏: ${result.sidebarSize.width.toFixed(0)}x${result.sidebarSize.height.toFixed(0)}</p>`;
            
            if (result.issues.length > 0) {
                html += `<p style="color: red; margin: 5px 0 0 0; font-size: 12px;">问题: ${result.issues.join(', ')}</p>`;
            }
            
            html += `</div>`;
        });

        // 关闭按钮
        html += '<button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">关闭</button>';

        container.innerHTML = html;
        document.body.appendChild(container);
    }
}

// 自动运行测试（仅在开发模式下）
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.addEventListener('DOMContentLoaded', () => {
        // 延迟运行，确保游戏完全加载
        setTimeout(() => {
            const test = new ResponsiveTest();
            test.runTests();
        }, 2000);
    });
}

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResponsiveTest;
}

