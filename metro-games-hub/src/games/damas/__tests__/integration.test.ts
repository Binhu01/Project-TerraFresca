/**
 * Integration tests for Damas Brasileiras: complete game flow simulation
 * covering moves, captures, multi-capture chains, promotion, king movement,
 * and win conditions (capture and blockade).
 */

import { createInitialState, getValidMoves, executeMove, checkWinCondition } from '../gameState';
import type { GameState, Player, BoardState, Piece } from '../types';
import { rowColToIndex, indexToRowCol } from '../board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a custom board state from a sparse map of position -> piece. */
function buildBoard(pieces: Map<number, Piece>): BoardState {
  const board: BoardState = new Array<Piece | null>(32).fill(null);
  pieces.forEach((piece, idx) => {
    board[idx] = piece;
  });
  return board;
}

/** Create a game state with a custom board and current player. */
function makeState(
  pieces: Map<number, Piece>,
  currentPlayer: Player = 'black',
  mustCaptureFrom: number | null = null,
): GameState {
  return {
    board: buildBoard(pieces),
    currentPlayer,
    phase: mustCaptureFrom !== null ? 'moving' : 'selecting',
    selectedPiece: mustCaptureFrom,
    validMoves: [],
    mustCaptureFrom,
    winner: null,
    moveHistory: [],
  };
}

