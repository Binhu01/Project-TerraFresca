import type { Board, GameState, GameOverReason, Move, Piece, Player } from './types';
import { createInitialBoard, getFile, getRank, squareToIndex } from './board';
import { getPseudoLegalMoves, isSquareAttacked } from './moves';

/**
 * Create the initial game state for a new chess game.
 */
export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'white',
    phase: 'selecting',
    selectedSquare: null,
    validMoves: [],
    moveHistory: [],
    winner: null,
    halfmoveClock: 0,
    enPassantTarget: null,
    gameOverReason: null,
  };
}

/**
 * Returns true if the king of `player` is under attack on the given board.
 */
export function isCheck(board: Board, player: Player): boolean {
  const opponent: Player = player === 'white' ? 'black' : 'white';

  // Find the king
  let kingSquare = -1;
  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (piece !== null && piece.type === 'king' && piece.player === player) {
      kingSquare = i;
      break;
    }
  }

  if (kingSquare === -1) {
    return false; // No king found (shouldn't happen in normal play)
  }

  return isSquareAttacked(board, kingSquare, opponent);
}

/**
 * Get all legal moves for a piece at `square`, filtering out moves that
 * would leave the player's own king in check.
 */
export function getValidMoves(state: GameState, square: number): number[] {
  const piece = state.board[square];
  if (piece === null || piece.player !== state.currentPlayer) {
    return [];
  }

  const pseudoLegal = getPseudoLegalMoves(state.board, square, state.enPassantTarget);
  const legalMoves: number[] = [];

  for (const to of pseudoLegal) {
    const testBoard = simulateMove(state.board, square, to, state.enPassantTarget);
    if (!isCheck(testBoard, state.currentPlayer)) {
      legalMoves.push(to);
    }
  }

  return legalMoves;
}

/**
 * Simulate a move on a copied board without modifying the original.
 * Handles en passant capture and castling rook relocation for legality checks.
 */
function simulateMove(
  board: Board,
  from: number,
  to: number,
  enPassantTarget: number | null,
): Board {
  const newBoard = [...board];
  const piece = newBoard[from];
  if (piece === null) return newBoard;

  // Move piece
  newBoard[to] = piece;
  newBoard[from] = null;

  // En passant capture: remove the captured pawn
  if (piece.type === 'pawn' && to === enPassantTarget) {
    const direction = piece.player === 'white' ? -1 : 1;
    const capturedPawnIdx = squareToIndex(getFile(to), getRank(to) + direction);
    newBoard[capturedPawnIdx] = null;
  }

  // Castling: move the rook too
  if (piece.type === 'king') {
    const fromFile = getFile(from);
    const toFile = getFile(to);
    if (Math.abs(toFile - fromFile) === 2) {
      const rank = getRank(from);
      if (toFile === 6) {
        // Kingside: rook h -> f
        const rookFrom = squareToIndex(7, rank);
        const rookTo = squareToIndex(5, rank);
        newBoard[rookTo] = newBoard[rookFrom];
        newBoard[rookFrom] = null;
      } else if (toFile === 2) {
        // Queenside: rook a -> d
        const rookFrom = squareToIndex(0, rank);
        const rookTo = squareToIndex(3, rank);
        newBoard[rookTo] = newBoard[rookFrom];
        newBoard[rookFrom] = null;
      }
    }
  }

  return newBoard;
}

/**
 * Apply a move and return the new game state.
 * Follows the 9-step order from the spec.
 */
