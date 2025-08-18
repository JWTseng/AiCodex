import { describe, it, expect, beforeEach } from 'vitest';
import { GameBoard, BOARD_WIDTH, BOARD_HEIGHT } from '@/core/board';
import type { Piece } from '@/types/game';

describe('GameBoard', () => {
  let board: GameBoard;
  
  beforeEach(() => {
    board = new GameBoard();
  });

  it('should create empty board with correct dimensions', () => {
    const grid = board.getVisibleGrid();
    expect(grid).toHaveLength(BOARD_HEIGHT);
    expect(grid[0]).toHaveLength(BOARD_WIDTH);
    
    // Check all cells are empty
    grid.forEach(row => {
      row.forEach(cell => {
        expect(cell).toBe(0);
      });
    });
  });

  it('should validate piece positions correctly', () => {
    const testPiece: Piece = {
      type: 'I',
      shape: [[1, 1, 1, 1]],
      position: { x: 3, y: 0 },
      color: '#00ffff'
    };
    
    // Valid position
    expect(board.isValidPosition(testPiece)).toBe(true);
    
    // Out of bounds left
    testPiece.position.x = -1;
    expect(board.isValidPosition(testPiece)).toBe(false);
    
    // Out of bounds right  
    testPiece.position.x = 8;
    expect(board.isValidPosition(testPiece)).toBe(false);
  });

  it('should place pieces correctly', () => {
    const testPiece: Piece = {
      type: 'O',
      shape: [[1, 1], [1, 1]],
      position: { x: 4, y: 14 }, // 调整到可见区域内
      color: '#ffff00'
    };
    
    board.placePiece(testPiece);
    const grid = board.getVisibleGrid();
    
    expect(grid[14][4]).toBe(1);
    expect(grid[14][5]).toBe(1);
    expect(grid[15][4]).toBe(1);
    expect(grid[15][5]).toBe(1);
  });

  it('should clear complete lines', () => {
    // Get the internal grid reference for testing
    const fullGrid = (board as any)._getGridReference();
    const bottomRow = fullGrid.length - 1;
    
    // Fill bottom row completely
    for (let x = 0; x < BOARD_WIDTH; x++) {
      fullGrid[bottomRow][x] = 1;
    }
    
    const clearedLines = board.clearLines();
    expect(clearedLines).toHaveLength(1);
    expect(clearedLines[0]).toBe(bottomRow);
    
    // Check line was cleared
    const newGrid = board.getVisibleGrid();
    expect(newGrid[BOARD_HEIGHT - 1].every(cell => cell === 0)).toBe(true);
  });

  it('should calculate drop distance correctly', () => {
    const testPiece: Piece = {
      type: 'I',
      shape: [[1], [1], [1], [1]],
      position: { x: 5, y: 0 },
      color: '#00ffff'
    };
    
    const distance = board.getDropDistance(testPiece);
    expect(distance).toBe(BOARD_HEIGHT - 4); // Height minus piece height
  });
});