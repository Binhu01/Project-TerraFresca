/**
 * Damas Brasileiras game state machine: move validation, execution, promotion,
 * mandatory capture, multi-capture chains, and win detection.
 * All exported functions are pure — no side effects.
 */

import type { BoardState, GameState, Move, Piece, Player } from './types';
import { createInitialBoard, indexToRowCol, isValidPosition, rowColToIndex } from './board';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const opponent = (p: Player): Player => (p === 'white' ? 'black' : 'white');

/** Forward direction for a player: white moves toward row 0 (-1), black toward row 7 (+1). */
const forwardDir = (p: Player): number => (p === 'white' ? -1 : +1);

/** Promotion row: white promotes at row 0, black at row 7. */
const promotionRow = (p: Player): number => (p === 'white' ? 0 : 7);

/** Return a shallow copy of the board with one position replaced. */
const setSquare = (board: BoardState, index: number, value: Piece | null): BoardState => {
  const next = board.slice();
  next[index] = value;
  return next;
};

// ---------------------------------------------------------------------------
// Move generation internals
// ---------------------------------------------------------------------------

interface CandidateMove {
  to: number;
  captures: number[];
}

/**
 * Generate simple (non-capture) moves for a regular piece at `from`.
 * Regular pieces move one step diagonally forward only.
 */
function getRegularSimpleMoves(board: BoardState, from: number, player: Player): CandidateMove[] {
  const { row, col } = indexToRowCol(from);
  const dir = forwardDir(player);
  const moves: CandidateMove[] = [];

  for (const dc of [-1, +1]) {
    const nr = row + dir;
    const nc = col + dc;
    const idx = rowColToIndex(nr, nc);
    if (idx !== -1 && board[idx] === null) {
      moves.push({ to: idx, captures: [] });
    }
  }
  return moves;
}

/**
 * Generate capture moves for a regular piece at `from`.
 * Captures jump over an adjacent opponent into an empty square beyond, in any diagonal direction.
 */
function getRegularCaptureMoves(board: BoardState, from: number, player: Player): CandidateMove[] {
  const { row, col } = indexToRowCol(from);
  const moves: CandidateMove[] = [];

  for (const dr of [-1, +1]) {
    for (const dc of [-1, +1]) {
      const midR = row + dr;
      const midC = col + dc;
      const landR = row + 2 * dr;
      const landC = col + 2 * dc;

      const midIdx = rowColToIndex(midR, midC);
      const landIdx = rowColToIndex(landR, landC);
      if (midIdx === -1 || landIdx === -1) continue;

      const midPiece = board[midIdx];
      if (midPiece !== null && midPiece.player !== player && board[landIdx] === null) {
        moves.push({ to: landIdx, captures: [midIdx] });
      }
    }
  }
  return moves;
}

/**
 * Generate simple (non-capture) moves for a king at `from`.
 * Kings slide any distance along all four diagonals until blocked.
 */
function getKingSimpleMoves(board: BoardState, from: number): CandidateMove[] {
  const { row, col } = indexToRowCol(from);
  const moves: CandidateMove[] = [];

  for (const dr of [-1, +1]) {
    for (const dc of [-1, +1]) {
      let r = row + dr;
      let c = col + dc;
      while (true) {
        const idx = rowColToIndex(r, c);
        if (idx === -1) break;
        if (board[idx] !== null) break; // blocked
        moves.push({ to: idx, captures: [] });
        r += dr;
        c += dc;
      }
    }
  }
  return moves;
}

/**
 * Generate capture moves for a king at `from`.
 * Flying king: slides along a diagonal, jumps over exactly one opponent, lands on any empty
 * square beyond (with no further pieces between the jumped piece and the landing square).
 */
function getKingCaptureMoves(board: BoardState, from: number, player: Player): CandidateMove[] {
  const { row, col } = indexToRowCol(from);
  const moves: CandidateMove[] = [];

  for (const dr of [-1, +1]) {
    for (const dc of [-1, +1]) {
      let r = row + dr;
      let c = col + dc;
      let foundOpponent = false;
      let capturedIdx = -1;

      while (true) {
        const idx = rowColToIndex(r, c);
        if (idx === -1) break;

        const piece = board[idx];
        if (!foundOpponent) {
          if (piece === null) {
            // empty, keep sliding
          } else if (piece.player !== player) {
            foundOpponent = true;
            capturedIdx = idx;
          } else {
            break; // own piece blocks
          }
        } else {
          // We've already found the opponent to capture
          if (piece !== null) break; // another piece blocks landing
          // Valid landing square after the captured opponent
          moves.push({ to: idx, captures: [capturedIdx] });
        }
        r += dr;
        c += dc;
      }
    }
  }
  return moves;
}

/**
 * Get all candidate moves (simple + captures) for a single piece.
 */
function getPieceMoves(board: BoardState, from: number, piece: Piece): CandidateMove[] {
  if (piece.isKing) {
    return [...getKingSimpleMoves(board, from), ...getKingCaptureMoves(board, from, piece.player)];
  }
  return [
    ...getRegularSimpleMoves(board, from, piece.player),
    ...getRegularCaptureMoves(board, from, piece.player),
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create the initial game state for Damas Brasileiras.
 * Black starts (moves first). Phase is 'selecting'.
 */
export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'black',
    phase: 'selecting',
    selectedPiece: null,
    validMoves: [],
    mustCaptureFrom: null,
    winner: null,
    moveHistory: [],
  };
}

/**
 * Compute all legal moves for the current player.
 * If ANY piece can capture, only capture moves are returned (mandatory capture rule).
 * When `mustCaptureFrom` is set (multi-capture chain), only moves from that square are returned.
 */