export function makeMove(state: GameState, from: number, to: number): GameState {
  const piece = state.board[from];
  if (piece === null) {
    throw new Error(`No piece at square ${from}`);
  }

  const newBoard = [...state.board];
  const opponent: Player = state.currentPlayer === 'white' ? 'black' : 'white';

  // Track move flags
  let isEnPassant = false;
  let isCastling: 'kingside' | 'queenside' | null = null;
  let promotion: 'queen' | null = null;
  let capturedPiece: Piece | null = newBoard[to];

  // Step 1: Move piece to destination
  newBoard[to] = { ...piece };
  newBoard[from] = null;

  // Step 2: Resolve en passant capture
  if (piece.type === 'pawn' && to === state.enPassantTarget) {
    isEnPassant = true;
    const direction = piece.player === 'white' ? -1 : 1;
    const capturedPawnIdx = squareToIndex(getFile(to), getRank(to) + direction);
    capturedPiece = newBoard[capturedPawnIdx];
    newBoard[capturedPawnIdx] = null;
  }

  // Step 3: Resolve castling rook relocation
  if (piece.type === 'king') {
    const fromFile = getFile(from);
    const toFile = getFile(to);
    if (Math.abs(toFile - fromFile) === 2) {
      const rank = getRank(from);
      if (toFile === 6) {
        // Kingside: rook h -> f
        isCastling = 'kingside';
        const rookFrom = squareToIndex(7, rank);
        const rookTo = squareToIndex(5, rank);
        const rook = newBoard[rookFrom];
        if (rook !== null) {
          newBoard[rookTo] = { ...rook, hasMoved: true };
          newBoard[rookFrom] = null;
        }
      } else if (toFile === 2) {
        // Queenside: rook a -> d
        isCastling = 'queenside';
        const rookFrom = squareToIndex(0, rank);
        const rookTo = squareToIndex(3, rank);
        const rook = newBoard[rookFrom];
        if (rook !== null) {
          newBoard[rookTo] = { ...rook, hasMoved: true };
          newBoard[rookFrom] = null;
        }
      }
    }
  }

  // Step 4: Apply promotion (auto-queen in v1)
  const toRank = getRank(to);
  const isPromotion = piece.type === 'pawn' && (toRank === 7 || toRank === 0);
  if (isPromotion) {
    promotion = 'queen';
    newBoard[to] = { type: 'queen', player: piece.player, hasMoved: true };
  }

  // Step 5: Update hasMoved on moved piece (and rook already handled above)
  if (!isPromotion) {
    const movedPiece = newBoard[to];
    if (movedPiece !== null) {
      newBoard[to] = { ...movedPiece, hasMoved: true };
    }
  }

  // Step 6: Reset/increment halfmoveClock
  const isPawnMove = piece.type === 'pawn';
  const isCapture = capturedPiece !== null;
  const newHalfmoveClock = (isPawnMove || isCapture) ? 0 : state.halfmoveClock + 1;

  // Step 7: Set/clear enPassantTarget
  let newEnPassantTarget: number | null = null;
  if (piece.type === 'pawn') {
    const fromRank = getRank(from);
    const destRank = getRank(to);
    if (Math.abs(destRank - fromRank) === 2) {
      // Double push: set target to the square behind (the landing square between start and end)
      const midRank = (fromRank + destRank) / 2;
      newEnPassantTarget = squareToIndex(getFile(from), midRank);
    }
  }

  // Step 8: Switch currentPlayer
  const newCurrentPlayer: Player = opponent;

  // Step 9: Compute check/checkmate/stalemate/fifty-move/insufficient material
  const opponentInCheck = isCheck(newBoard, opponent);

  // Build intermediate state for checking end conditions
  const intermediateState: GameState = {
    board: newBoard,
    currentPlayer: newCurrentPlayer,
    phase: 'selecting',
    selectedSquare: null,
    validMoves: [],
    moveHistory: state.moveHistory,
    winner: null,
    halfmoveClock: newHalfmoveClock,
    enPassantTarget: newEnPassantTarget,
    gameOverReason: null,
  };

  const checkmate = isCheckmate(intermediateState);
  const stalemate = isStalemate(intermediateState);
  const fiftyMove = isFiftyMoveRule(newHalfmoveClock);
  const insufficientMaterial = isInsufficientMaterial(newBoard);

  // Determine game over reason and winner
  let gameOverReason: GameOverReason = null;
  let winner: Player | null = null;
  let phase: GameState['phase'] = 'selecting';

  if (checkmate) {
    gameOverReason = 'checkmate';
    winner = state.currentPlayer; // The player who just moved wins
    phase = 'game-over';
  } else if (stalemate) {
    gameOverReason = 'stalemate';
    phase = 'game-over';
  } else if (fiftyMove) {
    gameOverReason = 'fifty-move';
    phase = 'game-over';
  } else if (insufficientMaterial) {
    gameOverReason = 'insufficient-material';
    phase = 'game-over';
  } else if (isPromotion) {
    phase = 'promoting';
  }

  // Build Move object
  const move: Move = {
    from,
    to,
    piece: piece.type,
    capturedPiece,
    isEnPassant,
    isCastling,
    promotion,
    isCheck: opponentInCheck,
    isCheckmate: checkmate,
    isStalemate: stalemate,
  };

  return {
    board: newBoard,
    currentPlayer: newCurrentPlayer,
    phase,
    selectedSquare: null,
    validMoves: [],
    moveHistory: [...state.moveHistory, move],
    winner,
    halfmoveClock: newHalfmoveClock,
    enPassantTarget: newEnPassantTarget,
    gameOverReason,
  };
}

