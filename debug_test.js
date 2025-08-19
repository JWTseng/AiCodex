// Debug clearLines
const grid = Array(24).fill(null).map(() => Array(10).fill(0));

// Fill bottom row
const bottomRow = grid.length - 1;
for (let x = 0; x < 10; x++) {
  grid[bottomRow][x] = 1;
}

console.log('Bottom row before:', grid[bottomRow]);
console.log('Check every cell !== 0:', grid[bottomRow].every(cell => cell !== 0));

// Simulate clearLines logic
const clearedLines = [];
for (let y = grid.length - 1; y >= 0; y--) {
  console.log(`Row ${y}:`, grid[y], 'every !== 0:', grid[y].every(cell => cell !== 0));
  if (grid[y].every(cell => cell !== 0)) {
    clearedLines.push(y);
    console.log(`Cleared line: ${y}`);
    break; // Just check first one
  }
}

console.log('Cleared lines:', clearedLines);