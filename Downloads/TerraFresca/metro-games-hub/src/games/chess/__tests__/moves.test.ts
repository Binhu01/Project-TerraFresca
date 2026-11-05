import { describe, it, expect } from 'vitest';
import type { Board, Piece } from '../types';
import { squareToIndex } from '../board';
import {
  isSquareAttacked,
  getPawnMoves,
  getKnightMoves,
  getBishopMoves,
  getRookMoves,
  getQueenMoves,
  getKingMoves,
  getCastlingMoves,
  getPseudoLegalMoves,
} from '../moves';

function emptyBoard(): Board {
  return new Array(64).fill(null);
}

function placePiece(board: Board, file: number, rank: number, piece: Piece): void {
  board[squareToIndex(file, rank)] = piece;
}

function idx(file: number, rank: number): number {
  return squareToIndex(file, rank);
}

describe('isSquareAttacked', () => {
  it('detects pawn attack from white diagonal', () => {
    const board = emptyBoard();
    placePiece(board, 3, 1, { type: 'pawn', player: 'white', hasMoved: false });
    // White pawn on d2 attacks e3
    expect(isSquareAttacked(board, idx(4, 2), 'white')).toBe(true);
  });

  it('does not detect pawn attack in wrong direction', () => {
    const board = emptyBoard();
    placePiece(board, 3, 1, { type: 'pawn', player: 'white', hasMoved: false });
    // White pawn on d2 does NOT attack e1 (backwards)
    expect(isSquareAttacked(board, idx(4, 0), 'white')).toBe(false);
  });

  it('detects knight attack', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'knight', player: 'black', hasMoved: false });
    // Knight on d4 attacks f5 (L-shape)
    expect(isSquareAttacked(board, idx(5, 4), 'black')).toBe(true);
  });

  it('detects sliding bishop attack along diagonal', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'bishop', player: 'white', hasMoved: false });
    expect(isSquareAttacked(board, idx(3, 3), 'white')).toBe(true);
  });

  it('sliding attack blocked by intervening piece', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'rook', player: 'white', hasMoved: false });
    placePiece(board, 3, 0, { type: 'pawn', player: 'black', hasMoved: false });
    // Rook on a1 blocked by pawn on d1, cannot attack e1
    expect(isSquareAttacked(board, idx(4, 0), 'white')).toBe(false);
  });

  it('detects king adjacency attack', () => {
    const board = emptyBoard();
    placePiece(board, 4, 4, { type: 'king', player: 'black', hasMoved: true });
    expect(isSquareAttacked(board, idx(5, 5), 'black')).toBe(true);
  });

  it('does not detect king attack beyond adjacency', () => {
    const board = emptyBoard();
    placePiece(board, 4, 4, { type: 'king', player: 'black', hasMoved: true });
    expect(isSquareAttacked(board, idx(6, 6), 'black')).toBe(false);
  });
});

describe('getPawnMoves', () => {
  it('moves forward one square when empty', () => {
    const board = emptyBoard();
    placePiece(board, 3, 1, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getPawnMoves(board, idx(3, 1), 'white', null);
    expect(moves).toContain(idx(3, 2));
  });

  it('moves forward two squares from starting rank', () => {
    const board = emptyBoard();
    placePiece(board, 3, 1, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getPawnMoves(board, idx(3, 1), 'white', null);
    expect(moves).toContain(idx(3, 3));
  });

  it('cannot move forward when blocked', () => {
    const board = emptyBoard();
    placePiece(board, 3, 1, { type: 'pawn', player: 'white', hasMoved: false });
    placePiece(board, 3, 2, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getPawnMoves(board, idx(3, 1), 'white', null);
    expect(moves).not.toContain(idx(3, 2));
    expect(moves).not.toContain(idx(3, 3));
  });

  it('captures diagonally', () => {
    const board = emptyBoard();
    placePiece(board, 3, 2, { type: 'pawn', player: 'white', hasMoved: false });
    placePiece(board, 4, 3, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getPawnMoves(board, idx(3, 2), 'white', null);
    expect(moves).toContain(idx(4, 3));
  });

  it('cannot capture friendly piece diagonally', () => {
    const board = emptyBoard();
    placePiece(board, 3, 2, { type: 'pawn', player: 'white', hasMoved: false });
    placePiece(board, 4, 3, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getPawnMoves(board, idx(3, 2), 'white', null);
    expect(moves).not.toContain(idx(4, 3));
  });

  it('en passant capture', () => {
    const board = emptyBoard();
    placePiece(board, 4, 4, { type: 'pawn', player: 'white', hasMoved: true });
    // Black pawn just double-pushed to e5 (idx(4,4)), en passant target is e6 (idx(4,5))...
    // Actually: white pawn on e5 can capture en passant on d6 or f6 if black pawn just double pushed
    // Let's set up: white pawn on e5, black pawn just moved d7->d5, enPassantTarget = d6
    const board2 = emptyBoard();
    placePiece(board2, 4, 4, { type: 'pawn', player: 'white', hasMoved: true });
    placePiece(board2, 3, 4, { type: 'pawn', player: 'black', hasMoved: true });
    const epTarget = idx(3, 5); // d6 - the square behind the black pawn
    const moves = getPawnMoves(board2, idx(4, 4), 'white', epTarget);
    expect(moves).toContain(idx(3, 5));
  });

  it('black pawn moves downward', () => {
    const board = emptyBoard();
    placePiece(board, 3, 6, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getPawnMoves(board, idx(3, 6), 'black', null);
    expect(moves).toContain(idx(3, 5));
    expect(moves).toContain(idx(3, 4));
  });

  it('cannot move backward', () => {
    const board = emptyBoard();
    placePiece(board, 3, 4, { type: 'pawn', player: 'white', hasMoved: true });
    const moves = getPawnMoves(board, idx(3, 4), 'white', null);
    expect(moves).not.toContain(idx(3, 3));
  });
});

describe('getKnightMoves', () => {
  it('generates all 8 L-shaped moves in open board', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'knight', player: 'white', hasMoved: false });
    const moves = getKnightMoves(board, idx(3, 3), 'white');
    expect(moves).toHaveLength(8);
  });

  it('filters off-board moves for corner knight', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'knight', player: 'white', hasMoved: false });
    const moves = getKnightMoves(board, idx(0, 0), 'white');
    expect(moves).toHaveLength(2);
  });

  it('cannot land on friendly piece', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'knight', player: 'white', hasMoved: false });
    placePiece(board, 5, 4, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getKnightMoves(board, idx(3, 3), 'white');
    expect(moves).not.toContain(idx(5, 4));
  });

  it('can capture opponent piece', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'knight', player: 'white', hasMoved: false });
    placePiece(board, 5, 4, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getKnightMoves(board, idx(3, 3), 'white');
    expect(moves).toContain(idx(5, 4));
  });
});

