import type { Board, Piece, Player, PieceType, Square } from './types';

export function squareToIndex(file: number, rank: number): number {
  return rank * 8 + file;
}

export function indexToSquare(index: number): Square {
  return { file: index % 8, rank: Math.floor(index / 8) };
}

export function getFile(index: number): number {
  return index % 8;
}

export function getRank(index: number): number {
  return Math.floor(index / 8);
}

function createPiece(type: PieceType, player: Player): Piece {
  return { type, player, hasMoved: false };
}

export function createInitialBoard(): Board {
  const board: Board = new Array(64).fill(null);

  const backRankOrder: PieceType[] = [
    'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
  ];

  // White back rank (rank 0)
  for (let file = 0; file < 8; file++) {
    board[squareToIndex(file, 0)] = createPiece(backRankOrder[file], 'white');
  }

  // White pawns (rank 1)
  for (let file = 0; file < 8; file++) {
    board[squareToIndex(file, 1)] = createPiece('pawn', 'white');
  }

  // Black pawns (rank 6)
  for (let file = 0; file < 8; file++) {
    board[squareToIndex(file, 6)] = createPiece('pawn', 'black');
  }

  // Black back rank (rank 7)
  for (let file = 0; file < 8; file++) {
    board[squareToIndex(file, 7)] = createPiece(backRankOrder[file], 'black');
  }

  return board;
}
