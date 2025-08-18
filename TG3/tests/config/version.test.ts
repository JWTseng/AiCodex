import { describe, it, expect } from 'vitest';
import { CURRENT_VERSION, VERSION_HISTORY, type VersionInfo } from '@/config/version';

describe('Version Configuration', () => {
  it('should have valid current version info', () => {
    expect(CURRENT_VERSION.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(CURRENT_VERSION.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(CURRENT_VERSION.features).toBeInstanceOf(Array);
    expect(CURRENT_VERSION.improvements).toBeInstanceOf(Array);
    expect(CURRENT_VERSION.bugFixes).toBeInstanceOf(Array);
  });

  it('should have required features', () => {
    const features = CURRENT_VERSION.features;
    expect(features.length).toBeGreaterThan(0);
    
    features.forEach(feature => {
      expect(feature).toHaveProperty('title');
      expect(feature).toHaveProperty('description');
      expect(feature).toHaveProperty('type');
      expect(['new', 'improved', 'experimental']).toContain(feature.type);
    });
  });

  it('should have version history', () => {
    expect(VERSION_HISTORY).toBeInstanceOf(Array);
    expect(VERSION_HISTORY.length).toBeGreaterThan(0);
    expect(VERSION_HISTORY[0]).toBe(CURRENT_VERSION);
  });

  it('should have proper version format', () => {
    VERSION_HISTORY.forEach((version: VersionInfo) => {
      expect(version.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(version.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(version.releaseDate)).toBeInstanceOf(Date);
    });
  });

  it('should have comprehensive feature coverage', () => {
    const features = CURRENT_VERSION.features;
    const featureTypes = features.map(f => f.type);
    
    // Should have at least one of each type
    expect(featureTypes).toContain('new');
    expect(featureTypes).toContain('improved');
    
    // Should cover major areas
    const titles = features.map(f => f.title.toLowerCase());
    const hasArchitecture = titles.some(t => t.includes('架构') || t.includes('typescript'));
    const hasTests = titles.some(t => t.includes('测试'));
    const hasScoring = titles.some(t => t.includes('分数') || t.includes('连击'));
    
    expect(hasArchitecture).toBe(true);
    expect(hasTests).toBe(true);
    expect(hasScoring).toBe(true);
  });
});