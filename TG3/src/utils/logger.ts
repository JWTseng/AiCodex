import { config } from '@/config/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(context?: string) {
    this.level = config.features.debug ? LogLevel.DEBUG : LogLevel.WARN;
    this.prefix = context ? `[${context}]` : '[TetrisWorld]';
  }

  debug(...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(`🔧 ${this.prefix}`, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`ℹ️ ${this.prefix}`, ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`⚠️ ${this.prefix}`, ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`❌ ${this.prefix}`, ...args);
    }
  }

  // 性能测量
  time(label: string): void {
    if (config.features.debug) {
      console.time(`⏱️ ${this.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (config.features.debug) {
      console.timeEnd(`⏱️ ${this.prefix} ${label}`);
    }
  }

  // 游戏事件日志
  gameEvent(event: string, data?: unknown): void {
    this.info(`🎮 ${event}`, data);
  }

  // 音频事件日志
  audioEvent(event: string, data?: unknown): void {
    this.debug(`🔊 ${event}`, data);
  }

  // 网络请求日志
  apiEvent(event: string, data?: unknown): void {
    this.debug(`🌐 ${event}`, data);
  }
}

// 创建全局日志实例
export const logger = new Logger();

// 为不同模块创建专用日志器
export const createLogger = (context: string) => new Logger(context);

// 游戏特定日志器
export const gameLogger = createLogger('Game');
export const audioLogger = createLogger('Audio');
export const apiLogger = createLogger('API');
export const inputLogger = createLogger('Input');

// 向后兼容的全局日志器
if (typeof window !== 'undefined') {
  (window as any).GameLogger = {
    event: gameLogger.gameEvent.bind(gameLogger),
    debug: gameLogger.debug.bind(gameLogger),
    error: gameLogger.error.bind(gameLogger)
  };
}