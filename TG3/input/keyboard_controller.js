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
            document.addEventListener('keydown', this._onKeyDown);
            document.addEventListener('keyup', this._onKeyUp);
        }

        unbind() {
            document.removeEventListener('keydown', this._onKeyDown);
            document.removeEventListener('keyup', this._onKeyUp);
        }

        handleKeyDown(e) {
            switch(e.code) {
                case 'Enter': this.state.enter = true; break;
                case 'ArrowLeft': case 'KeyA': this.state.left = true; break;
                case 'ArrowRight': case 'KeyD': this.state.right = true; break;
                case 'ArrowDown': case 'KeyS': this.state.down = true; break;
                case 'KeyQ': this.state.rotateCCW = true; break;
                case 'KeyE': this.state.rotateCW = true; break;
                case 'ArrowUp': this.state.rotateCW = true; break;
                case 'Escape': case 'KeyP': this.state.pause = true; break;
                case 'KeyR': this.state.reset = true; break;
                case 'KeyM': this.state.musicToggle = true; break;
                case 'Space': this.state.hardDrop = true; break; // 空格：硬降
            }
        }

        handleKeyUp(e) {
            switch(e.code) {
                case 'Enter': this.state.enter = false; break;
                case 'ArrowLeft': case 'KeyA': this.state.left = false; break;
                case 'ArrowRight': case 'KeyD': this.state.right = false; break;
                case 'ArrowDown': case 'KeyS': this.state.down = false; break;
                case 'KeyQ': this.state.rotateCCW = false; break;
                case 'KeyE': this.state.rotateCW = false; break;
                case 'ArrowUp': this.state.rotateCW = false; break;
                case 'Escape': case 'KeyP': this.state.pause = false; break;
                case 'KeyR': this.state.reset = false; break;
                case 'KeyM': this.state.musicToggle = false; break;
                case 'Space': this.state.hardDrop = false; break;
            }
        }

        getState() {
            return { ...this.state };
        }
    }

    global.KeyboardController = KeyboardController;
})(window);
