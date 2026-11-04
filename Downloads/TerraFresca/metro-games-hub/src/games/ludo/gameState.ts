/**
 * Ludo game state machine: dice rolling, movement, capture, and win detection.
 * All functions are pure — they accept a GameState and return a new GameState.
 */

import type { GameState, Move, Piece, Player } from './types';
import {
  BASE_POSITION,
  FINISH_POSITION,
  MAIN_TRACK_LENGTH,
  PLAYER_OFFSETS,
  createInitialBoard,
  getAbsolutePosition,
  getAllPlayers,
  getNextPlayer,
  isSafeSquare,
} from './board';
import { mulberry32 } from '../../shared/utils/prng';

const PIECES_PER_PLAYER = 4;

/**
 * Find the next player in turn order who has at least one piece (active player).
 * Skips players with empty piece arrays (unused in games with fewer than 4 players).
 */
function getNextActivePlayer(current: Player, pieces: Record<Player, Piece[]>): Player {
  let next = getNextPlayer(current);
  while (pieces[next].length === 0) {
    next = getNextPlayer(next);
  }
  return next;
}

/**
 * Create the initial game state for a given number of players (2-4).
 * All pieces start in their bases (position -1). Red goes first.
 */
export function createInitialState(playerCount: number): GameState {
  const clampedCount = Math.max(2, Math.min(4, playerCount));
  const activePlayers = getAllPlayers().slice(0, clampedCount);

  const pieces: Record<Player, Piece[]> = {
    red: [],
    green: [],
    yellow: [],
    blue: [],
  };

  for (const player of activePlayers) {
    pieces[player] = Array.from({ length: PIECES_PER_PLAYER }, (_, id) => ({
      id,
      player,
      position: BASE_POSITION,
    }));
  }

  return {
    board: createInitialBoard(),
    pieces,
    currentPlayer: 'red',
    phase: 'waiting-roll',
    lastRoll: null,
    winner: null,
    moveHistory: [],
    consecutiveSixes: 0,
  };
}

/**
 * Roll the dice using a deterministic PRNG seeded from move history length + timestamp.
 * If no valid moves exist for this roll, skip the turn and advance to next player.
 */
export function rollDice(state: GameState): GameState {
  const seed = state.moveHistory.length * 2654435761;
  const rng = mulberry32(seed);
  const value = Math.floor(rng() * 6) + 1;

  const stateWithRoll: GameState = {
    ...state,
    lastRoll: { value },
    phase: 'selecting-piece',
  };

  // Check if any valid moves exist for this roll
  const validMoves = getValidMoves(stateWithRoll);
  if (validMoves.length === 0) {
    return {
      ...stateWithRoll,
      phase: 'waiting-roll',
      currentPlayer: getNextActivePlayer(state.currentPlayer, state.pieces),
      lastRoll: null,
    };
  }

  return stateWithRoll;
}

/**
 * Get all legal moves for the current player given the last dice roll.
 */
export function getValidMoves(state: GameState): Move[] {
  if (!state.lastRoll) return [];

  const player = state.currentPlayer;
  const rollValue = state.lastRoll.value;
  const playerPieces = state.pieces[player];
  const moves: Move[] = [];

  for (const piece of playerPieces) {
    const move = getMoveForPiece(state, piece, rollValue);
    if (move !== null) {
      moves.push(move);
    }
  }

  return moves;
}

/**
 * Determine the move for a single piece given a roll value.
 * Returns null if the piece cannot move.
 */
function getMoveForPiece(state: GameState, piece: Piece, rollValue: number): Move | null {
  const player = piece.player;

  // Finished pieces cannot move
  if (piece.position === FINISH_POSITION) {
    return null;
  }

  // Piece in base: can only enter with roll === 6
  if (piece.position === BASE_POSITION) {
    if (rollValue !== 6) return null;
    const absPos = getAbsolutePosition(player, 0);
    const capturesPiece = checkCapture(state, player, absPos);
    return {
      pieceId: piece.id,
      from: BASE_POSITION,
      to: absPos,
      capturesPiece,
      entersHomeStretch: false,
      finishes: false,
    };
  }

  // Piece on main track (logical 0-51) or home stretch (logical 52-57)
  const logicalPos = getLogicalFromState(player, piece.position);
  const newLogicalPos = logicalPos + rollValue;

  // Overshoot finish: cannot move
  if (newLogicalPos > FINISH_POSITION) {
    return null;
  }

  // Exact finish
  if (newLogicalPos === FINISH_POSITION) {
    return {
      pieceId: piece.id,
      from: piece.position,
      to: FINISH_POSITION,
      capturesPiece: null,
      entersHomeStretch: logicalPos < MAIN_TRACK_LENGTH,
      finishes: true,
    };
  }

  // Home stretch movement (logical 52-57, no capture possible)
  if (newLogicalPos >= MAIN_TRACK_LENGTH) {
    return {
      pieceId: piece.id,
      from: piece.position,
      to: newLogicalPos,
      capturesPiece: null,
      entersHomeStretch: logicalPos < MAIN_TRACK_LENGTH,
      finishes: false,
    };
  }

  // Main track movement
  const absPos = getAbsolutePosition(player, newLogicalPos);
  const capturesPiece = checkCapture(state, player, absPos);

  return {
    pieceId: piece.id,
    from: piece.position,
    to: absPos,
    capturesPiece,
    entersHomeStretch: false,
    finishes: false,
  };
}

