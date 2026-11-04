/**
 * Damas Brasileiras board logic: 8x8 checkers mapped to 32 dark squares.
 */

import type { BoardState, Piece } from './types';

/**
 * Convert a linear index (0-31) to row/col on the 8x8 board.
 * Only dark squares are indexed; each row has 4 playable positions.
 * Row 0 = top (black pieces), row 7 = bottom (white pieces).
 */
export function indexToRowCol(index: number): { row: number; col: number } {
  const row = Math.floor(index / 4);
  const colInRow = index % 4;
  // Dark squares occur where (row + col) % 2 === 1.
  // When row is even, dark cols are 1,3,5,7 → col = 2*colInRow + 1
  // When row is odd, dark cols are 0,2,4,6 → col = 2*colInRow
  const col = row % 2 === 0 ? 2 * colInRow + 1 : 2 * colInRow;
  return { row, col };
}

/**
 * Convert row/col back to linear index (0-31).
 * Returns -1 if the position is not a valid dark square.
 */
export function rowColToIndex(row: number, col: number): number {
  if (!isValidRowCol(row, col)) return -1;
  const colInRow = row % 2 === 0 ? (col - 1) / 2 : col / 2;
  return row * 4 + colInRow;
}

/**
 * Check whether a linear index is within the valid board range [0, 31].
 */
export function isValidPosition(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= 31;
}

/**
 * Check whether row/col represents a valid dark square on the 8x8 board.
 */
function isValidRowCol(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row <= 7 &&
    col >= 0 &&
    col <= 7 &&
    (row + col) % 2 === 1
  );
}

/**
 * Create the initial board state for Damas Brasileiras.
 * 12 black pieces on rows 0-2, 12 white pieces on rows 5-7, all on dark squares.
 * The middle two rows (3-4) are empty.
 */
export function createInitialBoard(): BoardState {
  const board: BoardState = new Array<Piece | null>(32).fill(null);

  for (let i = 0; i < 32; i++) {
    const { row } = indexToRowCol(i);
    if (row <= 2) {
      board[i] = { player: 'black', isKing: false };
    } else if (row >= 5) {
      board[i] = { player: 'white', isKing: false };
    }
    // rows 3-4 remain null
  }

  return board;
}