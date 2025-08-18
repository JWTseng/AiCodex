import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringSystem, SCORE_VALUES } from '@/core/scoring';

describe('ScoringSystem', () => {
  let scoring: ScoringSystem;
  
  beforeEach(() => {
    scoring = new ScoringSystem();
  });

  it('should initialize with zero values', () => {
    expect(scoring.getScore()).toBe(0);
    expect(scoring.getLevel()).toBe(0);
    expect(scoring.getLines()).toBe(0);
  });

  it('should calculate line clear scores correctly', () => {
    // Single line at level 0
    const singleScore = scoring.addLinesScore(1, 0);
    expect(singleScore).toBe(SCORE_VALUES.SINGLE * 1); // level + 1
    
    scoring.reset();
    
    // Tetris at level 5
    const tetrisScore = scoring.addLinesScore(4, 5);
    expect(tetrisScore).toBe(SCORE_VALUES.TETRIS * 6); // (level + 1)
  });

  it('should handle combo multipliers', () => {
    // First clear - no combo
    const score1 = scoring.addLinesScore(1, 0);
    expect(score1).toBe(SCORE_VALUES.SINGLE);
    
    // Second clear - 1.2x combo
    const score2 = scoring.addLinesScore(1, 0);
    expect(score2).toBe(Math.floor(SCORE_VALUES.SINGLE * 1.2));
  });

  it('should calculate level from total lines', () => {
    expect(scoring.calculateLevel(0)).toBe(0);
    expect(scoring.calculateLevel(9)).toBe(0);
    expect(scoring.calculateLevel(10)).toBe(1);
    expect(scoring.calculateLevel(25)).toBe(2);
  });

  it('should provide correct drop speeds', () => {
    expect(scoring.getDropSpeed(0)).toBe(887);
    expect(scoring.getDropSpeed(9)).toBe(184);
    expect(scoring.getDropSpeed(29)).toBe(17);
    expect(scoring.getDropSpeed(50)).toBe(17); // Max speed
  });

  it('should cap score at maximum', () => {
    // Add multiple large scores to exceed limit
    for (let i = 0; i < 10; i++) {
      scoring.addLinesScore(4, 999);
    }
    expect(scoring.getScore()).toBe(9999999);
  });

  it('should reset combo after no lines cleared', () => {
    scoring.addLinesScore(1, 0); // Start combo
    scoring.addLinesScore(1, 0); // Increase combo
    
    const comboInfo = scoring.getComboInfo();
    expect(comboInfo.count).toBe(2);
    
    scoring.addLinesScore(0, 0); // Reset combo
    const resetCombo = scoring.getComboInfo();
    expect(resetCombo.count).toBe(0);
  });
});