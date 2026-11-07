/**
 * Cobras e Escadas game state machine: turn logic, movement, snakes/ladders, win condition.
 * All exported functions are pure — no side effects, no Math.random().
 */

import type { BoardConfig } from './board';
import { mulberry32 } from '../../shared/utils/prng';

export interface Player {
  id: number;
  position: number; // 1-100
  color: 'red' | 'blue' | 'green' | 'yellow';
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  boardConfig: BoardConfig;
  phase: 'waiting-roll' | 'rolling' | 'moving' | 'snake-ladder' | 'game-over';
  winner: number | null;
  diceValue: number | null;
}

export interface RollResult {
  state: GameState;
  diceValue: number;
}

export interface MoveResult {
  state: GameState;
  moved: boolean;
}

const PLAYER_COLORS: Player['color'][] = ['red', 'blue', 'green', 'yellow'];

/** Monotonic counter to ensure unique PRNG seeds even within the same millisecond. */
let rollCounter = 0;

/**
 * Create initial game state for N players with the given board configuration.
 * All players start at position 1. Phase is 'waiting-roll'.
 */
export function createInitialState(playerCount: number, boardConfig: BoardConfig): GameState {
  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      position: 1,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    });
  }

  return {
    players,
    currentPlayerIndex: 0,
    boardConfig,
    phase: 'waiting-roll',
    winner: null,
    diceValue: null,
  };
}

/**
 * Start a dice roll: transitions from 'waiting-roll' to 'rolling'.
 * Determines the dice value immediately (for DiceRoller animation coordination).
 * Accepts an optional forcedValue for deterministic testing; otherwise uses mulberry32 PRNG.
 */
export function startRoll(state: GameState, forcedValue?: number): RollResult {
  if (state.phase !== 'waiting-roll') {
    throw new Error(`startRoll called in invalid phase: ${state.phase}`);
  }

  let diceValue: number;
  if (forcedValue !== undefined) {
    diceValue = forcedValue;
  } else {
    const seed = Date.now() * 1000 + (rollCounter++) + state.currentPlayerIndex;
    const rng = mulberry32(seed);
    diceValue = Math.floor(rng() * 6) + 1;
  }

  const newPlayers = state.players.map((p) => ({ ...p }));

  return {
    diceValue,
    state: {
      ...state,
      players: newPlayers,
      phase: 'rolling',
      diceValue,
    },
  };
}

/**
 * Roll the dice for the current player. Sets phase to 'moving' and stores the dice value.
 * Accepts an optional forcedValue for deterministic testing; otherwise uses mulberry32 PRNG
 * seeded by Date.now() + currentPlayerIndex.
 * @deprecated Use startRoll() for the rolling animation flow. Kept for backward compatibility.
 */
export function rollDice(state: GameState, forcedValue?: number): RollResult {
  let diceValue: number;
  if (forcedValue !== undefined) {
    diceValue = forcedValue;
  } else {
    const seed = Date.now() * 1000 + (rollCounter++) + state.currentPlayerIndex;
    const rng = mulberry32(seed);
    diceValue = Math.floor(rng() * 6) + 1;
  }

  const newPlayers = state.players.map((p) => ({ ...p }));

  return {
    diceValue,
    state: {
      ...state,
      players: newPlayers,
      phase: 'moving',
      diceValue,
    },
  };
}

/**
 * Move the current player's pawn forward by the stored diceValue.
 * If the result would exceed 100, the player stays in place.
 * Sets phase to 'snake-ladder'.
 */
export function movePawn(state: GameState): MoveResult {
  const diceValue = state.diceValue ?? 0;
  const currentPlayer = state.players[state.currentPlayerIndex];
  const newPosition = currentPlayer.position + diceValue;
  const moved = newPosition <= 100;
  const finalPosition = moved ? newPosition : currentPlayer.position;

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, position: finalPosition } : { ...p }
  );

  return {
    moved,
    state: {
      ...state,
      players: newPlayers,
      phase: 'snake-ladder',
    },
  };
}

/**
 * Check if the current player's position is a snake head or ladder base.
 * If so, transport the player to the destination. Then check for win.
 * Sets phase to 'game-over' if current player reached 100, otherwise 'waiting-roll'.
 */
export function applySnakeOrLadder(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const { snakes, ladders } = state.boardConfig;
  let newPosition = currentPlayer.position;

  if (snakes[newPosition] !== undefined) {
    newPosition = snakes[newPosition];
  } else if (ladders[newPosition] !== undefined) {
    newPosition = ladders[newPosition];
  }

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? { ...p, position: newPosition } : { ...p }
  );

  const newState: GameState = {
    ...state,
    players: newPlayers,
  };

  if (checkWin(newState)) {
    return {
      ...newState,
      phase: 'game-over',
      winner: state.currentPlayerIndex,
    };
  }

  return {
    ...newState,
    phase: 'waiting-roll',
  };
}

/**
 * Check if the current player has won (position === 100).
 */
export function checkWin(state: GameState): boolean {
  return state.players[state.currentPlayerIndex].position === 100;
}

/**
 * Advance to the next player. Cycles currentPlayerIndex modulo player count.
 * Resets phase to 'waiting-roll' and clears diceValue.
 */
export function advanceTurn(state: GameState): GameState {
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    phase: 'waiting-roll',
    diceValue: null,
  };
}