describe('getBishopMoves', () => {
  it('slides along all four diagonals', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'bishop', player: 'white', hasMoved: false });
    const moves = getBishopMoves(board, idx(3, 3), 'white');
    // Should reach edges in all 4 diagonal directions
    expect(moves.length).toBeGreaterThan(0);
    expect(moves).toContain(idx(0, 0)); // a1
    expect(moves).toContain(idx(7, 7)); // h8
  });

  it('stops at blocking piece', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'bishop', player: 'white', hasMoved: false });
    placePiece(board, 3, 3, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getBishopMoves(board, idx(0, 0), 'white');
    expect(moves).not.toContain(idx(3, 3));
    expect(moves).not.toContain(idx(4, 4));
  });

  it('captures opponent and stops', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'bishop', player: 'white', hasMoved: false });
    placePiece(board, 3, 3, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getBishopMoves(board, idx(0, 0), 'white');
    expect(moves).toContain(idx(3, 3));
    expect(moves).not.toContain(idx(4, 4));
  });
});

describe('getRookMoves', () => {
  it('slides along all four orthogonal directions', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'rook', player: 'white', hasMoved: false });
    const moves = getRookMoves(board, idx(3, 3), 'white');
    expect(moves).toContain(idx(0, 3)); // left edge
    expect(moves).toContain(idx(7, 3)); // right edge
    expect(moves).toContain(idx(3, 0)); // bottom edge
    expect(moves).toContain(idx(3, 7)); // top edge
  });

  it('blocked by friendly piece', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'rook', player: 'white', hasMoved: false });
    placePiece(board, 4, 0, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getRookMoves(board, idx(0, 0), 'white');
    expect(moves).not.toContain(idx(4, 0));
    expect(moves).not.toContain(idx(5, 0));
  });

  it('captures opponent and stops', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'rook', player: 'white', hasMoved: false });
    placePiece(board, 4, 0, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getRookMoves(board, idx(0, 0), 'white');
    expect(moves).toContain(idx(4, 0));
    expect(moves).not.toContain(idx(5, 0));
  });
});

describe('getQueenMoves', () => {
  it('combines bishop and rook movement', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'queen', player: 'white', hasMoved: false });
    const moves = getQueenMoves(board, idx(3, 3), 'white');
    // Orthogonal
    expect(moves).toContain(idx(0, 3));
    expect(moves).toContain(idx(3, 0));
    // Diagonal
    expect(moves).toContain(idx(0, 0));
    expect(moves).toContain(idx(7, 7));
  });
});

describe('getKingMoves', () => {
  it('moves to all 8 adjacent squares', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'king', player: 'white', hasMoved: false });
    const moves = getKingMoves(board, idx(3, 3), 'white');
    expect(moves).toHaveLength(8);
  });

  it('filters off-board moves for corner king', () => {
    const board = emptyBoard();
    placePiece(board, 0, 0, { type: 'king', player: 'white', hasMoved: false });
    const moves = getKingMoves(board, idx(0, 0), 'white');
    expect(moves).toHaveLength(3);
  });

  it('cannot move onto friendly piece', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'king', player: 'white', hasMoved: false });
    placePiece(board, 4, 4, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getKingMoves(board, idx(3, 3), 'white');
    expect(moves).not.toContain(idx(4, 4));
  });

  it('can capture opponent piece', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'king', player: 'white', hasMoved: false });
    placePiece(board, 4, 4, { type: 'pawn', player: 'black', hasMoved: false });
    const moves = getKingMoves(board, idx(3, 3), 'white');
    expect(moves).toContain(idx(4, 4));
  });
});