export function getValidMoves(state: GameState): Move[] {
  if (state.phase === 'game-over') return [];

  const { board, currentPlayer, mustCaptureFrom } = state;

  // Collect all captures and all simple moves across the board
  const allCaptures: Move[] = [];
  const allSimple: Move[] = [];

  if (mustCaptureFrom !== null) {
    // Multi-capture continuation: only consider the forced piece
    const piece = board[mustCaptureFrom];
    if (piece !== null && piece.player === currentPlayer) {
      const candidates = piece.isKing
        ? getKingCaptureMoves(board, mustCaptureFrom, currentPlayer)
        : getRegularCaptureMoves(board, mustCaptureFrom, currentPlayer);
      for (const c of candidates) {
        allCaptures.push({
          from: mustCaptureFrom,
          to: c.to,
          captures: c.captures,
          isMultiCapture: true,
        });
      }
    }
  } else {
    for (let i = 0; i < 32; i++) {
      const piece = board[i];
      if (piece === null || piece.player !== currentPlayer) continue;

      const candidates = getPieceMoves(board, i, piece);
      for (const c of candidates) {
        const move: Move = {
          from: i,
          to: c.to,
          captures: c.captures,
          isMultiCapture: false,
        };
        if (c.captures.length > 0) {
          allCaptures.push(move);
        } else {
          allSimple.push(move);
        }
      }
    }
  }

  // Mandatory capture: if any capture exists, return only captures
  if (allCaptures.length > 0) return allCaptures;
  return allSimple;
}

/**
 * Execute a move and return the new game state.
 * Handles: piece movement, capture removal, promotion, multi-capture chaining, turn switching,
 * and win condition checking.
 */
export function executeMove(state: GameState, move: Move): GameState {
  if (state.phase === 'game-over') return state;

  const piece = state.board[move.from];
  if (piece === null) return state;

  // 1. Move piece to destination
  let board = setSquare(state.board, move.from, null);
  board = setSquare(board, move.to, { ...piece });

  // 2. Remove captured pieces
  for (const capIdx of move.captures) {
    board = setSquare(board, capIdx, null);
  }

  // 3. Check promotion
  const destPos = indexToRowCol(move.to);
  let promoted = false;
  if (!piece.isKing && destPos.row === promotionRow(piece.player)) {
    board = setSquare(board, move.to, { ...piece, isKing: true });
    promoted = true;
  }

  // 4. Check for multi-capture continuation
  //    Only if this was a capture, the piece wasn't just promoted (promotion ends the turn in
  //    Brazilian rules when it occurs mid-chain — but standard interpretation: promotion during
  //    a multi-capture chain allows continued capture as king). We follow the common rule:
  //    if promoted during a capture sequence, the piece continues as king.
  let mustCaptureFrom: number | null = null;
  if (move.captures.length > 0) {
    const movedPiece = board[move.to];
    if (movedPiece !== null) {
      const furtherCaptures = movedPiece.isKing
        ? getKingCaptureMoves(board, move.to, movedPiece.player)
        : getRegularCaptureMoves(board, move.to, movedPiece.player);
      if (furtherCaptures.length > 0) {
        mustCaptureFrom = move.to;
      }
    }
  }

  // 5. Build next state
  const nextPlayer = opponent(state.currentPlayer);
  const historyEntry: Move = { ...move };
  const moveHistory = [...state.moveHistory, historyEntry];

  let nextState: GameState;
  if (mustCaptureFrom !== null) {
    // Same player continues, must capture from the landed square
    nextState = {
      board,
      currentPlayer: state.currentPlayer,
      phase: 'moving',
      selectedPiece: mustCaptureFrom,
      validMoves: [], // will be recomputed by caller via getValidMoves
      mustCaptureFrom,
      winner: null,
      moveHistory,
    };
  } else {
    // Turn passes to opponent
    nextState = {
      board,
      currentPlayer: nextPlayer,
      phase: 'selecting',
      selectedPiece: null,
      validMoves: [],
      mustCaptureFrom: null,
      winner: null,
      moveHistory,
    };
  }

  // 6. Check win condition for the player who just moved
  const winner = checkWinCondition(nextState, state.currentPlayer);
  if (winner !== null) {
    nextState = {
      ...nextState,
      phase: 'game-over',
      winner,
    };
  }

  return nextState;
}

/**
 * Check whether a player has won.
 * Win conditions:
 *   1. Opponent has no pieces remaining.
 *   2. Opponent has no legal moves (blockade).
 *
 * @param state The current game state (after a move has been executed).
 * @param mover The player who just moved (the potential winner). If omitted, checks both players.
 * @returns The winning player, or null if no one has won yet.
 */
export function checkWinCondition(state: GameState, mover?: Player): Player | null {
  if (state.phase === 'game-over') return state.winner;

  const playersToCheck: Player[] = mover !== undefined ? [mover] : ['white', 'black'];

  for (const p of playersToCheck) {
    const opp = opponent(p);

    // Condition 1: opponent has no pieces
    let oppHasPieces = false;
    for (let i = 0; i < 32; i++) {
      const piece = state.board[i];
      if (piece !== null && piece.player === opp) {
        oppHasPieces = true;
        break;
      }
    }
    if (!oppHasPieces) return p;

    // Condition 2: opponent has no legal moves
    // Temporarily construct a state where it's the opponent's turn to check their moves
    const oppState: GameState = {
      ...state,
      currentPlayer: opp,
      mustCaptureFrom: null,
      phase: 'selecting',
    };
    const oppMoves = getValidMoves(oppState);
    if (oppMoves.length === 0) return p;
  }

  return null;
}