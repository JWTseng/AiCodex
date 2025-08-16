/**
 * 统一触觉反馈模块
 * - 使用 navigator.vibrate 作为回退
 * - 如手柄支持 vibrationActuator，优先使用
 */
(function(global){
    class Haptics {
        constructor() {}

        vibratePattern(pattern) {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        }

        rumbleGamepad(gamepad, duration = 100, strong = 0.5, weak = 0.5) {
            if (!gamepad) return;
            const actuator = gamepad.vibrationActuator;
            if (actuator && actuator.playEffect) {
                actuator.playEffect('dual-rumble', {
                    duration,
                    strongMagnitude: strong,
                    weakMagnitude: weak
                }).catch(()=>{});
            } else {
                // 回退：设备振动
                this.vibratePattern([duration]);
            }
        }

        trigger(type, gamepad) {
            switch(type) {
                case 'move':
                    this.rumbleGamepad(gamepad, 50, 0.3, 0.3);
                    break;
                case 'rotate':
                    this.rumbleGamepad(gamepad, 60, 0.35, 0.35);
                    break;
                case 'drop':
                    this.rumbleGamepad(gamepad, 100, 0.4, 0.4);
                    break;
                case 'lineClear':
                    // 模式振动
                    this.vibratePattern([100, 50, 100, 50]);
                    this.rumbleGamepad(gamepad, 200, 0.5, 0.5);
                    break;
                case 'gameOver':
                    this.vibratePattern([200, 100, 200, 100, 200]);
                    this.rumbleGamepad(gamepad, 400, 0.6, 0.6);
                    break;
            }
        }
    }

    global.Haptics = Haptics;
})(window);
