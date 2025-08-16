/**
 * 浏览器兼容性测试脚本
 * 用于检测游戏所需的Web API支持情况
 */

class CompatibilityTest {
    constructor() {
        this.results = {};
        this.tests = [
            {
                name: 'Canvas API',
                test: () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    return !!ctx;
                }
            },
            {
                name: 'CSS Variables',
                test: () => {
                    const style = getComputedStyle(document.documentElement);
                    style.setProperty('--test-var', 'test');
                    return style.getPropertyValue('--test-var') === 'test';
                }
            },
            {
                name: 'CSS Grid',
                test: () => {
                    const div = document.createElement('div');
                    div.style.display = 'grid';
                    return div.style.display === 'grid';
                }
            },
            {
                name: 'Flexbox',
                test: () => {
                    const div = document.createElement('div');
                    div.style.display = 'flex';
                    return div.style.display === 'flex';
                }
            },
            {
                name: 'Media Queries',
                test: () => {
                    return window.matchMedia && window.matchMedia('(max-width: 768px)');
                }
            },
            {
                name: 'LocalStorage',
                test: () => {
                    try {
                        localStorage.setItem('test', 'test');
                        localStorage.removeItem('test');
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            },
            {
                name: 'Touch Events',
                test: () => {
                    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                }
            },
            {
                name: 'Audio API',
                test: () => {
                    return 'AudioContext' in window || 'webkitAudioContext' in window;
                }
            },
            {
                name: 'RequestAnimationFrame',
                test: () => {
                    return 'requestAnimationFrame' in window;
                }
            },
            {
                name: 'Device Pixel Ratio',
                test: () => {
                    return 'devicePixelRatio' in window;
                }
            }
        ];
    }

    runTests() {
        console.log('开始浏览器兼容性测试...');
        
        this.results = {
            browser: this.getBrowserInfo(),
            screen: this.getScreenInfo(),
            features: {}
        };

        this.tests.forEach(test => {
            try {
                this.results.features[test.name] = test.test();
                console.log(`${test.name}: ${this.results.features[test.name] ? '✓ 支持' : '✗ 不支持'}`);
            } catch (e) {
                this.results.features[test.name] = false;
                console.log(`${test.name}: ✗ 错误 - ${e.message}`);
            }
        });

        this.displayResults();
        return this.results;
    }

    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = 'Unknown';

        if (ua.includes('Chrome')) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Firefox')) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            browser = 'Safari';
            version = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
        } else if (ua.includes('Edge')) {
            browser = 'Edge';
            version = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
        }

        return { name: browser, version: version, userAgent: ua };
    }

    getScreenInfo() {
        return {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    displayResults() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        let html = '<h3>兼容性测试结果</h3>';
        
        // 浏览器信息
        html += `<h4>浏览器: ${this.results.browser.name} ${this.results.browser.version}</h4>`;
        
        // 屏幕信息
        html += `<h4>屏幕信息:</h4>`;
        html += `<p>分辨率: ${this.results.screen.width}x${this.results.screen.height}</p>`;
        html += `<p>可用区域: ${this.results.screen.availWidth}x${this.results.screen.availHeight}</p>`;
        html += `<p>像素比: ${this.results.screen.devicePixelRatio}</p>`;
        
        // 功能支持
        html += '<h4>功能支持:</h4>';
        Object.entries(this.results.features).forEach(([feature, supported]) => {
            html += `<p>${feature}: ${supported ? '✓' : '✗'}</p>`;
        });

        // 兼容性评分
        const supportedCount = Object.values(this.results.features).filter(Boolean).length;
        const totalCount = this.tests.length;
        const score = Math.round((supportedCount / totalCount) * 100);
        
        html += `<h4>兼容性评分: ${score}% (${supportedCount}/${totalCount})</h4>`;
        
        if (score >= 90) {
            html += '<p style="color: green;">✓ 完全兼容</p>';
        } else if (score >= 70) {
            html += '<p style="color: orange;">⚠ 基本兼容</p>';
        } else {
            html += '<p style="color: red;">✗ 兼容性较差</p>';
        }

        // 关闭按钮
        html += '<button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px;">关闭</button>';

        container.innerHTML = html;
        document.body.appendChild(container);
    }
}

// 自动运行测试
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const test = new CompatibilityTest();
        test.runTests();
    });
}

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompatibilityTest;
}

