# Classic Tetris (Web)

A retro-style Tetris web game implemented in pure, framework-free JavaScript, HTML, and CSS. It is designed to run offline in modern desktop browsers and accurately recreates the gameplay mechanics of classic, old-school Tetris.

## How to Play

1.  Clone or download this repository.
2.  Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Edge).
3.  The game will start automatically. Use the keyboard to play.

## Features

*   **Classic Gameplay**: Adheres to retro Tetris rules, including a 10x20 visible grid, instant locking, and no wall-kicks.
*   **Authentic Controls**: Features Delayed Auto Shift (DAS) and Auto Repeat Rate (ARR) for that classic control feel.
*   **Original Scoring System**: Implements the original scoring formula where points increase with the level.
*   **Level Progression**: The game speed increases as you clear lines, following the original frame-rate-based speed curve.
*   **Procedural Audio**: All sound effects are generated in real-time using the Web Audio API for a lightweight, 8-bit chiptune feel.
*   **Line Clear Animation**: A 200ms flashing animation plays when lines are cleared, pausing the game as per classic Tetris behavior.
*   **Persistence**: Your high score and mute preference are automatically saved in your browser's `localStorage`.

## Default Controls

*   **Left/Right Arrows**: Move piece horizontally. Hold for DAS/ARR.
*   **Down Arrow**: Soft drop (hold for continuous drop).
*   **Up Arrow / X**: Rotate clockwise.
*   **Z**: Rotate counter-clockwise.
*   **P**: Pause / Resume game.
*   **R**: Restart game.
*   **M**: Mute / Unmute audio.

## Technical Details

*   **Stack**: Pure HTML5, CSS3, and modern JavaScript (ES6+).
*   **Rendering**: Rendered on an HTML `<canvas>` element.
*   **Audio**: All SFX generated procedurally with the Web Audio API. No external audio files are needed.
*   **State Management**: The game loop is time-based (using `requestAnimationFrame` and `deltaTime`) to ensure consistent speed across different monitor refresh rates.
*   **Persistence**: Uses `localStorage` to save the high score and mute settings.

## Future Improvements

While the core game is complete, future versions could include:
*   A visual settings menu to rebind keys and adjust volume.
*   Selectable color palettes, including a colorblind-friendly mode.
*   An optional CRT retro video filter.
