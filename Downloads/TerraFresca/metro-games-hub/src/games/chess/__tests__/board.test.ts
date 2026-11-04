import { describe, it, expect } from 'vitest';
import {
  squareToIndex,
  indexToSquare,
  getFile,
  getRank,
  createInitialBoard,
} from '../board';

describe('squareToIndex', () => {
  it('returns 0 for a1 (file=0, rank=0)', () => {
    expect(squareToIndex(0, 0)).toBe(0);
  });

  it('returns 7 for h1 (file=7, rank=0)', () => {
    expect(squareToIndex(7, 0)).toBe(7);
  });

  it('returns 56 for a8 (file=0, rank=7)', () => {
    expect(squareToIndex(0, 7)).toBe(56);
  });

  it('returns 63 for h8 (file=7, rank=7)', () => {
    expect(squareToIndex(7, 7)).toBe(63);
  });

  it('returns 28 for e4 (file=4, rank=3)', () => {
    expect(squareToIndex(4, 3)).toBe(28);
  });
});

describe('indexToSquare', () => {
  it('roundtrips correctly for index 0 (a1)', () => {
    expect(indexToSquare(0)).toEqual({ file: 0, rank: 0 });
  });

  it('roundtrips correctly for index 7 (h1)', () => {
    expect(indexToSquare(7)).toEqual({ file: 7, rank: 0 });
  });

  it('roundtrips correctly for index 56 (a8)', () => {
    expect(indexToSquare(56)).toEqual({ file: 0, rank: 7 });
  });

  it('roundtrips correctly for index 63 (h8)', () => {
    expect(indexToSquare(63)).toEqual({ file: 7, rank: 7 });
  });

  it('roundtrips correctly for index 28 (e4)', () => {
    expect(indexToSquare(28)).toEqual({ file: 4, rank: 3 });
  });

  it('roundtrips through squareToIndex for all indices', () => {
    for (let i = 0; i < 64; i++) {
      const square = indexToSquare(i);
      expect(squareToIndex(square.file, square.rank)).toBe(i);
    }
  });
});

describe('getFile', () => {
  it('returns correct file for various indices', () => {
    expect(getFile(0)).toBe(0);
    expect(getFile(7)).toBe(7);
    expect(getFile(8)).toBe(0);
    expect(getFile(28)).toBe(4);
    expect(getFile(63)).toBe(7);
  });
});

describe('getRank', () => {
  it('returns correct rank for various indices', () => {
    expect(getRank(0)).toBe(0);
    expect(getRank(7)).toBe(0);
    expect(getRank(8)).toBe(1);
    expect(getRank(28)).toBe(3);
    expect(getRank(56)).toBe(7);
    expect(getRank(63)).toBe(7);
  });
});

describe('createInitialBoard', () => {
  it('has exactly 64 elements', () => {
    const board = createInitialBoard();
    expect(board).toHaveLength(64);
  });

  it('places exactly 32 pieces', () => {
    const board = createInitialBoard();
    const pieces = board.filter((p) => p !== null);
    expect(pieces).toHaveLength(32);
  });

  it('places 16 white pieces and 16 black pieces', () => {
    const board = createInitialBoard();
    const whitePieces = board.filter((p) => p !== null && p.player === 'white');
    const blackPieces = board.filter((p) => p !== null && p.player === 'black');
    expect(whitePieces).toHaveLength(16);
    expect(blackPieces).toHaveLength(16);
  });

  it('places correct piece types at key positions', () => {
    const board = createInitialBoard();

    // a1 = white rook
    expect(board[squareToIndex(0, 0)]).toEqual({
      type: 'rook',
      player: 'white',
      hasMoved: false,
    });

    // e1 = white king
    expect(board[squareToIndex(4, 0)]).toEqual({
      type: 'king',
      player: 'white',
      hasMoved: false,
    });

    // d1 = white queen
    expect(board[squareToIndex(3, 0)]).toEqual({
      type: 'queen',
      player: 'white',
      hasMoved: false,
    });

    // d8 = black queen
    expect(board[squareToIndex(3, 7)]).toEqual({
      type: 'queen',
      player: 'black',
      hasMoved: false,
    });

    // e8 = black king
    expect(board[squareToIndex(4, 7)]).toEqual({
      type: 'king',
      player: 'black',
      hasMoved: false,
    });

    // h8 = black rook
    expect(board[squareToIndex(7, 7)]).toEqual({
      type: 'rook',
      player: 'black',
      hasMoved: false,
    });

    // b1 = white knight
    expect(board[squareToIndex(1, 0)]).toEqual({
      type: 'knight',
      player: 'white',
      hasMoved: false,
    });

    // c1 = white bishop
    expect(board[squareToIndex(2, 0)]).toEqual({
      type: 'bishop',
      player: 'white',
      hasMoved: false,
    });
  });

  it('places pawns on correct ranks', () => {
    const board = createInitialBoard();

    // White pawns on rank 1
    for (let file = 0; file < 8; file++) {
      expect(board[squareToIndex(file, 1)]).toEqual({
        type: 'pawn',
        player: 'white',
        hasMoved: false,
      });
    }

    // Black pawns on rank 6
    for (let file = 0; file < 8; file++) {
      expect(board[squareToIndex(file, 6)]).toEqual({
        type: 'pawn',
        player: 'black',
        hasMoved: false,
      });
    }
  });

  it('all pieces have hasMoved set to false', () => {
    const board = createInitialBoard();
    const pieces = board.filter((p) => p !== null);
    for (const piece of pieces) {
      expect(piece.hasMoved).toBe(false);
    }
  });

  it('empty squares are null', () => {
    const board = createInitialBoard();

    // Ranks 2-5 should be entirely empty
    for (let rank = 2; rank <= 5; rank++) {
      for (let file = 0; file < 8; file++) {
        expect(board[squareToIndex(file, rank)]).toBeNull();
      }
    }
  });
});
