import type { ComboInfo } from '@/types/game';

// 经典NES俄罗斯方块计分规则
export const SCORE_VALUES = {
  SINGLE: 40,
  DOUBLE: 100,
  TRIPLE: 300,
  TETRIS: 1200,
  SOFT_DROP: 1,
  HARD_DROP: 2
} as const;

export class ScoringSystem {
  private score: number = 0;
  private level: number = 0;
  private lines: number = 0;
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private readonly comboWindow: number = 3000; // 3秒连击窗口

  constructor() {
    this.reset();
  }

  reset(): void {
    this.score = 0;
    this.level = 0;
    this.lines = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  addLinesScore(linesCleared: number, currentLevel: number): number {
    if (linesCleared === 0) {
      this.resetCombo();
      return 0;
    }

    // 基础分数
    let baseScore = 0;
    switch (linesCleared) {
      case 1: baseScore = SCORE_VALUES.SINGLE; break;
      case 2: baseScore = SCORE_VALUES.DOUBLE; break;
      case 3: baseScore = SCORE_VALUES.TRIPLE; break;
      case 4: baseScore = SCORE_VALUES.TETRIS; break;
      default: baseScore = SCORE_VALUES.SINGLE * linesCleared;
    }

    // 等级乘数
    const levelMultiplier = currentLevel + 1;
    
    // 连击处理
    this.updateCombo();
    const comboMultiplier = this.getComboMultiplier();
    
    // 计算最终分数
    let finalScore = Math.floor(baseScore * levelMultiplier * comboMultiplier);
    
    this.score += finalScore;
    this.lines += linesCleared;
    
    // 限制最大分数
    if (this.score > 9999999) {
      finalScore -= (this.score - 9999999); // 调整返回值
      this.score = 9999999;
    }

    return finalScore;
  }

  addDropScore(distance: number, isHard: boolean): number {
    const dropScore = distance * (isHard ? SCORE_VALUES.HARD_DROP : SCORE_VALUES.SOFT_DROP);
    this.score += dropScore;
    
    if (this.score > 9999999) {
      this.score = 9999999;
    }
    
    return dropScore;
  }

  private updateCombo(): void {
    this.comboCount++;
    this.comboTimer = this.comboWindow;
  }

  private resetCombo(): void {
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  private getComboMultiplier(): number {
    if (this.comboCount <= 1) return 1.0;
    if (this.comboCount === 2) return 1.2;
    if (this.comboCount === 3) return 1.5;
    if (this.comboCount >= 4) return 2.0;
    return 1.0;
  }

  updateComboTimer(deltaTime: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.resetCombo();
      }
    }
  }

  getComboInfo(): ComboInfo {
    return {
      count: this.comboCount,
      multiplier: this.getComboMultiplier(),
      isClutch: this.comboTimer > 0 && this.comboTimer < 1000, // 最后1秒算压哨
      timeRemaining: Math.max(0, this.comboTimer)
    };
  }

  calculateLevel(totalLines: number): number {
    return Math.floor(totalLines / 10);
  }

  getScore(): number {
    return this.score;
  }

  getLevel(): number {
    return this.level;
  }

  getLines(): number {
    return this.lines;
  }

  setLevel(level: number): void {
    this.level = level;
  }

  // 获取下降速度 (毫秒)
  getDropSpeed(level: number): number {
    // 经典NES速度曲线
    const speeds = [
      887, 820, 753, 686, 619, 552, 469, 368, 285, 184,
      167, 151, 134, 117, 100, 100, 84, 84, 67, 67,
      50, 50, 50, 50, 50, 50, 50, 50, 50, 17
    ];
    
    return speeds[Math.min(level, speeds.length - 1)] || 17;
  }
}