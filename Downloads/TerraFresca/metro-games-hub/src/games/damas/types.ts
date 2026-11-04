/**
 * Damas Brasileiras type definitions for 8x8 checkers.
 */

export type Player = 'white' | 'black';

export interface Piece {
  player: Player;
  isKing: boolean;
}

export type BoardState = (Piece | null)[]; // 32 posições (apenas casas escuras)

export interface Move {
  from: number;
  to: number;
  captures: number[];
  isMultiCapture: boolean;
}

export interface GameState {
  board: BoardState;
  currentPlayer: Player;
  phase: 'selecting' | 'moving' | 'game-over';
  selectedPiece: number | null;
  validMoves: Move[];
  mustCaptureFrom: number | null;
  winner: Player | null;
  moveHistory: Move[];
}