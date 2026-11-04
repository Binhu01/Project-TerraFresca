/**
 * Cobras e Escadas board logic: serpentine coordinate mapping and procedural generation.
 */

import { mulberry32 } from '../../shared/utils/prng';

/** Board configuration with snake and ladder positions. */
export interface BoardConfig {
  snakes: Record<number, number>; // { head: tail }
  ladders: Record<number, number>; // { base: top }
}

/**
 * Map a cell number (1-100) to its grid position using serpentine layout.
 * Row 0 = top, row 9 = bottom. Columns alternate direction per row.
 */
export function getCellPosition(cell: number): { row: number; col: number } {
  const row = 9 - Math.floor((cell - 1) / 10);
  const rowFromBottom = 9 - row;
  const colOffset = (cell - 1) % 10;
  const col = rowFromBottom % 2 === 0 ? colOffset : 9 - colOffset;
  return { row, col };
}

/**
 * Generate a deterministic board configuration from a seed.
 * Produces 8 snakes and 8 ladders respecting all placement constraints.
 */
export function generateBoard(seed: number): BoardConfig {
  const rng = mulberry32(seed);
  const usedCells = new Set<number>();
  const snakes: Record<number, number> = {};
  const ladders: Record<number, number> = {};

  const isValidSnake = (head: number, tail: number): boolean => {
    if (head === 100) return false;
    if (tail === 1) return false;
    if (Math.abs(head - tail) < 5) return false;
    if (usedCells.has(head) || usedCells.has(tail)) return false;
    return true;
  };

  const isValidLadder = (base: number, top: number): boolean => {
    if (base === 100) return false;
    if (top === 1) return false;
    if (Math.abs(top - base) < 5) return false;
    if (usedCells.has(base) || usedCells.has(top)) return false;
    return true;
  };

  // Generate 8 snakes (head > tail, going down)
  let snakeCount = 0;
  while (snakeCount < 8) {
    const head = Math.floor(rng() * 98) + 2; // 2-99, never 1 or 100
    const tail = Math.floor(rng() * 98) + 2; // 2-99
    if (head > tail && isValidSnake(head, tail)) {
      snakes[head] = tail;
      usedCells.add(head);
      usedCells.add(tail);
      snakeCount++;
    }
  }

  // Generate 8 ladders (base < top, going up)
  let ladderCount = 0;
  while (ladderCount < 8) {
    const base = Math.floor(rng() * 98) + 2; // 2-99
    const top = Math.floor(rng() * 98) + 2; // 2-99
    if (top > base && isValidLadder(base, top)) {
      ladders[base] = top;
      usedCells.add(base);
      usedCells.add(top);
      ladderCount++;
    }
  }

  return { snakes, ladders };
}
