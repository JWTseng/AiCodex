import { describe, it, expect } from 'vitest';
import { PieceFactory, PIECE_SHAPES, PIECE_COLORS } from '@/core/pieces';
import type { PieceType } from '@/types/game';

describe('PieceFactory', () => {
  let factory: PieceFactory;
  
  beforeEach(() => {
    factory = new PieceFactory();
  });

  it('should create valid pieces', () => {
    const piece = factory.createPiece();
    
    expect(piece.type).toBeDefined();
    expect(piece.shape).toBeDefined();
    expect(piece.position).toEqual({ x: 3, y: 0 });
    expect(piece.color).toBeDefined();
  });

  it('should create all piece types eventually', () => {
    const createdTypes = new Set<PieceType>();
    
    // Create enough pieces to get all types (7 types * 2 bags = 14 pieces)
    for (let i = 0; i < 14; i++) {
      const piece = factory.createPiece();
      createdTypes.add(piece.type);
    }
    
    expect(createdTypes.size).toBe(7);
    expect(createdTypes.has('I')).toBe(true);
    expect(createdTypes.has('O')).toBe(true);
    expect(createdTypes.has('T')).toBe(true);
    expect(createdTypes.has('S')).toBe(true);
    expect(createdTypes.has('Z')).toBe(true);
    expect(createdTypes.has('J')).toBe(true);
    expect(createdTypes.has('L')).toBe(true);
  });

  it('should rotate pieces correctly', () => {
    const piece = factory.createPiece();
    const rotated = factory.rotatePiece(piece, true);
    
    expect(rotated.type).toBe(piece.type);
    expect(rotated.color).toBe(piece.color);
    expect(rotated.position).toEqual(piece.position);
    // Shape should change for most pieces (except O)
    if (piece.type !== 'O') {
      expect(JSON.stringify(rotated.shape)).not.toBe(JSON.stringify(piece.shape));
    }
  });

  it('should have correct piece dimensions', () => {
    const iPiece = { type: 'I' as PieceType, shape: PIECE_SHAPES.I[0], position: { x: 0, y: 0 }, color: PIECE_COLORS.I };
    const oPiece = { type: 'O' as PieceType, shape: PIECE_SHAPES.O[0], position: { x: 0, y: 0 }, color: PIECE_COLORS.O };
    
    expect(factory.getPieceWidth(iPiece)).toBe(4);
    expect(factory.getPieceHeight(iPiece)).toBe(1);
    
    expect(factory.getPieceWidth(oPiece)).toBe(2);
    expect(factory.getPieceHeight(oPiece)).toBe(2);
  });

  it('should have valid piece shapes', () => {
    Object.values(PIECE_SHAPES).forEach(shapes => {
      expect(shapes.length).toBeGreaterThan(0);
      shapes.forEach(shape => {
        expect(Array.isArray(shape)).toBe(true);
        expect(shape.length).toBeGreaterThan(0);
        shape.forEach(row => {
          expect(Array.isArray(row)).toBe(true);
          expect(row.length).toBeGreaterThan(0);
          row.forEach(cell => {
            expect([0, 1]).toContain(cell);
          });
        });
      });
    });
  });

  it('should have valid piece colors', () => {
    Object.values(PIECE_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});