export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export type Player = 'white' | 'black';

export interface Piece {
  type: PieceType;
  player: Player;
  hasMoved: boolean;
}

export type Board = (Piece | null)[];

export interface Square {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (1-8)
}

export type GameOverReason = 'checkmate' | 'stalemate' | 'fifty-move' | 'insufficient-material' | null;

export interface Move {
  from: number;
  to: number;
  piece: PieceType;
  capturedPiece: Piece | null;
  isEnPassant: boolean;
  isCastling: 'kingside' | 'queenside' | null;
  promotion: PieceType | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  phase: 'selecting' | 'moving' | 'promoting' | 'game-over';
  selectedSquare: number | null;
  validMoves: number[];
  moveHistory: Move[];
  winner: Player | null;
  halfmoveClock: number;
  enPassantTarget: number | null;
  gameOverReason: GameOverReason;
}
