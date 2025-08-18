import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/core/game-engine';
import type { InputState } from '@/types/game';

describe('GameEngine', () => {
  let engine: GameEngine;
  let inputState: InputState;
  
  beforeEach(() => {
    engine = new GameEngine();
    inputState = {
      left: false,
      right: false,
      down: false,
      rotateCW: false,
      rotateCCW: false,
      hardDrop: false,
      softDrop: false,
      pause: false,
      reset: false,
      enter: false,
      musicToggle: false
    };
  });

  it('should initialize with correct state', () => {
    const state = engine.getCurrentState();
    expect(state.gameState).toBe('menu');
    expect(state.score).toBe(0);
    expect(state.level).toBe(0);
    expect(state.lines).toBe(0);
    expect(state.currentPiece).toBeNull();
    expect(state.nextPiece).toBeNull();
  });

  it('should start game correctly', () => {
    engine.startGame();
    const state = engine.getCurrentState();
    
    expect(state.gameState).toBe('playing');
    expect(state.currentPiece).not.toBeNull();
    expect(state.nextPiece).not.toBeNull();
    expect(state.board).toBeDefined();
    expect(state.board.length).toBe(20); // Visible board height
  });

  it('should pause and resume game', () => {
    engine.startGame();
    
    engine.pauseGame();
    expect(engine.getCurrentState().gameState).toBe('paused');
    
    engine.pauseGame();
    expect(engine.getCurrentState().gameState).toBe('playing');
  });

  it('should handle input when playing', () => {
    engine.startGame();
    const initialState = engine.getCurrentState();
    
    // Test left movement
    inputState.left = true;
    const newState = engine.update(16, inputState);
    
    expect(newState.gameState).toBe('playing');
    expect(newState.currentPiece).not.toBeNull();
  });

  it('should not process input when paused', () => {
    engine.startGame();
    engine.pauseGame();
    
    const pausedState = engine.getCurrentState();
    inputState.left = true;
    const newState = engine.update(16, inputState);
    
    expect(newState.gameState).toBe('paused');
    expect(JSON.stringify(newState)).toBe(JSON.stringify(pausedState));
  });

  it('should track game duration', () => {
    engine.startGame();
    
    // Simulate time passing
    setTimeout(() => {
      const duration = engine.getGameDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    }, 10);
  });

  it('should provide combo information', () => {
    const comboInfo = engine.getComboInfo();
    
    expect(typeof comboInfo.count).toBe('number');
    expect(typeof comboInfo.multiplier).toBe('number');
    expect(typeof comboInfo.isClutch).toBe('boolean');
    expect(typeof comboInfo.timeRemaining).toBe('number');
  });
});