import { describe, it, expect } from 'vitest';
import { config, isDevelopment } from '@/config/environment';

describe('Environment Configuration', () => {
  it('should have valid API configuration', () => {
    expect(config.api.baseUrl).toBeTruthy();
    expect(config.api.baseUrl).toMatch(/^https?:\/\//);
  });

  it('should have sensible game defaults', () => {
    expect(config.game.maxScore).toBeGreaterThan(0);
    expect(config.game.maxLevel).toBeGreaterThan(0);
    expect(config.game.comboWindow).toBeGreaterThan(0);
    expect(config.game.maxScore).toBe(9999999);
  });

  it('should have valid audio configuration', () => {
    expect(config.audio.defaultMasterVolume).toBeGreaterThanOrEqual(0);
    expect(config.audio.defaultMasterVolume).toBeLessThanOrEqual(1);
    expect(config.audio.defaultMusicVolume).toBeGreaterThanOrEqual(0);
    expect(config.audio.defaultMusicVolume).toBeLessThanOrEqual(1);
    expect(config.audio.defaultSfxVolume).toBeGreaterThanOrEqual(0);
    expect(config.audio.defaultSfxVolume).toBeLessThanOrEqual(1);
  });

  it('should have boolean feature flags', () => {
    expect(typeof config.features.analytics).toBe('boolean');
    expect(typeof config.features.debug).toBe('boolean');
    expect(typeof config.features.betaFeatures).toBe('boolean');
  });

  it('should detect environment correctly', () => {
    expect(typeof isDevelopment).toBe('boolean');
  });
});