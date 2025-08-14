# Classic Tetris (Web)

A strict, retro-style Tetris implemented in **vanilla HTML/CSS/JS**. No frameworks, runs offline by simply opening `index.html` in a modern desktop browser.

## How to Run
- Unzip and open `index.html` in Chrome/Edge/Firefox. Target 60 FPS at 1080p.

## Rules & Features
- **Board**: 10×22 grid (top 2 hidden). Coordinates start at (0,0) top-left.
- **Pieces**: I, O, T, S, Z, J, L. Memoryless 1/7 RNG. No Hold, Ghost, T-Spin, B2B, Combo.
- **Spawn**: 4×4 box anchor at (x=3, y=0). Collision at spawn → Game Over.
- **Rotation**: **No kicks**. If rotation collides/out-of-bounds, it fails.
- **Gravity**: NES-like (frames per cell): 48,43,38,33,28,23,18,13,8,6,5,5,5,4,4,4,3,3,3,2×10,1.
- **Level Up**: +1 every 10 total cleared lines (starting from 0).
- **Lock**: Immediate when a down step collides. No lock delay/drag.
- **Line Clear**: Flash ~200ms (inputs+gravity paused) → collapse → spawn next.
- **Scoring**: 1/2/3/4 lines = 40/100/300/1200 × (Level+1). Soft drop +1 per cell.
- **Input**: ←/→ move (DAS 150ms, ARR 50ms), ↓ soft drop, Z CCW, ↑/X CW, P pause, R restart, M mute.
- **UI**: Score/High/Level/Lines, Next (1 piece), settings (pixel size, color mode, volume/mute, CRT, key rebinding).
- **Persistence**: High score & settings saved in `localStorage`.
- **Accessibility**: Color-blind palette option; keyboard-only playable.

## State Machine (line clear bug prevention)
```
Lock (merge to field, activePiece = null)
→ detect full rows
→ LineFlash (200ms; no input/gravity)
→ Collapse (static grid only)
→ Spawn next piece
```

## Files
```
index.html
styles.css
main.js
assets/
  font/ (placeholder)
  audio/ (placeholder)
README.md
```

