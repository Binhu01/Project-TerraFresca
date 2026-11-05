import type { Board, Piece, Player } from './types';
import { getFile, getRank, squareToIndex } from './board';

/**
 * Returns true if any piece belonging to `byPlayer` attacks `square`.
 */
export function isSquareAttacked(
  board: Board,
  square: number,
  byPlayer: Player,
): boolean {
  const targetFile = getFile(square);
  const targetRank = getRank(square);

  // Pawn attacks (pawns attack diagonally forward relative to their color)
  const pawnDirection = byPlayer === 'white' ? -1 : 1;
  for (const df of [-1, 1]) {
    const f = targetFile + df;
    const r = targetRank + pawnDirection;
    if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const idx = squareToIndex(f, r);
      const piece = board[idx];
      if (piece !== null && piece.player === byPlayer && piece.type === 'pawn') {
        return true;
      }
    }
  }

  // Knight attacks
  const knightOffsets: [number, number][] = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [df, dr] of knightOffsets) {
    const f = targetFile + df;
    const r = targetRank + dr;
    if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const idx = squareToIndex(f, r);
      const piece = board[idx];
      if (piece !== null && piece.player === byPlayer && piece.type === 'knight') {
        return true;
      }
    }
  }

  // King attacks (adjacent squares)
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = targetFile + df;
      const r = targetRank + dr;
      if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
        const idx = squareToIndex(f, r);
        const piece = board[idx];
        if (piece !== null && piece.player === byPlayer && piece.type === 'king') {
          return true;
        }
      }
    }
  }

  // Sliding pieces: bishop/queen on diagonals
  const diagonalDirs: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [df, dr] of diagonalDirs) {
    let f = targetFile + df;
    let r = targetRank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const idx = squareToIndex(f, r);
      const piece = board[idx];
      if (piece !== null) {
        if (piece.player === byPlayer && (piece.type === 'bishop' || piece.type === 'queen')) {
          return true;
        }
        break; // blocked by any piece
      }
      f += df;
      r += dr;
    }
  }

  // Sliding pieces: rook/queen on orthogonals
  const orthogonalDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [df, dr] of orthogonalDirs) {
    let f = targetFile + df;
    let r = targetRank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const idx = squareToIndex(f, r);
      const piece = board[idx];
      if (piece !== null) {
        if (piece.player === byPlayer && (piece.type === 'rook' || piece.type === 'queen')) {
          return true;
        }
        break;
      }
      f += df;
      r += dr;
    }
  }

  return false;
}

/**
 * Generate pseudo-legal pawn moves.
 */
export function getPawnMoves(
  board: Board,
  square: number,
  player: Player,
  enPassantTarget: number | null,
): number[] {
  const moves: number[] = [];
  const file = getFile(square);
  const rank = getRank(square);
  const direction = player === 'white' ? 1 : -1;
  const startRank = player === 'white' ? 1 : 6;

  // Forward one square
  const oneAheadRank = rank + direction;
  if (oneAheadRank >= 0 && oneAheadRank <= 7) {
    const oneAheadIdx = squareToIndex(file, oneAheadRank);
    if (board[oneAheadIdx] === null) {
      moves.push(oneAheadIdx);

      // Forward two squares from starting rank
      if (rank === startRank) {
        const twoAheadRank = rank + direction * 2;
        const twoAheadIdx = squareToIndex(file, twoAheadRank);
        if (board[twoAheadIdx] === null) {
          moves.push(twoAheadIdx);
        }
      }
    }
  }

  // Diagonal captures
  for (const df of [-1, 1]) {
    const captureFile = file + df;
    const captureRank = rank + direction;
    if (captureFile >= 0 && captureFile <= 7 && captureRank >= 0 && captureRank <= 7) {
      const captureIdx = squareToIndex(captureFile, captureRank);
      const targetPiece = board[captureIdx];

      // Normal capture
      if (targetPiece !== null && targetPiece.player !== player) {
        moves.push(captureIdx);
      }

      // En passant capture
      if (enPassantTarget !== null && captureIdx === enPassantTarget) {
        moves.push(captureIdx);
      }
    }
  }

  return moves;
}

/**
 * Generate pseudo-legal knight moves.
 */
export function getKnightMoves(
  board: Board,
  square: number,
  player: Player,
): number[] {
  const moves: number[] = [];
  const file = getFile(square);
  const rank = getRank(square);

  const offsets: [number, number][] = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  for (const [df, dr] of offsets) {
    const f = file + df;
    const r = rank + dr;
    if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const idx = squareToIndex(f, r);
      const piece = board[idx];
      if (piece === null || piece.player !== player) {
        moves.push(idx);
      }
    }
  }

  return moves;
}

/**
 * Ray-cast helper for sliding pieces.
 */
function getSlidingMoves(
  board: Board,
  square: number,
  player: Player,
  directions: [number, number][],
): number[] {
  const moves: number[] = [];
  const file = getFile(square);
  const rank = getRank(square);

  for (const [df, dr] of directions) {
    let f = file + df;
    let r = rank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const idx = squareToIndex(f, r);
      const piece = board[idx];
      if (piece === null) {
        moves.push(idx);
      } else {
        if (piece.player !== player) {
          moves.push(idx); // capture
        }
        break; // blocked
      }
      f += df;
      r += dr;
    }
  }

  return moves;
}

