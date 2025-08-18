import type { GameState, Piece, InputState } from '@/types/game';
import { GameBoard } from './board';
import { PieceFactory } from './pieces';
import { ScoringSystem } from './scoring';

export class GameEngine {
  private board: GameBoard;
  private pieceFactory: PieceFactory;
  private scoring: ScoringSystem;
  private state: GameState;
  private lastMoveTime: number = 0;
  private lastDropTime: number = 0;
  private gameStartTime: number = 0;

  constructor() {
    this.board = new GameBoard();
    this.pieceFactory = new PieceFactory();
    this.scoring = new ScoringSystem();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      board: this.board.getVisibleGrid(),
      currentPiece: null,
      nextPiece: null,
      score: 0,
      level: 0,
      lines: 0,
      gameState: 'menu'
    };
  }

  startGame(): void {
    this.board.clear();
    this.scoring.reset();
    this.gameStartTime = Date.now();
    
    this.state = {
      ...this.createInitialState(),
      currentPiece: this.pieceFactory.createPiece(),
      nextPiece: this.pieceFactory.createPiece(),
      gameState: 'playing'
    };
    
    this.lastDropTime = Date.now();
  }

  pauseGame(): void {
    if (this.state.gameState === 'playing') {
      this.state.gameState = 'paused';
    } else if (this.state.gameState === 'paused') {
      this.state.gameState = 'playing';
      this.lastDropTime = Date.now(); // 重置计时器
    }
  }

  update(deltaTime: number, input: InputState): GameState {
    if (this.state.gameState !== 'playing') {
      return { ...this.state };
    }

    // 更新连击计时器
    this.scoring.updateComboTimer(deltaTime);

    // 处理输入
    this.handleInput(input);

    // 自动下降
    this.handleAutoDrop();

    // 更新状态
    this.updateGameState();

    return { ...this.state };
  }

  private handleInput(input: InputState): void {
    if (!this.state.currentPiece) return;

    const now = Date.now();
    
    // 控制输入频率
    if (now - this.lastMoveTime < 100) return;

    let moved = false;
    let newPiece = { ...this.state.currentPiece };

    // 左右移动
    if (input.left) {
      newPiece.position.x--;
      if (this.board.isValidPosition(newPiece)) {
        this.state.currentPiece = newPiece;
        moved = true;
      }
    } else if (input.right) {
      newPiece.position.x++;
      if (this.board.isValidPosition(newPiece)) {
        this.state.currentPiece = newPiece;
        moved = true;
      }
    }

    // 旋转
    if (input.rotateCW || input.rotateCCW) {
      const rotated = this.pieceFactory.rotatePiece(
        this.state.currentPiece, 
        input.rotateCW
      );
      
      if (this.board.isValidPosition(rotated)) {
        this.state.currentPiece = rotated;
        moved = true;
      }
    }

    // 软下降
    if (input.down) {
      this.softDrop();
      moved = true;
    }

    // 硬下降
    if (input.hardDrop) {
      this.hardDrop();
      moved = true;
    }

    if (moved) {
      this.lastMoveTime = now;
    }
  }

  private handleAutoDrop(): void {
    const now = Date.now();
    const dropSpeed = this.scoring.getDropSpeed(this.state.level);
    
    if (now - this.lastDropTime > dropSpeed) {
      this.softDrop();
      this.lastDropTime = now;
    }
  }

  private softDrop(): void {
    if (!this.state.currentPiece) return;

    const newPiece = {
      ...this.state.currentPiece,
      position: {
        ...this.state.currentPiece.position,
        y: this.state.currentPiece.position.y + 1
      }
    };

    if (this.board.isValidPosition(newPiece)) {
      this.state.currentPiece = newPiece;
      // 软下降得分
      this.scoring.addDropScore(1, false);
    } else {
      this.lockPiece();
    }
  }

  private hardDrop(): void {
    if (!this.state.currentPiece) return;

    const dropDistance = this.board.getDropDistance(this.state.currentPiece);
    
    this.state.currentPiece.position.y += dropDistance;
    
    // 硬下降得分
    this.scoring.addDropScore(dropDistance, true);
    
    this.lockPiece();
  }

  private lockPiece(): void {
    if (!this.state.currentPiece) return;

    // 放置方块
    this.board.placePiece(this.state.currentPiece);

    // 检查消行
    const clearedLines = this.board.clearLines();
    
    if (clearedLines.length > 0) {
      // 计算分数
      this.scoring.addLinesScore(clearedLines.length, this.state.level);
      
      // 更新等级
      const newLevel = this.scoring.calculateLevel(this.scoring.getLines());
      this.scoring.setLevel(newLevel);
    }

    // 检查游戏结束
    if (this.board.isGameOver()) {
      this.state.gameState = 'gameOver';
      return;
    }

    // 生成新方块
    this.spawnNextPiece();
  }

  private spawnNextPiece(): void {
    this.state.currentPiece = this.state.nextPiece;
    this.state.nextPiece = this.pieceFactory.createPiece();

    // 检查新方块是否能放置
    if (this.state.currentPiece && !this.board.isValidPosition(this.state.currentPiece)) {
      this.state.gameState = 'gameOver';
    }
  }

  private updateGameState(): void {
    this.state.board = this.board.getVisibleGrid();
    this.state.score = this.scoring.getScore();
    this.state.level = this.scoring.getLevel();
    this.state.lines = this.scoring.getLines();
  }

  getGameDuration(): number {
    return Math.floor((Date.now() - this.gameStartTime) / 1000);
  }

  getComboInfo() {
    return this.scoring.getComboInfo();
  }

  getCurrentState(): GameState {
    return { ...this.state };
  }

  // 调试方法
  debugPrint(): void {
    console.log('=== Game State ===');
    console.log(`Score: ${this.state.score}, Level: ${this.state.level}, Lines: ${this.state.lines}`);
    console.log(`State: ${this.state.gameState}`);
    this.board.debugPrint();
  }
}