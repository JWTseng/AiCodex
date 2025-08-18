import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, createLogger, gameLogger } from '@/utils/logger';

// Mock console methods
const mockConsole = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn()
};

Object.assign(console, mockConsole);

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create logger with context', () => {
    const contextLogger = createLogger('TestContext');
    expect(contextLogger).toBeDefined();
  });

  it('should log game events', () => {
    gameLogger.gameEvent('GAME_START', { level: 1 });
    expect(console.info).toHaveBeenCalledWith(
      'ℹ️ [Game]',
      '🎮 GAME_START', 
      { level: 1 }
    );
  });

  it('should respect debug level configuration', () => {
    logger.debug('Debug message');
    // Debug should be called if debug is enabled
    if (process.env.VITE_ENABLE_DEBUG === 'true') {
      expect(console.debug).toHaveBeenCalled();
    }
  });

  it('should always log warnings and errors', () => {
    logger.warn('Warning message');
    logger.error('Error message');
    
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});