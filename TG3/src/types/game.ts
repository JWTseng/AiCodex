// 游戏核心类型定义
export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: PieceType;
  shape: number[][];
  position: Position;
  color: string;
}

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface GameState {
  board: number[][];
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  score: number;
  level: number;
  lines: number;
  gameState: 'menu' | 'playing' | 'paused' | 'gameOver';
}

export interface ScoreData {
  score: number;
  level: number;
  lines: number;
  duration: number;
  timestamp: number;
  playerName?: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  rotateCW: boolean;
  rotateCCW: boolean;
  hardDrop: boolean;
  softDrop: boolean;
  pause: boolean;
  reset: boolean;
  enter: boolean;
  musicToggle: boolean;
}

export interface AudioConfig {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export interface ComboInfo {
  count: number;
  multiplier: number;
  isClutch: boolean;
  timeRemaining: number;
}