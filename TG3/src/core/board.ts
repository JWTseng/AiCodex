import type { Piece, Position } from '@/types/game';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BOARD_BUFFER_HEIGHT = 4; // 顶部缓冲区

export class GameBoard {
  private grid: number[][];
  
  constructor() {
    this.grid = this.createEmptyBoard();
  }

  private createEmptyBoard(): number[][] {
    return Array(BOARD_HEIGHT + BOARD_BUFFER_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(0));
  }

  getGrid(): number[][] {
    return this.grid.map(row => [...row]); // 返回深拷贝
  }

  // 测试用：获取内部网格引用（危险，仅用于测试）
  _getGridReference(): number[][] {
    return this.grid;
  }

  getVisibleGrid(): number[][] {
    // 只返回可见区域 (不包含缓冲区)
    return this.grid.slice(BOARD_BUFFER_HEIGHT).map(row => [...row]);
  }

  isValidPosition(piece: Piece): boolean {
    const { shape, position } = piece;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y + BOARD_BUFFER_HEIGHT; // 加上缓冲区偏移
          
          // 检查边界
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= this.grid.length) {
            return false;
          }
          
          // 检查碰撞
          if (boardY >= 0 && this.grid[boardY][boardX]) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  placePiece(piece: Piece): void {
    const { shape, position } = piece;
    
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const boardX = position.x + x;
          const boardY = position.y + y + BOARD_BUFFER_HEIGHT; // 加上缓冲区偏移
          
          if (boardY >= 0 && boardY < this.grid.length && 
              boardX >= 0 && boardX < BOARD_WIDTH) {
            this.grid[boardY][boardX] = 1;
          }
        }
      }
    }
  }

  clearLines(): number[] {
    const clearedLines: number[] = [];
    
    for (let y = this.grid.length - 1; y >= 0; y--) {
      if (this.grid[y].every(cell => cell !== 0)) {
        clearedLines.push(y);
        // 移除完整行
        this.grid.splice(y, 1);
        // 在顶部添加新的空行
        this.grid.unshift(Array(BOARD_WIDTH).fill(0));
        y++; // 重新检查当前行
      }
    }
    
    return clearedLines.reverse(); // 返回从上到下的顺序
  }

  isGameOver(): boolean {
    // 检查缓冲区是否有方块 (游戏结束条件)
    for (let y = 0; y < BOARD_BUFFER_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (this.grid[y][x]) {
          return true;
        }
      }
    }
    return false;
  }

  getDropDistance(piece: Piece): number {
    let distance = 0;
    const testPiece = { ...piece, position: { ...piece.position } };
    
    while (this.isValidPosition(testPiece)) {
      distance++;
      testPiece.position.y++;
    }
    
    return Math.max(0, distance - 1); // 减去最后一次无效移动
  }

  clear(): void {
    this.grid = this.createEmptyBoard();
  }

  // 调试用：打印棋盘状态
  debugPrint(): void {
    console.log('Board state:');
    const visible = this.getVisibleGrid();
    visible.forEach((row, y) => {
      console.log(`${y.toString().padStart(2)}: ${row.map(cell => cell ? '█' : '·').join('')}`);
    });
  }
}