describe('getCastlingMoves', () => {
  function setupCastlingBoard(player: 'white' | 'black'): Board {
    const board = emptyBoard();
    const rank = player === 'white' ? 0 : 7;
    placePiece(board, 4, rank, { type: 'king', player, hasMoved: false });
    placePiece(board, 0, rank, { type: 'rook', player, hasMoved: false });
    placePiece(board, 7, rank, { type: 'rook', player, hasMoved: false });
    return board;
  }

  it('valid kingside castling for white', () => {
    const board = setupCastlingBoard('white');
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).toContain(idx(6, 0)); // g1
  });

  it('valid queenside castling for white', () => {
    const board = setupCastlingBoard('white');
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).toContain(idx(2, 0)); // c1
  });

  it('valid kingside castling for black', () => {
    const board = setupCastlingBoard('black');
    const moves = getCastlingMoves(board, idx(4, 7), 'black');
    expect(moves).toContain(idx(6, 7)); // g8
  });

  it('blocked by piece between king and rook', () => {
    const board = setupCastlingBoard('white');
    placePiece(board, 5, 0, { type: 'bishop', player: 'white', hasMoved: false });
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).not.toContain(idx(6, 0)); // kingside blocked
    expect(moves).toContain(idx(2, 0)); // queenside still valid
  });

  it('king in check prevents castling', () => {
    const board = setupCastlingBoard('white');
    // Place an enemy rook attacking the king
    placePiece(board, 4, 7, { type: 'rook', player: 'black', hasMoved: false });
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).toHaveLength(0);
  });

  it('king passes through attacked square prevents castling', () => {
    const board = setupCastlingBoard('white');
    // Enemy rook attacks f1 (square king passes through for kingside)
    placePiece(board, 5, 7, { type: 'rook', player: 'black', hasMoved: false });
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).not.toContain(idx(6, 0)); // kingside blocked
  });

  it('hasMoved on king prevents castling', () => {
    const board = setupCastlingBoard('white');
    board[idx(4, 0)] = { type: 'king', player: 'white', hasMoved: true };
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).toHaveLength(0);
  });

  it('hasMoved on rook prevents that side castling', () => {
    const board = setupCastlingBoard('white');
    board[idx(7, 0)] = { type: 'rook', player: 'white', hasMoved: true };
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    expect(moves).not.toContain(idx(6, 0)); // kingside blocked
    expect(moves).toContain(idx(2, 0)); // queenside still valid
  });

  it('queenside b-file only needs to be empty, not unattacked', () => {
    const board = setupCastlingBoard('white');
    // Attack b1 but not c1 or d1
    placePiece(board, 1, 7, { type: 'rook', player: 'black', hasMoved: false });
    const moves = getCastlingMoves(board, idx(4, 0), 'white');
    // b1 is attacked but only needs to be empty; c1 and d1 must be unattacked
    expect(moves).toContain(idx(2, 0)); // queenside still valid since b1 is empty and only c1/d1 need attack check
  });
});

describe('getPseudoLegalMoves', () => {
  it('returns empty array for empty square', () => {
    const board = emptyBoard();
    const moves = getPseudoLegalMoves(board, idx(3, 3), null);
    expect(moves).toHaveLength(0);
  });

  it('dispatches pawn moves correctly', () => {
    const board = emptyBoard();
    placePiece(board, 3, 1, { type: 'pawn', player: 'white', hasMoved: false });
    const moves = getPseudoLegalMoves(board, idx(3, 1), null);
    expect(moves).toContain(idx(3, 2));
    expect(moves).toContain(idx(3, 3));
  });

  it('dispatches knight moves correctly', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'knight', player: 'white', hasMoved: false });
    const moves = getPseudoLegalMoves(board, idx(3, 3), null);
    expect(moves).toHaveLength(8);
  });

  it('dispatches king moves including castling', () => {
    const board = emptyBoard();
    placePiece(board, 4, 0, { type: 'king', player: 'white', hasMoved: false });
    placePiece(board, 0, 0, { type: 'rook', player: 'white', hasMoved: false });
    placePiece(board, 7, 0, { type: 'rook', player: 'white', hasMoved: false });
    const moves = getPseudoLegalMoves(board, idx(4, 0), null);
    // Normal king moves + castling destinations
    expect(moves).toContain(idx(6, 0)); // kingside castle
    expect(moves).toContain(idx(2, 0)); // queenside castle
  });

  it('deduplicates moves', () => {
    const board = emptyBoard();
    placePiece(board, 3, 3, { type: 'queen', player: 'white', hasMoved: false });
    const moves = getPseudoLegalMoves(board, idx(3, 3), null);
    const uniqueMoves = [...new Set(moves)];
    expect(moves).toHaveLength(uniqueMoves.length);
  });
});
