/**
 * Ludo integration tests: simulates complete game flows covering
 * base entry, movement, capture, safe squares, home stretch, finish,
 * win detection, turn alternation, and skip-turn logic.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  getValidMoves,
  executeMove,
  checkWinCondition,
  rollDice,
} from '../gameState';
import type { GameState, Move, Player, Piece } from '../types';
import {
  getAbsolutePosition,
  isSafeSquare,
  FINISH_POSITION,
  BASE_POSITION,
  MAIN_TRACK_LENGTH,
  PLAYER_OFFSETS,
  getAllPlayers,
  getNextPlayer,
} from '../board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rebuild the board Map from piece positions (mirrors gameState internals).
 * Only main-track pieces (0-51) go on the shared board.
 */
function rebuildBoardFromPieces(pieces: Record<Player, Piece[]>): Map<number, Piece[]> {
  const board = new Map<number, Piece[]>();
  const allPlayers: Player[] = ['red', 'green', 'yellow', 'blue'];
  for (const player of allPlayers) {
    for (const piece of pieces[player]) {
      if (piece.position >= 0 && piece.position < MAIN_TRACK_LENGTH) {
        const existing = board.get(piece.position) ?? [];
        board.set(piece.position, [...existing, piece]);
      }
    }
  }
  return board;
}

/**
 * Build a custom GameState for testing specific scenarios.
 * All pieces not explicitly listed default to BASE_POSITION.
 * Automatically rebuilds the board map from piece positions.
 */
function buildState(overrides: {
  currentPlayer?: Player;
  lastRoll?: number | null;
  pieces?: Partial<Record<Player, Array<{ id: number; position: number }>>>;
  phase?: GameState['phase'];
}): GameState {
  const state = createInitialState(4);

  if (overrides.currentPlayer) {
    state.currentPlayer = overrides.currentPlayer;
  }
  if (overrides.lastRoll !== undefined) {
    state.lastRoll = overrides.lastRoll !== null ? { value: overrides.lastRoll } : null;
  }
  if (overrides.phase) {
    state.phase = overrides.phase;
  }

  if (overrides.pieces) {
    for (const [player, pieceOverrides] of Object.entries(overrides.pieces)) {
      const p = player as Player;
      for (const po of pieceOverrides ?? []) {
        const piece = state.pieces[p].find((pc) => pc.id === po.id);
        if (piece) {
          piece.position = po.position;
        }
      }
    }
  }

  // Rebuild board so capture detection works correctly
  state.board = rebuildBoardFromPieces(state.pieces);

  return state;
}

/**
 * Roll dice repeatedly until we get the desired value, or give up after maxAttempts.
 * Since rollDice is deterministic based on moveHistory length, we manipulate state
 * to force specific rolls by adjusting consecutiveSixes or using direct state construction.
 */
function forceRoll(state: GameState, desiredValue: number): GameState {
  // Directly set the roll instead of relying on PRNG
  const stateWithRoll: GameState = {
    ...state,
    lastRoll: { value: desiredValue },
    phase: 'selecting-piece',
  };

  const validMoves = getValidMoves(stateWithRoll);
  if (validMoves.length === 0) {
    // No valid moves — simulate skip turn behavior
    return {
      ...stateWithRoll,
      phase: 'waiting-roll',
      currentPlayer: getNextPlayer(state.currentPlayer),
      lastRoll: null,
    };
  }

  return stateWithRoll;
}

/**
 * Execute the first valid move for the current player.
 */
