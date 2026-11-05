import { createInitialBoard, indexToRowCol, rowColToIndex, isValidPosition } from '../board';

describe('createInitialBoard', () => {
  const board = createInitialBoard();

  test('board has exactly 32 positions', () => {
    expect(board).toHaveLength(32);
  });

  test('initial position has 24 pieces total', () => {
    const pieces = board.filter((p) => p !== null);
    expect(pieces).toHaveLength(24);
  });

  test('12 black pieces on rows 0-2', () => {
    let blackCount = 0;
    for (let i = 0; i < 32; i++) {
      const piece = board[i];
      if (piece && piece.player === 'black') {
        const { row } = indexToRowCol(i);
        expect(row).toBeLessThanOrEqual(2);
        blackCount++;
      }
    }
    expect(blackCount).toBe(12);
  });

  test('12 white pieces on rows 5-7', () => {
    let whiteCount = 0;
    for (let i = 0; i < 32; i++) {
      const piece = board[i];
      if (piece && piece.player === 'white') {
        const { row } = indexToRowCol(i);
        expect(row).toBeGreaterThanOrEqual(5);
        whiteCount++;
      }
    }
    expect(whiteCount).toBe(12);
  });

  test('rows 3-4 are empty (null)', () => {
    for (let i = 0; i < 32; i++) {
      const { row } = indexToRowCol(i);
      if (row === 3 || row === 4) {
        expect(board[i]).toBeNull();
      }
    }
  });

  test('no piece is a king initially', () => {
    for (const piece of board) {
      if (piece) {
        expect(piece.isKing).toBe(false);
      }
    }
  });
});

describe('indexToRowCol and rowColToIndex round-trip', () => {
  test.each(Array.from({ length: 32 }, (_, i) => i))(
    'index %i round-trips correctly',
    (index) => {
      const { row, col } = indexToRowCol(index);
      expect(rowColToIndex(row, col)).toBe(index);
    }
  );

  test('index 0 maps to row 0, col 1', () => {
    expect(indexToRowCol(0)).toEqual({ row: 0, col: 1 });
  });

  test('index 3 maps to row 0, col 7', () => {
    expect(indexToRowCol(3)).toEqual({ row: 0, col: 7 });
  });

  test('index 4 maps to row 1, col 0', () => {
    expect(indexToRowCol(4)).toEqual({ row: 1, col: 0 });
  });

  test('index 31 maps to row 7, col 6', () => {
    expect(indexToRowCol(31)).toEqual({ row: 7, col: 6 });
  });

  test('all mapped positions are dark squares ((row+col) % 2 === 1)', () => {
    for (let i = 0; i < 32; i++) {
      const { row, col } = indexToRowCol(i);
      expect((row + col) % 2).toBe(1);
    }
  });
});

describe('isValidPosition', () => {
  test('accepts 0 (lower bound)', () => {
    expect(isValidPosition(0)).toBe(true);
  });

  test('accepts 31 (upper bound)', () => {
    expect(isValidPosition(31)).toBe(true);
  });

  test('rejects -1', () => {
    expect(isValidPosition(-1)).toBe(false);
  });

  test('rejects 32', () => {
    expect(isValidPosition(32)).toBe(false);
  });

  test('rejects non-integer', () => {
    expect(isValidPosition(1.5)).toBe(false);
  });
});

describe('rowColToIndex edge cases', () => {
  test('returns -1 for light square (0, 0)', () => {
    expect(rowColToIndex(0, 0)).toBe(-1);
  });

  test('returns -1 for out-of-bounds row', () => {
    expect(rowColToIndex(8, 1)).toBe(-1);
  });

  test('returns -1 for out-of-bounds col', () => {
    expect(rowColToIndex(0, 8)).toBe(-1);
  });
});