const whitePiece: Piece = { player: 'white', isKing: false };
const blackPiece: Piece = { player: 'black', isKing: false };
const whiteKing: Piece = { player: 'white', isKing: true };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Damas Brasileiras Integration', () => {
  // -------------------------------------------------------------------------
  // 1. Setup
  // -------------------------------------------------------------------------
  describe('Setup', () => {
    it('creates initial state with correct defaults', () => {
      const state = createInitialState();
      expect(state.currentPlayer).toBe('black');
      expect(state.phase).toBe('selecting');
      expect(state.selectedPiece).toBeNull();
      expect(state.mustCaptureFrom).toBeNull();
      expect(state.winner).toBeNull();
      expect(state.moveHistory).toEqual([]);

      let blackCount = 0;
      let whiteCount = 0;
      for (let i = 0; i < 32; i++) {
        const p = state.board[i];
        if (p?.player === 'black') blackCount++;
        if (p?.player === 'white') whiteCount++;
      }
      expect(blackCount).toBe(12);
      expect(whiteCount).toBe(12);
    });

    it('has valid moves available from initial state', () => {
      const state = createInitialState();
      const moves = getValidMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(state.board[m.from]?.player).toBe('black');
      }
    });
  });

  // -------------------------------------------------------------------------
  // 2. Simple moves and turn alternation
  // -------------------------------------------------------------------------
  describe('Simple moves', () => {
    it('alternates turns after simple moves', () => {
      let state = createInitialState();
      expect(state.currentPlayer).toBe('black');

      const blackMoves = getValidMoves(state);
      const simpleBlackMove = blackMoves.find((m) => m.captures.length === 0);
      expect(simpleBlackMove).toBeDefined();
      state = executeMove(state, simpleBlackMove!);
      expect(state.currentPlayer).toBe('white');

      const whiteMoves = getValidMoves(state);
      const simpleWhiteMove = whiteMoves.find((m) => m.captures.length === 0);
      expect(simpleWhiteMove).toBeDefined();
      state = executeMove(state, simpleWhiteMove!);
      expect(state.currentPlayer).toBe('black');
    });

    it('moves piece to correct destination', () => {
      let state = createInitialState();
      const moves = getValidMoves(state);
      const move = moves.find((m) => m.captures.length === 0)!;
      const fromPiece = state.board[move.from];
      state = executeMove(state, move);
      expect(state.board[move.from]).toBeNull();
      expect(state.board[move.to]).toEqual(fromPiece);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Capture scenario and mandatory capture enforcement
  // -------------------------------------------------------------------------
  describe('Capture and mandatory capture', () => {
    it('enforces mandatory capture when available', () => {
      // White at (4,1), black at (3,2). White captures toward row 0.
      // Jump from (4,1) over (3,2) landing at (2,3).
      const wIdx = rowColToIndex(4, 1);
      const bIdx = rowColToIndex(3, 2);
      const landIdx = rowColToIndex(2, 3);

      expect(wIdx).not.toBe(-1);
      expect(bIdx).not.toBe(-1);
      expect(landIdx).not.toBe(-1);

      const pieces = new Map<number, Piece>([
        [wIdx, whitePiece],
        [bIdx, blackPiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);

      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.captures.length).toBeGreaterThan(0);
      }

      const captureMove = moves.find((m) => m.to === landIdx)!;
      expect(captureMove).toBeDefined();
      const nextState = executeMove(state, captureMove);
      expect(nextState.board[bIdx]).toBeNull();
      expect(nextState.board[landIdx]?.player).toBe('white');
    });

    it('removes captured piece from board', () => {
      const wIdx = rowColToIndex(4, 1);
      const bIdx = rowColToIndex(3, 2);

      const pieces = new Map<number, Piece>([
        [wIdx, whitePiece],
        [bIdx, blackPiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);
      const captureMove = moves.find((m) => m.captures.includes(bIdx))!;
      expect(captureMove).toBeDefined();
      const nextState = executeMove(state, captureMove);

      expect(nextState.board[bIdx]).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Multi-capture chain
  // -------------------------------------------------------------------------
  describe('Multi-capture chain', () => {
    it('sets mustCaptureFrom after first capture when further captures exist', () => {
      // White at (5,0), black at (4,1) and (2,3), plus extra black at (6,1)
      // so the game doesn't end after capturing both chain targets.
      // Black at (6,1) has forward moves to (7,0) or (7,2), preventing blockade win.
      // White captures (4,1) landing at (3,2), then captures (2,3) landing at (1,4).
      const wStart = rowColToIndex(5, 0);
      const bFirst = rowColToIndex(4, 1);
      const midLand = rowColToIndex(3, 2);
      const bSecond = rowColToIndex(2, 3);
      const bExtra = rowColToIndex(6, 1);

      expect(wStart).not.toBe(-1);
      expect(bFirst).not.toBe(-1);
      expect(midLand).not.toBe(-1);
      expect(bSecond).not.toBe(-1);
      expect(bExtra).not.toBe(-1);

      const pieces = new Map<number, Piece>([
        [wStart, whitePiece],
        [bFirst, blackPiece],
        [bSecond, blackPiece],
        [bExtra, blackPiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);

      const firstCapture = moves.find((m) => m.captures.includes(bFirst))!;
      expect(firstCapture).toBeDefined();
      let nextState = executeMove(state, firstCapture);

      expect(nextState.mustCaptureFrom).toBe(midLand);
      expect(nextState.currentPlayer).toBe('white');
      expect(nextState.phase).toBe('moving');

      const chainMoves = getValidMoves(nextState);
      expect(chainMoves.length).toBeGreaterThan(0);
      const secondCapture = chainMoves.find((m) => m.captures.includes(bSecond))!;
      expect(secondCapture).toBeDefined();
      nextState = executeMove(nextState, secondCapture);

      expect(nextState.mustCaptureFrom).toBeNull();
      expect(nextState.currentPlayer).toBe('black');
      expect(nextState.phase).toBe('selecting');
    });

    it('clears mustCaptureFrom when no further captures are available', () => {
      const wStart = rowColToIndex(5, 0);
      const bTarget = rowColToIndex(4, 1);

      const pieces = new Map<number, Piece>([
        [wStart, whitePiece],
        [bTarget, blackPiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      const captureMove = moves[0];
      const nextState = executeMove(state, captureMove);

      expect(nextState.mustCaptureFrom).toBeNull();
      expect(nextState.currentPlayer).toBe('black');
    });
  });

  // -------------------------------------------------------------------------
  // 5. Promotion
  // -------------------------------------------------------------------------
  describe('Promotion', () => {
    it('promotes white piece reaching row 0 to king', () => {
      // White at (1,2) moves forward to (0,1).
      const wIdx = rowColToIndex(1, 2);
      const promoteIdx = rowColToIndex(0, 1);

      expect(wIdx).not.toBe(-1);
      expect(promoteIdx).not.toBe(-1);

      const pieces = new Map<number, Piece>([[wIdx, whitePiece]]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);
      const promoteMove = moves.find((m) => m.to === promoteIdx);
      expect(promoteMove).toBeDefined();

      const nextState = executeMove(state, promoteMove!);
      expect(nextState.board[promoteIdx]?.isKing).toBe(true);
      expect(nextState.board[promoteIdx]?.player).toBe('white');
    });

    it('promotes black piece reaching row 7 to king', () => {
      // Black at (6,1) moves forward to (7,0).
      const bIdx = rowColToIndex(6, 1);
      const promoteIdx = rowColToIndex(7, 0);

      expect(bIdx).not.toBe(-1);
      expect(promoteIdx).not.toBe(-1);

      const pieces = new Map<number, Piece>([[bIdx, blackPiece]]);
      const state = makeState(pieces, 'black');
      const moves = getValidMoves(state);
      const promoteMove = moves.find((m) => m.to === promoteIdx);
      expect(promoteMove).toBeDefined();

      const nextState = executeMove(state, promoteMove!);
      expect(nextState.board[promoteIdx]?.isKing).toBe(true);
      expect(nextState.board[promoteIdx]?.player).toBe('black');
    });
  });

  // -------------------------------------------------------------------------
  // 6. King movement
  // -------------------------------------------------------------------------
  describe('King movement', () => {
    it('allows king to move in any diagonal direction', () => {
      // White king at (3,4) - odd row, col=4.
      const kIdx = rowColToIndex(3, 4);
      expect(kIdx).not.toBe(-1);

      const pieces = new Map<number, Piece>([[kIdx, whiteKing]]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);

      expect(moves.length).toBeGreaterThan(2);

      const destRows = moves.map((m) => indexToRowCol(m.to).row);
      const hasForward = destRows.some((r) => r < 3);
      const hasBackward = destRows.some((r) => r > 3);
      expect(hasForward).toBe(true);
      expect(hasBackward).toBe(true);
    });

    it('allows king to capture in any diagonal direction', () => {
      // White king at (3,4), black at (2,3) and (4,5).
      const kIdx = rowColToIndex(3, 4);
      const bUp = rowColToIndex(2, 3);
      const bDown = rowColToIndex(4, 5);

      expect(kIdx).not.toBe(-1);
      expect(bUp).not.toBe(-1);
      expect(bDown).not.toBe(-1);

      const pieces = new Map<number, Piece>([
        [kIdx, whiteKing],
        [bUp, blackPiece],
        [bDown, blackPiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);

      expect(moves.length).toBeGreaterThan(0);
      for (const m of moves) {
        expect(m.captures.length).toBeGreaterThan(0);
      }

      const capturedIndices = moves.flatMap((m) => m.captures);
      expect(capturedIndices).toContain(bUp);
      expect(capturedIndices).toContain(bDown);
    });

    it('king slides multiple squares along a diagonal', () => {
      // White king at (0,1) on empty board. SE diagonal: (1,2),(2,3),...,(6,7).
      const kIdx = rowColToIndex(0, 1);
      expect(kIdx).not.toBe(-1);

      const pieces = new Map<number, Piece>([[kIdx, whiteKing]]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);

      const farSquare = rowColToIndex(6, 7);
      expect(farSquare).not.toBe(-1);
      const hasFarMove = moves.some((m) => m.to === farSquare);
      expect(hasFarMove).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Win by capture
  // -------------------------------------------------------------------------
  describe('Win by capture', () => {
    it('detects win when all opponent pieces are captured', () => {
      const wIdx = rowColToIndex(3, 4);
      const pieces = new Map<number, Piece>([[wIdx, whitePiece]]);
      const state = makeState(pieces, 'white');

      const winner = checkWinCondition(state);
      expect(winner).toBe('white');
    });

    it('sets game-over phase after capturing last opponent piece via executeMove', () => {
      // White at (5,0), black at (4,1). White captures last black, lands at (3,2).
      const wIdx = rowColToIndex(5, 0);
      const bIdx = rowColToIndex(4, 1);

      const pieces = new Map<number, Piece>([
        [wIdx, whitePiece],
        [bIdx, blackPiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      const captureMove = moves.find((m) => m.captures.includes(bIdx))!;
      expect(captureMove).toBeDefined();
      const nextState = executeMove(state, captureMove);

      expect(nextState.phase).toBe('game-over');
      expect(nextState.winner).toBe('white');
    });
  });

  // -------------------------------------------------------------------------
  // 8. Win by blockade
  // -------------------------------------------------------------------------
  describe('Win by blockade', () => {
    it('detects win when opponent has no legal moves', () => {
      // Black at (7,6) - at bottom edge, no forward simple moves.
      // White at (6,5) blocks the only backward-capture path (landing at (5,4)).
      // White at (5,4) occupies the capture landing square, preventing the capture.
      // Black has zero legal moves: no simple moves (last row), no valid captures.
      const bIdx = rowColToIndex(7, 6);
      const w1 = rowColToIndex(6, 5);
      const w2 = rowColToIndex(5, 4);

      expect(bIdx).not.toBe(-1);
      expect(w1).not.toBe(-1);
      expect(w2).not.toBe(-1);

      const pieces = new Map<number, Piece>([
        [bIdx, blackPiece],
        [w1, whitePiece],
        [w2, whitePiece],
      ]);
      const state = makeState(pieces, 'black');

      const winner = checkWinCondition(state);
      expect(winner).toBe('white');
    });

    it('triggers game-over via executeMove when opponent is blockaded', () => {
      // After white's move, black is left with no legal moves.
      // Black at (0,1) with white kings at (1,0) and (1,2) would be blocked,
      // but black could capture. Instead, use checkWinCondition indirectly:
      // Set up a position where white makes a simple move and afterward
      // black has zero legal moves (verified by checkWinCondition inside executeMove).
      //
      // Black at (7,6), white at (6,5) and (5,4) — black is already blockaded.
      // Add a white piece at (3,4) that can move to (2,3) (simple forward move).
      // After that move, checkWinCondition detects black is still blockaded → game-over.
      const bIdx = rowColToIndex(7, 6);
      const w1 = rowColToIndex(6, 5);
      const w2 = rowColToIndex(5, 4);
      const wMover = rowColToIndex(3, 4);
      const wDest = rowColToIndex(2, 3);

      expect(bIdx).not.toBe(-1);
      expect(w1).not.toBe(-1);
      expect(w2).not.toBe(-1);
      expect(wMover).not.toBe(-1);
      expect(wDest).not.toBe(-1);

      const pieces = new Map<number, Piece>([
        [bIdx, blackPiece],
        [w1, whitePiece],
        [w2, whitePiece],
        [wMover, whitePiece],
      ]);
      const state = makeState(pieces, 'white');
      const moves = getValidMoves(state);
      const simpleMove = moves.find((m) => m.to === wDest && m.captures.length === 0);
      expect(simpleMove).toBeDefined();

      const nextState = executeMove(state, simpleMove!);
      expect(nextState.phase).toBe('game-over');
      expect(nextState.winner).toBe('white');
    });
  });
});