/**
 * Returns true if the current player is in checkmate:
 * in check AND no legal moves exist for any piece.
 */
export function isCheckmate(state: GameState): boolean {
  if (!isCheck(state.board, state.currentPlayer)) {
    return false;
  }
  return !hasAnyLegalMove(state);
}

/**
 * Returns true if the current player is in stalemate:
 * NOT in check AND no legal moves exist.
 */
export function isStalemate(state: GameState): boolean {
  if (isCheck(state.board, state.currentPlayer)) {
    return false;
  }
  return !hasAnyLegalMove(state);
}

/**
 * Check if the current player has any legal move at all.
 */
function hasAnyLegalMove(state: GameState): boolean {
  for (let i = 0; i < 64; i++) {
    const piece = state.board[i];
    if (piece !== null && piece.player === state.currentPlayer) {
      const moves = getValidMoves(state, i);
      if (moves.length > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns true if there is insufficient material for checkmate.
 * Cases: K vs K, K+N vs K, K+B vs K, K+B vs K+B (same-color bishops).
 */
export function isInsufficientMaterial(board: Board): boolean {
  const whitePieces: Piece[] = [];
  const blackPieces: Piece[] = [];
  const whiteSquares: number[] = [];
  const blackSquares: number[] = [];

  for (let i = 0; i < 64; i++) {
    const piece = board[i];
    if (piece !== null) {
      if (piece.player === 'white') {
        whitePieces.push(piece);
        whiteSquares.push(i);
      } else {
        blackPieces.push(piece);
        blackSquares.push(i);
      }
    }
  }

  const totalPieces = whitePieces.length + blackPieces.length;

  // K vs K
  if (totalPieces === 2) {
    return true;
  }

  // K+N vs K or K+B vs K (3 pieces total)
  if (totalPieces === 3) {
    const sideWithExtra = whitePieces.length === 2 ? whitePieces : blackPieces;
    const nonKing = sideWithExtra.find(p => p.type !== 'king');
    if (nonKing !== undefined && (nonKing.type === 'knight' || nonKing.type === 'bishop')) {
      return true;
    }
  }

  // K+B vs K+B with same-color bishops (4 pieces total)
  if (totalPieces === 4 && whitePieces.length === 2 && blackPieces.length === 2) {
    const whiteBishop = whitePieces.find(p => p.type === 'bishop');
    const blackBishop = blackPieces.find(p => p.type === 'bishop');
    const whiteKing = whitePieces.find(p => p.type === 'king');
    const blackKing = blackPieces.find(p => p.type === 'king');

    if (
      whiteBishop !== undefined &&
      blackBishop !== undefined &&
      whiteKing !== undefined &&
      blackKing !== undefined
    ) {
      // Find bishop squares
      const whiteBishopIdx = whiteSquares[whitePieces.indexOf(whiteBishop)];
      const blackBishopIdx = blackSquares[blackPieces.indexOf(blackBishop)];

      // Same color square check: (file + rank) % 2 gives square color
      const whiteBishopColor = (getFile(whiteBishopIdx) + getRank(whiteBishopIdx)) % 2;
      const blackBishopColor = (getFile(blackBishopIdx) + getRank(blackBishopIdx)) % 2;

      if (whiteBishopColor === blackBishopColor) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns true if the halfmove clock has reached 100 (50 full moves).
 */
export function isFiftyMoveRule(halfmoveClock: number): boolean {
  return halfmoveClock >= 100;
}