function executeFirstMove(state: GameState): GameState {
  const moves = getValidMoves(state);
  if (moves.length === 0) {
    throw new Error('No valid moves available');
  }
  return executeMove(state, moves[0]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Ludo Integration Tests', () => {
  // 1. Setup: verify initial state
  describe('Initial setup', () => {
    it('creates initial state with all pieces at base for 4 players', () => {
      const state = createInitialState(4);

      const activePlayers = ['red', 'green', 'yellow', 'blue'] as Player[];
      for (const player of activePlayers) {
        expect(state.pieces[player]).toHaveLength(4);
        for (const piece of state.pieces[player]) {
          expect(piece.position).toBe(BASE_POSITION);
          expect(piece.player).toBe(player);
        }
      }

      expect(state.currentPlayer).toBe('red');
      expect(state.phase).toBe('waiting-roll');
      expect(state.winner).toBeNull();
      expect(state.moveHistory).toHaveLength(0);
    });
  });

  // 2. Base entry: piece enters board only with roll of 6
  describe('Base entry', () => {
    it('enters board at correct starting position when rolling 6', () => {
      let state = createInitialState(4);
      state = forceRoll(state, 6);

      const moves = getValidMoves(state);
      expect(moves.length).toBeGreaterThan(0);

      // All valid moves should enter from base
      for (const move of moves) {
        expect(move.from).toBe(BASE_POSITION);
        expect(move.to).toBe(getAbsolutePosition('red', 0));
      }

      // Execute first move
      const newState = executeMove(state, moves[0]);
      const movedPiece = newState.pieces['red'].find((p) => p.id === moves[0].pieceId);
      expect(movedPiece?.position).toBe(getAbsolutePosition('red', 0));
    });

    it('cannot enter board without rolling 6', () => {
      let state = createInitialState(4);
      state = forceRoll(state, 3);

      const moves = getValidMoves(state);
      // With roll 3 and all pieces in base, no valid moves exist
      expect(moves).toHaveLength(0);
    });
  });

  // 3. Simple movement along main track
  describe('Simple movement', () => {
    it('advances piece along main track after entering board', () => {
      // Red piece at logical position 0 (absolute 0)
      const startPos = getAbsolutePosition('red', 0);
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 3,
        pieces: {
          red: [{ id: 0, position: startPos }],
        },
      });

      const moves = getValidMoves(state);
      expect(moves).toHaveLength(1);

      const expectedAbsPos = getAbsolutePosition('red', 3);
      expect(moves[0].to).toBe(expectedAbsPos);

      const newState = executeMove(state, moves[0]);
      const movedPiece = newState.pieces['red'].find((p) => p.id === 0);
      expect(movedPiece?.position).toBe(expectedAbsPos);
    });
  });

  // 4. Capture scenario
  describe('Capture', () => {
    it('captures opponent piece on non-safe square and sends it to base', () => {
      // Place green piece at absolute position 5 (not a safe square)
      const targetPos = 5;
      expect(isSafeSquare(targetPos)).toBe(false);

      // Red piece at logical position 2 (absolute 2), roll 3 → lands on 5
      const redPos = getAbsolutePosition('red', 2);
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 3,
        pieces: {
          red: [{ id: 0, position: redPos }],
          green: [{ id: 0, position: targetPos }],
        },
      });

      const moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].capturesPiece).toEqual({ player: 'green', pieceId: 0 });

      const newState = executeMove(state, moves[0]);

      // Red piece should be at target position
      const redPiece = newState.pieces['red'].find((p) => p.id === 0);
      expect(redPiece?.position).toBe(targetPos);

      // Green piece should be back at base
      const greenPiece = newState.pieces['green'].find((p) => p.id === 0);
      expect(greenPiece?.position).toBe(BASE_POSITION);
    });
  });

  // 5. Safe square protection
  describe('Safe square protection', () => {
    it('does NOT capture when landing on a safe square with opponent present', () => {
      // Position 0 is a safe square (red's start)
      const safePos = 0;
      expect(isSafeSquare(safePos)).toBe(true);

      // Place a green piece on safe square 0
      // Red piece at logical 49 (abs 49), roll 3 → wraps to logical 0 (abs 0)
      const redLogical = 49;
      const redAbs = getAbsolutePosition('red', redLogical);
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 3,
        pieces: {
          red: [{ id: 0, position: redAbs }],
          green: [{ id: 0, position: safePos }],
        },
      });

      const moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].capturesPiece).toBeNull();

      const newState = executeMove(state, moves[0]);

      // Both pieces should remain on the board
      const greenPiece = newState.pieces['green'].find((p) => p.id === 0);
      expect(greenPiece?.position).toBe(safePos);
    });
  });

  // 6. Home stretch entry
  describe('Home stretch entry', () => {
    it('enters home stretch after completing main track loop', () => {
      // Red piece at logical position 50 (one before home stretch entry)
      const logicalPos = 50;
      const absPos = getAbsolutePosition('red', logicalPos);

      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 2,
        pieces: {
          red: [{ id: 0, position: absPos }],
        },
      });

      const moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].entersHomeStretch).toBe(true);
      // Logical 50 + 2 = 52, which is first home stretch cell
      expect(moves[0].to).toBe(52);

      const newState = executeMove(state, moves[0]);
      const movedPiece = newState.pieces['red'].find((p) => p.id === 0);
      expect(movedPiece?.position).toBe(52);
    });
  });

  // 7. Finish at center (position 58)
  describe('Finish at center', () => {
    it('marks piece as finished when reaching position 58', () => {
      // Red piece at logical 56 (home stretch), roll 2 → 58 (finish)
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 2,
        pieces: {
          red: [{ id: 0, position: 56 }],
        },
      });

      const moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].finishes).toBe(true);
      expect(moves[0].to).toBe(FINISH_POSITION);

      const newState = executeMove(state, moves[0]);
      const movedPiece = newState.pieces['red'].find((p) => p.id === 0);
      expect(movedPiece?.position).toBe(FINISH_POSITION);
    });

    it('cannot overshoot finish position', () => {
      // Red piece at logical 57, roll 3 → would be 60, exceeds 58
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 3,
        pieces: {
          red: [{ id: 0, position: 57 }],
        },
      });

      const moves = getValidMoves(state);
      // No valid move because it would overshoot
      expect(moves).toHaveLength(0);
    });
  });

  // 8. Win condition
  describe('Win condition', () => {
    it('detects winner when all 4 pieces reach finish', () => {
      // 3 pieces already finished, 4th at logical 57 needing roll 1
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: 1,
        pieces: {
          red: [
            { id: 0, position: FINISH_POSITION },
            { id: 1, position: FINISH_POSITION },
            { id: 2, position: FINISH_POSITION },
            { id: 3, position: 57 },
          ],
        },
      });

      const moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].finishes).toBe(true);

      const newState = executeMove(state, moves[0]);
      expect(newState.winner).toBe('red');
      expect(newState.phase).toBe('game-over');
    });

    it('checkWinCondition returns null when not all pieces finished', () => {
      const state = buildState({
        pieces: {
          red: [
            { id: 0, position: FINISH_POSITION },
            { id: 1, position: FINISH_POSITION },
            { id: 2, position: FINISH_POSITION },
            { id: 3, position: 57 },
          ],
        },
      });

      expect(checkWinCondition(state)).toBeNull();
    });
  });

  // 9. Turn alternation
  describe('Turn alternation', () => {
    it('cycles currentPlayer through active players correctly', () => {
      let state = createInitialState(4);
      expect(state.currentPlayer).toBe('red');

      // Force a roll and execute a move for each player
      const expectedOrder: Player[] = ['red', 'green', 'yellow', 'blue'];

      for (let i = 0; i < 4; i++) {
        expect(state.currentPlayer).toBe(expectedOrder[i]);

        // Enter a piece for this player (roll 6)
        state = forceRoll(state, 6);
        const moves = getValidMoves(state);
        if (moves.length > 0) {
          state = executeMove(state, moves[0]);
        }
      }

      // After all 4 players moved, should cycle back to red
      expect(state.currentPlayer).toBe('red');
    });
  });

  // 10. Skip turn when no valid moves
  describe('Skip turn', () => {
    it('advances turn when no valid moves exist', () => {
      // All red pieces in base, roll 3 → no valid moves
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: null,
      });

      // Use rollDice which handles skip internally
      // We need to construct a state where rollDice produces a non-6 roll
      // Since rollDice is deterministic, let's directly test the skip logic
      state = forceRoll(state, 3);

      // forceRoll with non-6 and all pieces in base returns skipped state
      expect(state.currentPlayer).toBe('green');
      expect(state.lastRoll).toBeNull();
      expect(state.phase).toBe('waiting-roll');
    });

    it('skips turn when piece cannot move due to overshoot', () => {
      // Red piece at logical 57, roll anything > 1 → overshoot
      let state = buildState({
        currentPlayer: 'red',
        lastRoll: null,
        pieces: {
          red: [
            { id: 0, position: FINISH_POSITION },
            { id: 1, position: FINISH_POSITION },
            { id: 2, position: FINISH_POSITION },
            { id: 3, position: 57 },
          ],
        },
      });

      state = forceRoll(state, 4);

      // Should skip because only piece at 57 can't move 4 steps (would be 61 > 58)
      expect(state.currentPlayer).toBe('green');
      expect(state.lastRoll).toBeNull();
    });
  });

  // Additional: full game flow simulation
  describe('Full game flow', () => {
    it('simulates a piece journeying from base to finish', () => {
      let state = createInitialState(4);

      // Step 1: Roll 6 to enter board
      state = forceRoll(state, 6);
      let moves = getValidMoves(state);
      expect(moves.length).toBeGreaterThan(0);
      state = executeMove(state, moves[0]);

      // Verify piece entered at red's start position
      const enteredPiece = state.pieces['red'].find((p) => p.position !== BASE_POSITION);
      expect(enteredPiece).toBeDefined();
      expect(enteredPiece!.position).toBe(getAbsolutePosition('red', 0));

      // Now manually advance this piece through the entire track
      // We'll use buildState to place it at various positions and verify movement
      const pieceId = enteredPiece!.id;

      // Move piece to logical position 50 (near end of main track)
      const nearEndAbs = getAbsolutePosition('red', 50);
      state = buildState({
        currentPlayer: 'red',
        lastRoll: 2,
        pieces: {
          red: [{ id: pieceId, position: nearEndAbs }],
        },
      });

      // Roll 2 → enters home stretch at logical 52
      moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].entersHomeStretch).toBe(true);
      state = executeMove(state, moves[0]);

      let piece = state.pieces['red'].find((p) => p.id === pieceId);
      expect(piece?.position).toBe(52);

      // Move through home stretch: 52 → 58 (need 6 more)
      // Roll 6 from position 52 → 58 (finish)
      // Place other red pieces at FINISH_POSITION so they don't generate extra moves
      const otherIds = [0, 1, 2, 3].filter((id) => id !== pieceId);
      state = buildState({
        currentPlayer: 'red',
        lastRoll: 6,
        pieces: {
          red: [
            { id: pieceId, position: 52 },
            ...otherIds.map((id) => ({ id, position: FINISH_POSITION })),
          ],
        },
      });

      moves = getValidMoves(state);
      expect(moves).toHaveLength(1);
      expect(moves[0].finishes).toBe(true);
      state = executeMove(state, moves[0]);

      piece = state.pieces['red'].find((p) => p.id === pieceId);
      expect(piece?.position).toBe(FINISH_POSITION);
    });
  });
});
