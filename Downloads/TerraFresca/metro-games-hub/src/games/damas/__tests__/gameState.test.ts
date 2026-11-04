/**
 * Tests for Damas Brasileiras game state machine.
 */

import { describe, it, expect } from 'vitest';
import type { BoardState, GameState, Move } from '../types';
import {
  createInitialState,
  getValidMoves,
  executeMove,
  checkWinCondition,
} from '../gameState';
import { rowColToIndex } from '../board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand to build a board from a map of index -> piece descriptor. */
function makeBoard(pieces: Record<number, { player: 'white' | 'black'; isKing?: boolean }>): BoardState {
  const board: BoardState = new Array(32).fill(null);
  for (const [idx, desc] of Object.entries(pieces)) {
    board[Number(idx)] = { player: desc.player, isKing: desc.isKing ?? false };
  }
  return board;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    board: new Array(32).fill(null),
    currentPlayer: 'white',
    phase: 'selecting',
    selectedPiece: null,
    validMoves: [],
    mustCaptureFrom: null,
    winner: null,
    moveHistory: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

describe('createInitialState', () => {
  it('creates a valid initial state with black to move', () => {
    const state = createInitialState();
    expect(state.currentPlayer).toBe('black');
    expect(state.phase).toBe('selecting');
    expect(state.winner).toBeNull();
    expect(state.mustCaptureFrom).toBeNull();
    expect(state.moveHistory).toEqual([]);

    let blackCount = 0;
    let whiteCount = 0;
    for (const p of state.board) {
      if (p?.player === 'black') blackCount++;
      if (p?.player === 'white') whiteCount++;
    }
    expect(blackCount).toBe(12);
    expect(whiteCount).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// getValidMoves — simple moves
// ---------------------------------------------------------------------------

describe('getValidMoves — simple moves', () => {
  it('returns forward diagonal moves for a regular piece', () => {
    // White at row 5 col 0 (dark: (5+0)%2=1)
    // Forward diagonals for white (toward row 4): row 4 col 1 (dark: (4+1)%2=1)
    const idx = rowColToIndex(5, 0);
    expect(idx).not.toBe(-1);
    const state = makeState({
      board: makeBoard({ [idx]: { player: 'white' } }),
      currentPlayer: 'white',
    });

    const moves = getValidMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.captures).toEqual([]);
      expect(m.from).toBe(idx);
    }
  });

  it('returns no moves for a blocked piece', () => {
    // White at row 6 col 1 (dark: (6+1)%2=1)
    // Forward: row 5 col 0 and row 5 col 2 (both dark)
    const whiteIdx = rowColToIndex(6, 1);
    const block1 = rowColToIndex(5, 0);
    const block2 = rowColToIndex(5, 2);
    expect(whiteIdx).not.toBe(-1);
    expect(block1).not.toBe(-1);
    expect(block2).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [whiteIdx]: { player: 'white' },
        [block1]: { player: 'black' },
        [block2]: { player: 'black' },
      }),
      currentPlayer: 'white',
    });

    const moves = getValidMoves(state);
    const pieceMoves = moves.filter((m) => m.from === whiteIdx && m.captures.length === 0);
    expect(pieceMoves.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getValidMoves — mandatory capture
// ---------------------------------------------------------------------------

describe('getValidMoves — mandatory capture', () => {
  it('returns only captures when any piece can capture', () => {
    // White at row 4 col 1 (dark: (4+1)%2=1)
    // Black at row 3 col 2 (dark: (3+2)%2=1)
    // Landing: row 2 col 3 (dark: (2+3)%2=1)
    const whiteIdx = rowColToIndex(4, 1);
    const blackIdx = rowColToIndex(3, 2);
    const landIdx = rowColToIndex(2, 3);
    expect(whiteIdx).not.toBe(-1);
    expect(blackIdx).not.toBe(-1);
    expect(landIdx).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [whiteIdx]: { player: 'white' },
        [blackIdx]: { player: 'black' },
      }),
      currentPlayer: 'white',
    });

    expect(state.board[landIdx]).toBeNull();

    const moves = getValidMoves(state);
    expect(moves.length).toBeGreaterThan(0);
    for (const m of moves) {
      expect(m.captures.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// executeMove — simple move
// ---------------------------------------------------------------------------

describe('executeMove — simple move', () => {
  it('moves a piece and switches turn', () => {
    // White at row 5 col 0 -> row 4 col 1
    const fromIdx = rowColToIndex(5, 0);
    const toIdx = rowColToIndex(4, 1);
    expect(fromIdx).not.toBe(-1);
    expect(toIdx).not.toBe(-1);

    const state = makeState({
      board: makeBoard({ [fromIdx]: { player: 'white' } }),
      currentPlayer: 'white',
    });

    const move: Move = { from: fromIdx, to: toIdx, captures: [], isMultiCapture: false };
    const next = executeMove(state, move);

    expect(next.board[fromIdx]).toBeNull();
    expect(next.board[toIdx]).toEqual({ player: 'white', isKing: false });
    expect(next.currentPlayer).toBe('black');
    expect(next.moveHistory).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// executeMove — capture
// ---------------------------------------------------------------------------

describe('executeMove — capture', () => {
  it('removes captured piece and switches turn', () => {
    // White at row 4 col 1, black at row 3 col 2, land at row 2 col 3
    const whiteIdx = rowColToIndex(4, 1);
    const blackIdx = rowColToIndex(3, 2);
    const landIdx = rowColToIndex(2, 3);
    expect(whiteIdx).not.toBe(-1);
    expect(blackIdx).not.toBe(-1);
    expect(landIdx).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [whiteIdx]: { player: 'white' },
        [blackIdx]: { player: 'black' },
      }),
      currentPlayer: 'white',
    });

    const move: Move = { from: whiteIdx, to: landIdx, captures: [blackIdx], isMultiCapture: false };
    const next = executeMove(state, move);

    expect(next.board[whiteIdx]).toBeNull();
    expect(next.board[blackIdx]).toBeNull();
    expect(next.board[landIdx]).toEqual({ player: 'white', isKing: false });
    expect(next.currentPlayer).toBe('black');
  });
});

// ---------------------------------------------------------------------------
// executeMove — promotion
// ---------------------------------------------------------------------------

describe('executeMove — promotion', () => {
  it('promotes a white piece reaching row 0 to king', () => {
    // White at row 1 col 0 (dark: (1+0)%2=1) -> row 0 col 1 (dark: (0+1)%2=1)
    const fromIdx = rowColToIndex(1, 0);
    const toIdx = rowColToIndex(0, 1);
    expect(fromIdx).not.toBe(-1);
    expect(toIdx).not.toBe(-1);

    const state = makeState({
      board: makeBoard({ [fromIdx]: { player: 'white' } }),
      currentPlayer: 'white',
    });

    const move: Move = { from: fromIdx, to: toIdx, captures: [], isMultiCapture: false };
    const next = executeMove(state, move);

    expect(next.board[toIdx]).toEqual({ player: 'white', isKing: true });
  });

  it('promotes a black piece reaching row 7 to king', () => {
    // Black at row 6 col 7 (dark: (6+7)%2=1) -> row 7 col 6 (dark: (7+6)%2=1)
    const fromIdx = rowColToIndex(6, 7);
    const toIdx = rowColToIndex(7, 6);
    expect(fromIdx).not.toBe(-1);
    expect(toIdx).not.toBe(-1);

    const state = makeState({
      board: makeBoard({ [fromIdx]: { player: 'black' } }),
      currentPlayer: 'black',
    });

    const move: Move = { from: fromIdx, to: toIdx, captures: [], isMultiCapture: false };
    const next = executeMove(state, move);

    expect(next.board[toIdx]).toEqual({ player: 'black', isKing: true });
  });
});

// ---------------------------------------------------------------------------
// King movement
// ---------------------------------------------------------------------------

describe('getValidMoves — king movement', () => {
  it('king can move any distance along diagonals', () => {
    // White king at row 3 col 2 (dark: (3+2)%2=1) on empty board
    const kingIdx = rowColToIndex(3, 2);
    expect(kingIdx).not.toBe(-1);
    const state = makeState({
      board: makeBoard({ [kingIdx]: { player: 'white', isKing: true } }),
      currentPlayer: 'white',
    });

    const moves = getValidMoves(state);
    expect(moves.length).toBeGreaterThan(4);
    for (const m of moves) {
      expect(m.captures).toEqual([]);
    }
  });

  it('king can capture at distance (flying king)', () => {
    // White king at row 0 col 1 (dark), black at row 2 col 3 (dark)
    const kingIdx = rowColToIndex(0, 1);
    const blackIdx = rowColToIndex(2, 3);
    expect(kingIdx).not.toBe(-1);
    expect(blackIdx).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [kingIdx]: { player: 'white', isKing: true },
        [blackIdx]: { player: 'black' },
      }),
      currentPlayer: 'white',
    });

    const moves = getValidMoves(state);
    const captures = moves.filter((m) => m.captures.length > 0);
    expect(captures.length).toBeGreaterThan(0);
    for (const c of captures) {
      expect(c.captures).toContain(blackIdx);
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-capture chain
// ---------------------------------------------------------------------------

describe('executeMove — multi-capture chain', () => {
  it('sets mustCaptureFrom when further captures are available', () => {
    // White at row 5 col 0 (dark), black at row 4 col 1 (dark), land at row 3 col 2 (dark)
    // Then black at row 2 col 3 (dark), potential land at row 1 col 4 (dark)
    const whiteIdx = rowColToIndex(5, 0);
    const black1 = rowColToIndex(4, 1);
    const land1 = rowColToIndex(3, 2);
    const black2 = rowColToIndex(2, 3);
    expect(whiteIdx).not.toBe(-1);
    expect(black1).not.toBe(-1);
    expect(land1).not.toBe(-1);
    expect(black2).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [whiteIdx]: { player: 'white' },
        [black1]: { player: 'black' },
        [black2]: { player: 'black' },
      }),
      currentPlayer: 'white',
    });

    const move: Move = {
      from: whiteIdx,
      to: land1,
      captures: [black1],
      isMultiCapture: false,
    };
    const next = executeMove(state, move);

    expect(next.mustCaptureFrom).toBe(land1);
    expect(next.currentPlayer).toBe('white');
    expect(next.phase).toBe('moving');
  });

  it('clears mustCaptureFrom when no further captures exist', () => {
    // White at row 5 col 0, single black at row 4 col 1, land at row 3 col 2
    const whiteIdx = rowColToIndex(5, 0);
    const black1 = rowColToIndex(4, 1);
    const land1 = rowColToIndex(3, 2);
    expect(whiteIdx).not.toBe(-1);
    expect(black1).not.toBe(-1);
    expect(land1).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [whiteIdx]: { player: 'white' },
        [black1]: { player: 'black' },
      }),
      currentPlayer: 'white',
    });

    const move: Move = {
      from: whiteIdx,
      to: land1,
      captures: [black1],
      isMultiCapture: false,
    };
    const next = executeMove(state, move);

    expect(next.mustCaptureFrom).toBeNull();
    expect(next.currentPlayer).toBe('black');
  });

  it('only returns captures from mustCaptureFrom piece during chain', () => {
    // After first capture: white landed at row 3 col 2, black at row 2 col 3
    const land1 = rowColToIndex(3, 2);
    const black2 = rowColToIndex(2, 3);
    expect(land1).not.toBe(-1);
    expect(black2).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [land1]: { player: 'white' },
        [black2]: { player: 'black' },
      }),
      currentPlayer: 'white',
      mustCaptureFrom: land1,
      phase: 'moving',
    });

    const moves = getValidMoves(state);
    for (const m of moves) {
      expect(m.from).toBe(land1);
      expect(m.captures.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Win condition
// ---------------------------------------------------------------------------

describe('checkWinCondition', () => {
  it('detects win by capture (opponent has no pieces)', () => {
    // Only white piece on board, black has none
    const state = makeState({
      board: makeBoard({
        [rowColToIndex(3, 2)]: { player: 'white' },
      }),
      currentPlayer: 'black',
    });

    const winner = checkWinCondition(state);
    expect(winner).toBe('white');
  });

  it('detects win by blockade (opponent has no legal moves)', () => {
    // Black regular piece at row 7 col 6 (dark: (7+6)%2=1) — bottom edge, no forward moves
    // White at row 6 col 5 blocks backward-left; landing (5,4) also occupied by white
    // White at row 6 col 7 blocks backward-right; landing (5,8) is off-board
    // So black has zero simple moves AND zero capture moves
    const blackIdx = rowColToIndex(7, 6);
    const w1 = rowColToIndex(6, 5);
    const w2 = rowColToIndex(6, 7);
    const w3 = rowColToIndex(5, 4);
    expect(blackIdx).not.toBe(-1);
    expect(w1).not.toBe(-1);
    expect(w2).not.toBe(-1);
    expect(w3).not.toBe(-1);

    const state = makeState({
      board: makeBoard({
        [blackIdx]: { player: 'black' },
        [w1]: { player: 'white' },
        [w2]: { player: 'white' },
        [w3]: { player: 'white' },
      }),
      currentPlayer: 'white',
    });

    const winner = checkWinCondition(state);
    expect(winner).toBe('white');
  });

  it('returns null when both players have pieces and moves', () => {
    const state = createInitialState();
    const winner = checkWinCondition(state);
    expect(winner).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

describe('integration', () => {
  it('executes a complete turn cycle from initial state', () => {
    let state = createInitialState();
    const moves = getValidMoves(state);
    expect(moves.length).toBeGreaterThan(0);

    state = executeMove(state, moves[0]);
    expect(state.moveHistory).toHaveLength(1);
    expect(state.currentPlayer).toBe('white');
  });
});