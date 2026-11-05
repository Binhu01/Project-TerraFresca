/**
 * Chess integration tests: complete game flow simulations covering
 * Scholar's Mate, stalemate, castling, en passant, promotion,
 * and insufficient material draw conditions.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  getValidMoves,
  makeMove,
  isCheckmate,
  isStalemate,
  isInsufficientMaterial,
} from '../gameState';
import type { GameState } from '../types';
import { squareToIndex } from '../board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand for squareToIndex using file (0-7) and rank (0-7). */
function sq(file: number, rank: number): number {
  return squareToIndex(file, rank);
}

/** Apply a sequence of moves to a game state and return the final state. */
function playMoves(
  state: GameState,
  moves: Array<{ from: number; to: number }>,
): GameState {
  let current = state;
  for (const move of moves) {
    current = makeMove(current, move.from, move.to);
  }
  return current;
}

/** Assert that a move is legal in the given state. */
function assertLegal(state: GameState, from: number, to: number): void {
  const validMoves = getValidMoves(state, from);
  expect(validMoves).toContain(to);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Chess Integration Tests', () => {
  // -------------------------------------------------------------------------
  // 1. Scholar's Mate (xeque-mate em 4 lances)
  // -------------------------------------------------------------------------
  describe("Scholar's Mate", () => {
    it('delivers checkmate in 4 moves: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#', () => {
      let state = createInitialState();

      // 1. e4
      assertLegal(state, sq(4, 1), sq(4, 3));
      state = makeMove(state, sq(4, 1), sq(4, 3));
      expect(state.currentPlayer).toBe('black');

      // 1... e5
      assertLegal(state, sq(4, 6), sq(4, 4));
      state = makeMove(state, sq(4, 6), sq(4, 4));

      // 2. Bc4
      assertLegal(state, sq(5, 0), sq(2, 3));
      state = makeMove(state, sq(5, 0), sq(2, 3));

      // 2... Nc6
      assertLegal(state, sq(1, 7), sq(2, 5));
      state = makeMove(state, sq(1, 7), sq(2, 5));

      // 3. Qh5
      assertLegal(state, sq(3, 0), sq(7, 4));
      state = makeMove(state, sq(3, 0), sq(7, 4));

      // 3... Nf6?? (the blunder)
      assertLegal(state, sq(6, 7), sq(5, 5));
      state = makeMove(state, sq(6, 7), sq(5, 5));

      // 4. Qxf7#
      assertLegal(state, sq(7, 4), sq(5, 6));
      state = makeMove(state, sq(7, 4), sq(5, 6));

      // Verify checkmate
      expect(isCheckmate(state)).toBe(true);
      expect(state.winner).toBe('white');
      expect(state.gameOverReason).toBe('checkmate');
      expect(state.phase).toBe('game-over');

      // Verify last move record
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      expect(lastMove.isCheckmate).toBe(true);
      expect(lastMove.isCheck).toBe(true);
      expect(lastMove.capturedPiece).not.toBeNull();
      expect(lastMove.capturedPiece?.type).toBe('pawn');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Stalemate (empate por afogamento)
  // -------------------------------------------------------------------------
  describe('Stalemate', () => {
    it('detects stalemate when player has no legal moves but is not in check', () => {
      // White K on c7, White Q on b6, Black K on a8. Black to move.
      // a7: attacked by Qb6 diagonally (b6->a7: |1-0|=1, |5-6|=1)
      // b8: attacked by Kc7 diagonally (c7->b8: |2-1|=1, |6-7|=1)
      // b7: attacked by Qb6 (same file) and Kc7 (adjacent)
      // a8 itself: NOT attacked by Qb6 (not same rank/file/diagonal) or Kc7 (distance 2,1)
      // So black king has zero legal moves and is NOT in check = stalemate.
      const board = new Array(64).fill(null);
      board[sq(2, 6)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(1, 5)] = { type: 'queen' as const, player: 'white' as const, hasMoved: true };
      board[sq(0, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      const state: GameState = {
        board,
        currentPlayer: 'black',
        phase: 'selecting',
        selectedSquare: null,
        validMoves: [],
        moveHistory: [],
        winner: null,
        halfmoveClock: 0,
        enPassantTarget: null,
        gameOverReason: null,
      };

      expect(isStalemate(state)).toBe(true);
      expect(isCheckmate(state)).toBe(false);
      expect(state.winner).toBeNull();
    });

    it('sets gameOverReason to stalemate when reached via makeMove', () => {
      // White K on c7, Q on b5. Black K on a8. White plays Qb5->b6.
      // After Qb6: same stalemate position as above.
      const board = new Array(64).fill(null);
      board[sq(2, 6)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(1, 4)] = { type: 'queen' as const, player: 'white' as const, hasMoved: true };
      board[sq(0, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      const preState: GameState = {
        board,
        currentPlayer: 'white',
        phase: 'selecting',
        selectedSquare: null,
        validMoves: [],
        moveHistory: [],
        winner: null,
        halfmoveClock: 0,
        enPassantTarget: null,
        gameOverReason: null,
      };

      // White plays Qb5 -> Qb6
      assertLegal(preState, sq(1, 4), sq(1, 5));
      const stalemateState = makeMove(preState, sq(1, 4), sq(1, 5));

      expect(isStalemate(stalemateState)).toBe(true);
      expect(stalemateState.gameOverReason).toBe('stalemate');
      expect(stalemateState.winner).toBeNull();
      expect(stalemateState.phase).toBe('game-over');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Castling (roque completo)
  // -------------------------------------------------------------------------
  describe('Castling', () => {
    it('performs kingside castling for white and verifies rook relocation', () => {
      let state = createInitialState();

      // Clear f1 bishop, g1 knight, and e-pawn
      state = playMoves(state, [
        { from: sq(4, 1), to: sq(4, 3) }, // 1. e4
        { from: sq(4, 6), to: sq(4, 4) }, // 1... e5
        { from: sq(6, 0), to: sq(5, 2) }, // 2. Nf3
        { from: sq(6, 7), to: sq(5, 5) }, // 2... Nf6
        { from: sq(5, 0), to: sq(2, 3) }, // 3. Bc4
        { from: sq(5, 7), to: sq(2, 4) }, // 3... Bc5
      ]);

      // White castles kingside: e1 -> g1
      const e1 = sq(4, 0);
      const g1 = sq(6, 0);
      assertLegal(state, e1, g1);
      state = makeMove(state, e1, g1);

      // King on g1
      expect(state.board[g1]?.type).toBe('king');
      expect(state.board[g1]?.player).toBe('white');
      expect(state.board[g1]?.hasMoved).toBe(true);

      // Rook relocated h1 -> f1
      expect(state.board[sq(7, 0)]).toBeNull();
      expect(state.board[sq(5, 0)]?.type).toBe('rook');
      expect(state.board[sq(5, 0)]?.player).toBe('white');
      expect(state.board[sq(5, 0)]?.hasMoved).toBe(true);

      // Original king square empty
      expect(state.board[e1]).toBeNull();

      // Move record
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      expect(lastMove.isCastling).toBe('kingside');
    });

    it('performs queenside castling and verifies rook relocation', () => {
      // Construct a minimal position where white can castle queenside
      const board = new Array(64).fill(null);
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: false };
      board[sq(0, 0)] = { type: 'rook' as const, player: 'white' as const, hasMoved: false };
      // b1, c1, d1 must be empty (they are by default)

      const state: GameState = {
        board,
        currentPlayer: 'white',
        phase: 'selecting',
        selectedSquare: null,
        validMoves: [],
        moveHistory: [],
        winner: null,
        halfmoveClock: 0,
        enPassantTarget: null,
        gameOverReason: null,
      };

      // Verify queenside castling is available
      const kingMoves = getValidMoves(state, sq(4, 0));
      expect(kingMoves).toContain(sq(2, 0));

      // Execute queenside castling
      const afterCastle = makeMove(state, sq(4, 0), sq(2, 0));

      // King on c1
      expect(afterCastle.board[sq(2, 0)]?.type).toBe('king');
      expect(afterCastle.board[sq(2, 0)]?.player).toBe('white');
      expect(afterCastle.board[sq(2, 0)]?.hasMoved).toBe(true);

      // Rook relocated a1 -> d1
      expect(afterCastle.board[sq(0, 0)]).toBeNull();
      expect(afterCastle.board[sq(3, 0)]?.type).toBe('rook');
      expect(afterCastle.board[sq(3, 0)]?.player).toBe('white');
      expect(afterCastle.board[sq(3, 0)]?.hasMoved).toBe(true);

      // Original king square empty
      expect(afterCastle.board[sq(4, 0)]).toBeNull();

      // Move record
      const lastMove = afterCastle.moveHistory[afterCastle.moveHistory.length - 1];
      expect(lastMove.isCastling).toBe('queenside');
    });
  });

  // -------------------------------------------------------------------------
  // 4. En passant
  // -------------------------------------------------------------------------
  describe('En passant', () => {
    it('captures en passant after double pawn push', () => {
      let state = createInitialState();

      // 1. e4 a5
      state = makeMove(state, sq(4, 1), sq(4, 3));
      state = makeMove(state, sq(0, 6), sq(0, 4));
      // 2. e5 d5 (double push sets en passant target on d6)
      state = makeMove(state, sq(4, 3), sq(4, 4));
      state = makeMove(state, sq(3, 6), sq(3, 4));

      // Verify en passant target set
      expect(state.enPassantTarget).toBe(sq(3, 5));

      // 3. exd6 e.p.
      const e5 = sq(4, 4);
      const d6 = sq(3, 5);
      assertLegal(state, e5, d6);
      state = makeMove(state, e5, d6);

      // Capturing pawn on d6
      expect(state.board[d6]?.type).toBe('pawn');
      expect(state.board[d6]?.player).toBe('white');

      // Captured pawn removed from d5
      expect(state.board[sq(3, 4)]).toBeNull();

      // Move record
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      expect(lastMove.isEnPassant).toBe(true);
      expect(lastMove.capturedPiece).not.toBeNull();
      expect(lastMove.capturedPiece?.type).toBe('pawn');
    });

    it('does not allow en passant after one move delay', () => {
      let state = createInitialState();

      // 1. e4 a5
      state = makeMove(state, sq(4, 1), sq(4, 3));
      state = makeMove(state, sq(0, 6), sq(0, 4));
      // 2. e5 d5
      state = makeMove(state, sq(4, 3), sq(4, 4));
      state = makeMove(state, sq(3, 6), sq(3, 4));
      expect(state.enPassantTarget).toBe(sq(3, 5));

      // 3. Nf3 (different move clears en passant)
      state = makeMove(state, sq(6, 0), sq(5, 2));
      state = makeMove(state, sq(6, 7), sq(5, 5));

      expect(state.enPassantTarget).toBeNull();

      // En passant no longer available
      const validMoves = getValidMoves(state, sq(4, 4));
      expect(validMoves).not.toContain(sq(3, 5));
    });
  });

  // -------------------------------------------------------------------------
  // 5. Promotion
  // -------------------------------------------------------------------------
  describe('Promotion', () => {
    it('auto-promotes pawn to queen on reaching last rank', () => {
      const board = new Array(64).fill(null);
      board[sq(4, 6)] = { type: 'pawn' as const, player: 'white' as const, hasMoved: true };
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: false };
      board[sq(7, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      const state: GameState = {
        board,
        currentPlayer: 'white',
        phase: 'selecting',
        selectedSquare: null,
        validMoves: [],
        moveHistory: [],
        winner: null,
        halfmoveClock: 0,
        enPassantTarget: null,
        gameOverReason: null,
      };

      const e7 = sq(4, 6);
      const e8 = sq(4, 7);
      assertLegal(state, e7, e8);
      const newState = makeMove(state, e7, e8);

      // Promoted to queen
      expect(newState.board[e8]?.type).toBe('queen');
      expect(newState.board[e8]?.player).toBe('white');
      expect(newState.board[e8]?.hasMoved).toBe(true);

      // Move record
      const lastMove = newState.moveHistory[newState.moveHistory.length - 1];
      expect(lastMove.promotion).toBe('queen');
    });

    it('triggers promoting phase during promotion move', () => {
      const board = new Array(64).fill(null);
      board[sq(4, 6)] = { type: 'pawn' as const, player: 'white' as const, hasMoved: true };
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: false };
      board[sq(7, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      const state: GameState = {
        board,
        currentPlayer: 'white',
        phase: 'selecting',
        selectedSquare: null,
        validMoves: [],
        moveHistory: [],
        winner: null,
        halfmoveClock: 0,
        enPassantTarget: null,
        gameOverReason: null,
      };

      const newState = makeMove(state, sq(4, 6), sq(4, 7));
      expect(newState.phase).toBe('promoting');
    });
  });

  // -------------------------------------------------------------------------
  // 6. Insufficient material
  // -------------------------------------------------------------------------
  describe('Insufficient material', () => {
    it('detects K vs K as insufficient material', () => {
      const board = new Array(64).fill(null);
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(4, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      expect(isInsufficientMaterial(board)).toBe(true);
    });

    it('sets gameOverReason to insufficient-material via makeMove', () => {
      const board = new Array(64).fill(null);
      board[sq(3, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(3, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      const state: GameState = {
        board,
        currentPlayer: 'white',
        phase: 'selecting',
        selectedSquare: null,
        validMoves: [],
        moveHistory: [],
        winner: null,
        halfmoveClock: 0,
        enPassantTarget: null,
        gameOverReason: null,
      };

      const d1 = sq(3, 0);
      const validMoves = getValidMoves(state, d1);
      expect(validMoves.length).toBeGreaterThan(0);

      const newState = makeMove(state, d1, validMoves[0]);
      expect(newState.gameOverReason).toBe('insufficient-material');
      expect(newState.winner).toBeNull();
      expect(newState.phase).toBe('game-over');
    });

    it('detects K+B vs K as insufficient material', () => {
      const board = new Array(64).fill(null);
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(2, 2)] = { type: 'bishop' as const, player: 'white' as const, hasMoved: true };
      board[sq(4, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      expect(isInsufficientMaterial(board)).toBe(true);
    });

    it('detects K+N vs K as insufficient material', () => {
      const board = new Array(64).fill(null);
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(3, 2)] = { type: 'knight' as const, player: 'white' as const, hasMoved: true };
      board[sq(4, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      expect(isInsufficientMaterial(board)).toBe(true);
    });

    it('does NOT flag K+R vs K as insufficient material', () => {
      const board = new Array(64).fill(null);
      board[sq(4, 0)] = { type: 'king' as const, player: 'white' as const, hasMoved: true };
      board[sq(0, 3)] = { type: 'rook' as const, player: 'white' as const, hasMoved: true };
      board[sq(4, 7)] = { type: 'king' as const, player: 'black' as const, hasMoved: true };

      expect(isInsufficientMaterial(board)).toBe(false);
    });
  });
});