/**
 * Convert a piece's stored position to its logical position for the owning player.
 * Main track positions (0-51) are absolute and need conversion.
 * Home stretch positions (52-57) are already logical (per-player).
 */
function getLogicalFromState(player: Player, position: number): number {
  if (position >= MAIN_TRACK_LENGTH) {
    // Home stretch positions are stored as logical values directly
    return position;
  }
  // Main track: convert absolute to logical
  return (position - PLAYER_OFFSETS[player] + MAIN_TRACK_LENGTH) % MAIN_TRACK_LENGTH;
}

/**
 * Check if moving to an absolute position would capture an opponent piece.
 * Returns capture info or null. No capture on safe squares or in home stretch.
 */
function checkCapture(
  state: GameState,
  movingPlayer: Player,
  absPos: number,
): { player: Player; pieceId: number } | null {
  // Safe squares prevent capture
  if (isSafeSquare(absPos)) return null;

  const cell = state.board.get(absPos);
  if (!cell || cell.length === 0) return null;

  // Find an opponent piece at this position
  for (const occupant of cell) {
    if (occupant.player !== movingPlayer) {
      return { player: occupant.player, pieceId: occupant.id };
    }
  }

  return null;
}

/**
 * Execute a move: update piece positions, handle captures, check win, advance turn.
 */
export function executeMove(state: GameState, move: Move): GameState {
  const player = state.currentPlayer;

  // Deep copy pieces
  const newPieces: Record<Player, Piece[]> = {
    red: state.pieces.red.map((p) => ({ ...p })),
    green: state.pieces.green.map((p) => ({ ...p })),
    yellow: state.pieces.yellow.map((p) => ({ ...p })),
    blue: state.pieces.blue.map((p) => ({ ...p })),
  };

  // Update the moved piece's position
  const movedPiece = newPieces[player].find((p) => p.id === move.pieceId);
  if (!movedPiece) {
    throw new Error(`Piece ${move.pieceId} not found for player ${player}`);
  }
  movedPiece.position = move.to;

  // Handle capture: reset captured piece to base
  if (move.capturesPiece) {
    const capturedPlayer = move.capturesPiece.player;
    const capturedPiece = newPieces[capturedPlayer].find(
      (p) => p.id === move.capturesPiece!.pieceId,
    );
    if (capturedPiece) {
      capturedPiece.position = BASE_POSITION;
    }
  }

  // Rebuild the board map from all piece positions
  const newBoard = rebuildBoard(newPieces);

  // Build new state
  let newState: GameState = {
    ...state,
    board: newBoard,
    pieces: newPieces,
    moveHistory: [...state.moveHistory, move],
    consecutiveSixes:
      state.lastRoll?.value === 6
        ? state.consecutiveSixes + 1
        : 0,
  };

  // Check win condition
  const winner = checkWinCondition(newState);
  if (winner) {
    newState = {
      ...newState,
      winner,
      phase: 'game-over',
    };
  } else {
    newState = {
      ...newState,
      currentPlayer: getNextActivePlayer(player, newPieces),
      phase: 'waiting-roll',
      lastRoll: null,
    };
  }

  return newState;
}

/**
 * Rebuild the board Map from all piece positions.
 * Only main-track pieces (absolute positions 0-51) go on the shared board.
 * Home stretch and base pieces are tracked only in the pieces record.
 */
function rebuildBoard(pieces: Record<Player, Piece[]>): Map<number, Piece[]> {
  const board = new Map<number, Piece[]>();

  for (const player of getAllPlayers()) {
    for (const piece of pieces[player]) {
      // Only place main-track pieces on the shared board
      if (piece.position >= 0 && piece.position < MAIN_TRACK_LENGTH) {
        const existing = board.get(piece.position) ?? [];
        board.set(piece.position, [...existing, piece]);
      }
    }
  }

  return board;
}

/**
 * Check if any player has won by getting all 4 pieces to the finish position.
 */
export function checkWinCondition(state: GameState): Player | null {
  for (const player of getAllPlayers()) {
    const playerPieces = state.pieces[player];
    if (playerPieces.length === 0) continue;

    const allFinished = playerPieces.every(
      (p) => p.position === FINISH_POSITION,
    );
    if (allFinished) {
      return player;
    }
  }

  return null;
}
