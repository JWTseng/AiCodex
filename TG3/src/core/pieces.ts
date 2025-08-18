import type { Piece, PieceType, Position } from '@/types/game';

// 方块形状定义 (经典NES俄罗斯方块)
export const PIECE_SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[1,1,1,1]],
    [[1],[1],[1],[1]]
  ],
  O: [
    [[1,1],[1,1]]
  ],
  T: [
    [[0,1,0],[1,1,1]],
    [[1,0],[1,1],[1,0]],
    [[1,1,1],[0,1,0]],
    [[0,1],[1,1],[0,1]]
  ],
  S: [
    [[0,1,1],[1,1,0]],
    [[1,0],[1,1],[0,1]]
  ],
  Z: [
    [[1,1,0],[0,1,1]],
    [[0,1],[1,1],[1,0]]
  ],
  J: [
    [[1,0,0],[1,1,1]],
    [[1,1],[1,0],[1,0]],
    [[1,1,1],[0,0,1]],
    [[0,1],[0,1],[1,1]]
  ],
  L: [
    [[0,0,1],[1,1,1]],
    [[1,0],[1,0],[1,1]],
    [[1,1,1],[1,0,0]],
    [[1,1],[0,1],[0,1]]
  ]
};

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00ffff', // 青色
  O: '#ffff00', // 黄色
  T: '#800080', // 紫色
  S: '#00ff00', // 绿色
  Z: '#ff0000', // 红色
  J: '#0000ff', // 蓝色
  L: '#ff8000'  // 橙色
};

export class PieceFactory {
  private bag: PieceType[] = [];
  
  constructor() {
    this.refillBag();
  }

  private refillBag(): void {
    this.bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Fisher-Yates 洗牌算法
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  createPiece(): Piece {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    
    const type = this.bag.pop()!;
    
    return {
      type,
      shape: PIECE_SHAPES[type][0], // 初始旋转状态
      position: { x: 3, y: 0 }, // 标准起始位置
      color: PIECE_COLORS[type]
    };
  }

  rotatePiece(piece: Piece, clockwise: boolean = true): Piece {
    const shapes = PIECE_SHAPES[piece.type];
    const currentIndex = shapes.findIndex(shape => 
      JSON.stringify(shape) === JSON.stringify(piece.shape)
    );
    
    let nextIndex: number;
    if (clockwise) {
      nextIndex = (currentIndex + 1) % shapes.length;
    } else {
      nextIndex = (currentIndex - 1 + shapes.length) % shapes.length;
    }
    
    return {
      ...piece,
      shape: shapes[nextIndex]
    };
  }

  getPieceWidth(piece: Piece): number {
    return piece.shape[0]?.length || 0;
  }

  getPieceHeight(piece: Piece): number {
    return piece.shape.length;
  }
}