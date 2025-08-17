/**
 * 键盘控制器
 * - 独立绑定/解绑事件
 * - 输出归一化输入状态
 */
(function(global){
    class KeyboardController {
        constructor() {
            this.state = {
                enter: false,
                left: false,
                right: false,
                down: false,
                rotateCW: false,
                rotateCCW: false,
                pause: false,
                reset: false,
                musicToggle: false,
                hardDrop: false
            };
            this._onKeyDown = (e) => this.handleKeyDown(e);
            this._onKeyUp = (e) => this.handleKeyUp(e);
            this.bind();
        }

        bind() {
            // 使用非被动监听，允许 preventDefault 阻止默认滚动/页面跳转
            document.addEventListener('keydown', this._onKeyDown, { passive: false });
            document.addEventListener('keyup', this._onKeyUp, { passive: false });
        }

        unbind() {
            document.removeEventListener('keydown', this._onKeyDown);
            document.removeEventListener('keyup', this._onKeyUp);
        }

        handleKeyDown(e) {
            // 输入框/可编辑区域内不截获按键，避免干扰命名弹窗
            const t = e.target;
            const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            switch(e.code) {
                case 'Enter': this.state.enter = true; break;
                case 'ArrowLeft': case 'KeyA': this.state.left = true; if (!typing) e.preventDefault(); break;
                case 'ArrowRight': case 'KeyD': this.state.right = true; if (!typing) e.preventDefault(); break;
                case 'ArrowDown': case 'KeyS': this.state.down = true; if (!typing) e.preventDefault(); break;
                case 'KeyQ': this.state.rotateCCW = true; break;
                case 'KeyE': this.state.rotateCW = true; break;
                case 'ArrowUp': this.state.rotateCW = true; if (!typing) e.preventDefault(); break;
                case 'Escape': case 'KeyP': this.state.pause = true; break;
                case 'KeyR': this.state.reset = true; break;
                case 'KeyM': this.state.musicToggle = true; break;
                case 'Space':
                case 'Spacebar': // 兼容旧Safari
                    this.state.hardDrop = true; if (!typing) e.preventDefault(); break; // 空格：硬降
            }
        }

        handleKeyUp(e) {
            const t = e.target;
            const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            switch(e.code) {
                case 'Enter': this.state.enter = false; break;
                case 'ArrowLeft': case 'KeyA': this.state.left = false; if (!typing) e.preventDefault(); break;
                case 'ArrowRight': case 'KeyD': this.state.right = false; if (!typing) e.preventDefault(); break;
                case 'ArrowDown': case 'KeyS': this.state.down = false; if (!typing) e.preventDefault(); break;
                case 'KeyQ': this.state.rotateCCW = false; break;
                case 'KeyE': this.state.rotateCW = false; break;
                case 'ArrowUp': this.state.rotateCW = false; if (!typing) e.preventDefault(); break;
                case 'Escape': case 'KeyP': this.state.pause = false; break;
                case 'KeyR': this.state.reset = false; break;
                case 'KeyM': this.state.musicToggle = false; break;
                case 'Space':
                case 'Spacebar':
                    this.state.hardDrop = false; if (!typing) e.preventDefault(); break;
            }
        }

        getState() {
            return { ...this.state };
        }
    }

    global.KeyboardController = KeyboardController;
})(window);
