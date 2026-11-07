/**
 * Ludo type definitions for the Metro Games Hub.
 */

export type Player = 'red' | 'green' | 'yellow' | 'blue';

export interface Piece {
  id: number; // 0-3 within each player
  player: Player;
  position: number; // -1 = in base, 0-51 = main track, 52-57 = home stretch, 58 = finished
}

export type CellState = Piece[];

// Board tracks pieces by absolute position on the main track (0-51)
// Home stretches and bases are tracked per-player in GameState.pieces
export type BoardState = Map<number, CellState>;

export interface DiceRoll {
  value: number; // 1-6
}

export interface Move {
  pieceId: number;
  from: number; // -1 for entering from base
  to: number;
  capturesPiece: { player: Player; pieceId: number } | null;
  entersHomeStretch: boolean;
  finishes: boolean; // reached center (position 58)
}

export interface GameState {
  board: BoardState;
  pieces: Record<Player, Piece[]>; // all 16 pieces tracked explicitly
  currentPlayer: Player;
  phase: 'waiting-roll' | 'rolling' | 'selecting-piece' | 'moving' | 'game-over';
  lastRoll: DiceRoll | null;
  winner: Player | null;
  moveHistory: Move[];
  consecutiveSixes: number;
}
