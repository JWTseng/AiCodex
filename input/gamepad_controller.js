/**
 * 手柄控制器（Xbox 优先）
 * - 管理连接/断开
 * - 轮询状态并输出归一化输入
 */
(function(global){
    class GamepadController {
        constructor(options = {}) {
            this.deadzone = options.deadzone ?? 0.3;
            this.connectedGamepad = null;
            this._onConnected = (e) => this.onGamepadConnected(e.gamepad);
            this._onDisconnected = (e) => this.onGamepadDisconnected(e.gamepad);
            window.addEventListener('gamepadconnected', this._onConnected);
            window.addEventListener('gamepaddisconnected', this._onDisconnected);
            // 初始扫描
            this.updateDevices();
        }

        onGamepadConnected(gamepad) {
            if (!this.connectedGamepad) {
                this.connectedGamepad = gamepad;
            }
        }

        onGamepadDisconnected(gamepad) {
            if (this.connectedGamepad && this.connectedGamepad.index === gamepad.index) {
                this.connectedGamepad = null;
            }
        }

        updateDevices() {
            const pads = navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads?.();
            if (!pads) return;
            for (let i = 0; i < pads.length; i++) {
                const pad = pads[i];
                if (pad) {
                    if (!this.connectedGamepad) this.connectedGamepad = pad;
                }
            }
        }

        getConnectedGamepad() {
            this.updateDevices();
            return this.connectedGamepad;
        }

        getState() {
            const pad = this.getConnectedGamepad();
            if (!pad) {
                return {
                    left: false,
                    right: false,
                    down: false,
                    rotateCW: false,
                    rotateCCW: false,
                    pause: false,
                    reset: false,
                    musicToggle: false,
                    softDrop: false,
                    hardDrop: false
                };
            }
            const b = pad.buttons;
            const a = pad.axes;
            const dz = this.deadzone;
            const lx = a[0] || 0;
            const ly = a[1] || 0;
            const rx = a[2] || 0;
            // const ry = a[3] || 0;
            return {
                left: lx < -dz || (b[14]?.pressed),
                right: lx > dz || (b[15]?.pressed),
                down: ly > dz || (b[13]?.pressed),
                rotateCW: rx > dz || (b[2]?.pressed),   // X
                rotateCCW: rx < -dz || (b[3]?.pressed), // Y
                pause: (b[9]?.pressed && (b[9]?.value ?? 0) > 0.5),  // Start（需按下）
                reset: (b[8]?.pressed && (b[8]?.value ?? 0) > 0.5),  // Back（需按下）
                musicToggle: (b[4]?.pressed) || (b[5]?.pressed), // LB/RB
                softDrop: (b[0]?.pressed), // A
                hardDrop: (b[7]?.pressed) || (b[1]?.pressed) // RT优先，其次B（可选）
            };
        }
    }

    global.GamepadController = GamepadController;
})(window);