/**
 * Generate pseudo-legal bishop moves.
 */
export function getBishopMoves(
  board: Board,
  square: number,
  player: Player,
): number[] {
  const diagonals: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return getSlidingMoves(board, square, player, diagonals);
}

/**
 * Generate pseudo-legal rook moves.
 */
export function getRookMoves(
  board: Board,
  square: number,
  player: Player,
): number[] {
  const orthogonals: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return getSlidingMoves(board, square, player, orthogonals);
}

/**
 * Generate pseudo-legal queen moves (union of bishop + rook).
 */
export function getQueenMoves(
  board: Board,
  square: number,
  player: Player,
): number[] {
  const allDirections: [number, number][] = [
    [-1, -1], [-1, 1], [1, -1], [1, 1],
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];
  return getSlidingMoves(board, square, player, allDirections);
}

/**
 * Generate pseudo-legal king moves (does NOT include castling).
 */
export function getKingMoves(
  board: Board,
  square: number,
  player: Player,
): number[] {
  const moves: number[] = [];
  const file = getFile(square);
  const rank = getRank(square);

  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = file + df;
      const r = rank + dr;
      if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
        const idx = squareToIndex(f, r);
        const piece = board[idx];
        if (piece === null || piece.player !== player) {
          moves.push(idx);
        }
      }
    }
  }

  return moves;
}

/**
 * Generate valid castling moves for the king at `square`.
 * Returns king destination indices only.
 */
export function getCastlingMoves(
  board: Board,
  square: number,
  player: Player,
): number[] {
  const moves: number[] = [];
  const piece = board[square];

  // Must be a king that hasn't moved
  if (piece === null || piece.type !== 'king' || piece.player !== player || piece.hasMoved) {
    return moves;
  }

  const opponent: Player = player === 'white' ? 'black' : 'white';
  const rank = player === 'white' ? 0 : 7;
  const kingFile = getFile(square);

  // King must be on its starting square (e-file = file 4)
  if (kingFile !== 4 || getRank(square) !== rank) {
    return moves;
  }

  // King must not currently be in check
  if (isSquareAttacked(board, square, opponent)) {
    return moves;
  }

  // Kingside castling: rook on h-file (file 7)
  const kingsideRookIdx = squareToIndex(7, rank);
  const kingsideRook = board[kingsideRookIdx];
  if (
    kingsideRook !== null &&
    kingsideRook.type === 'rook' &&
    kingsideRook.player === player &&
    !kingsideRook.hasMoved
  ) {
    const fIdx = squareToIndex(5, rank); // f-file
    const gIdx = squareToIndex(6, rank); // g-file
    if (
      board[fIdx] === null &&
      board[gIdx] === null &&
      !isSquareAttacked(board, fIdx, opponent) &&
      !isSquareAttacked(board, gIdx, opponent)
    ) {
      moves.push(gIdx); // king goes to g-file
    }
  }

  // Queenside castling: rook on a-file (file 0)
  const queensideRookIdx = squareToIndex(0, rank);
  const queensideRook = board[queensideRookIdx];
  if (
    queensideRook !== null &&
    queensideRook.type === 'rook' &&
    queensideRook.player === player &&
    !queensideRook.hasMoved
  ) {
    const bIdx = squareToIndex(1, rank); // b-file
    const cIdx = squareToIndex(2, rank); // c-file
    const dIdx = squareToIndex(3, rank); // d-file
    if (
      board[bIdx] === null &&
      board[cIdx] === null &&
      board[dIdx] === null &&
      !isSquareAttacked(board, cIdx, opponent) &&
      !isSquareAttacked(board, dIdx, opponent)
    ) {
      moves.push(cIdx); // king goes to c-file
    }
  }

  return moves;
}

/**
 * Get all pseudo-legal moves for a piece at `square`.
 * Does not filter for king safety (that's done at the gameState level).
 */
export function getPseudoLegalMoves(
  board: Board,
  square: number,
  enPassantTarget: number | null,
): number[] {
  const piece = board[square];
  if (piece === null) {
    return [];
  }

  let moves: number[];

  switch (piece.type) {
    case 'pawn':
      moves = getPawnMoves(board, square, piece.player, enPassantTarget);
      break;
    case 'knight':
      moves = getKnightMoves(board, square, piece.player);
      break;
    case 'bishop':
      moves = getBishopMoves(board, square, piece.player);
      break;
    case 'rook':
      moves = getRookMoves(board, square, piece.player);
      break;
    case 'queen':
      moves = getQueenMoves(board, square, piece.player);
      break;
    case 'king':
      moves = [
        ...getKingMoves(board, square, piece.player),
        ...getCastlingMoves(board, square, piece.player),
      ];
      break;
  }

  // Deduplicate
  return [...new Set(moves)];
}
