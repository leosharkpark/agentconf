/** Spatial grid for nearby-agent queries (avoids O(n²) conversation checks). */

const CELL = 3.5;

export const buildAgentGrid = (agents) => {
  const grid = new Map();
  for (const a of agents) {
    if (a.isStatic) continue;
    const cx = Math.floor(a.x / CELL);
    const cy = Math.floor(a.y / CELL);
    const key = `${cx},${cy}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(a);
  }
  return grid;
};

export const forEachNeighborPair = (grid, fn) => {
  const seen = new Set();
  for (const cell of grid.values()) {
    for (let i = 0; i < cell.length; i++) {
      for (let j = i + 1; j < cell.length; j++) {
        const a = cell[i];
        const b = cell[j];
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fn(a, b);
      }
    }
  }
  for (const [key, cell] of grid) {
    const [cx, cy] = key.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const other = grid.get(`${cx + dx},${cy + dy}`);
        if (!other) continue;
        for (const a of cell) {
          for (const b of other) {
            const pair = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
            if (seen.has(pair)) continue;
            seen.add(pair);
            fn(a, b);
          }
        }
      }
    }
  }
};
