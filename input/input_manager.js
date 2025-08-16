/**
 * 输入管理器
 * - 聚合 KeyboardController 与 GamepadController
 * - 输出统一输入状态
 * - 提供状态显示与触觉反馈
 */
(function(global){
    class InputManager {
        constructor(options = {}) {
            const { enableKeyboard = true, enableGamepad = true, deadzone } = options;
            this.keyboard = enableKeyboard ? new KeyboardController() : null;
            this.gamepad = enableGamepad ? new GamepadController({ deadzone }) : null;
            this.haptics = new Haptics();
            this._lastConnectedPadId = null;
            this._lastConnectionChangeAt = 0;
            this._ensureStatusUI();
        }

        getInputState() {
            const k = this.keyboard ? this.keyboard.getState() : {};
            const g = this.gamepad ? this.gamepad.getState() : {};
            return {
                enter: !!k.enter,
                left: !!(g.left || k.left),
                right: !!(g.right || k.right),
                down: !!(g.down || k.down),
                rotateCW: !!(g.rotateCW || k.rotateCW),
                rotateCCW: !!(g.rotateCCW || k.rotateCCW),
                pause: !!(g.pause || k.pause),
                reset: !!(g.reset || k.reset),
                musicToggle: !!(g.musicToggle || k.musicToggle),
                softDrop: !!g.softDrop,
                hardDrop: !!(g.hardDrop || k.hardDrop)
            };
        }

        triggerVibration(type) {
            const pad = this.gamepad ? this.gamepad.getConnectedGamepad() : null;
            this.haptics.trigger(type, pad);
        }

        updateStatus() {
            const el = document.getElementById('gamepadStatus');
            if (!el) return;
            const pad = this.gamepad ? this.gamepad.getConnectedGamepad() : null;
            if (pad) {
                el.style.display = 'inline-block';
                el.textContent = '🎮';
                el.className = 'gamepad-status connected icon-only';
                if (window.GameLogger) window.GameLogger.event('gamepad-connected', { id: pad.id, index: pad.index });
                if (pad.id !== this._lastConnectedPadId) {
                    this._lastConnectedPadId = pad.id;
                    this._lastConnectionChangeAt = performance.now();
                }
            } else {
                el.style.display = 'none';
                el.textContent = '';
                el.className = 'gamepad-status disconnected icon-only';
                if (this._lastConnectedPadId && window.GameLogger) window.GameLogger.event('gamepad-disconnected');
                if (this._lastConnectedPadId !== null) {
                    this._lastConnectedPadId = null;
                    this._lastConnectionChangeAt = performance.now();
                }
            }
        }

        _ensureStatusUI() {
            const gameMain = document.querySelector('.game-main');
            if (!gameMain) return;
            if (document.getElementById('gamepadStatus')) return;
            const statusDiv = document.createElement('div');
            statusDiv.id = 'gamepadStatus';
            statusDiv.className = 'gamepad-status disconnected';
            statusDiv.textContent = '未检测到手柄';
            // 插到主窗口下面（在 .game-main 后面）
            gameMain.insertAdjacentElement('afterend', statusDiv);
            // 样式
            const style = document.createElement('style');
            style.textContent = `
                .gamepad-status {
                    position: static;
                    display: inline-block;
                    margin: 10px auto 0 auto;
                    padding: 8px 14px;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    pointer-events: none;
                    text-align: center;
                }
                .gamepad-status.connected { background-color: #4CAF50; color: #fff; }
                .gamepad-status.disconnected { background-color: #f44336; color: #fff; }
                .game-container { text-align: center; }
                .gamepad-status.icon-only { padding: 6px 10px; font-size: 18px; }
            `;
            document.head.appendChild(style);
        }

        isGamepadConnected() {
            return !!(this.gamepad && this.gamepad.getConnectedGamepad());
        }

        justChangedConnection(withinMs = 500) {
            return (performance.now() - this._lastConnectionChangeAt) < withinMs;
        }
    }

    global.InputManager = InputManager;
})(window);
