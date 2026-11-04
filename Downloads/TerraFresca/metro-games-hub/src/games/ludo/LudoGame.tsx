/**
 * Ludo game component: 15x15 board rendering, dice rolling, piece selection,
 * move execution, capture handling, and audio lifecycle.
 * Uses React Native Views with absolute positioning for the grid.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import {
  createInitialState,
  rollDice,
  getValidMoves,
  executeMove,
} from './gameState';
import type { GameState, Move, Player, Piece } from './types';
import {
  MAIN_TRACK_LENGTH,
  FINISH_POSITION,
  BASE_POSITION,
  PLAYER_OFFSETS,
  isSafeSquare,
  getAllPlayers,
} from './board';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import { AudioManager } from '../../shared/audio/AudioManager';
import { SoundRegistry } from '../../shared/audio/SoundRegistry';
import { DiceRoller } from './DiceRoller';

// Board dimensions
const GRID_SIZE = 15;
const CELL_SIZE = 28;
const BOARD_PX = CELL_SIZE * GRID_SIZE;
const PIECE_SIZE = 20;

// Player colors for UI (warm, distinct palette — not purple/indigo)
const PLAYER_COLORS: Record<Player, string> = {
  red: '#e63946',
  green: '#2a9d8f',
  yellow: '#e9c46a',
  blue: '#457b9d',
};

const PLAYER_LABELS: Record<Player, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
};

const SEED = 91;
const PALETTE = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d', '#f1faee'];

/**
 * Map a 15x15 grid cell to its role on the Ludo board.
 * Returns null for cells that are not part of the playable area.
 */
type CellRole =
  | { type: 'base'; player: Player }
  | { type: 'track'; absPos: number }
  | { type: 'home-stretch'; player: Player; index: number }
  | { type: 'center' };

/**
 * Build the static mapping from grid (row, col) to board role.
 * The Ludo board is a cross shape within a 15x15 grid:
 * - Corners (6x6): bases
 * - Cross arms (3 wide): main track + home stretches
 * - Center (3x3): goal
 */
function buildGridMap(): (CellRole | null)[][] {
  const grid: (CellRole | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );

  // Bases (6x6 corners)
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      grid[r][c] = { type: 'base', player: 'red' };
      grid[r][14 - c] = { type: 'base', player: 'green' };
      grid[14 - r][14 - c] = { type: 'base', player: 'yellow' };
      grid[14 - r][c] = { type: 'base', player: 'blue' };
    }
  }

  // Center (3x3)
  for (let r = 6; r <= 8; r++) {
    for (let c = 6; c <= 8; c++) {
      grid[r][c] = { type: 'center' };
    }
  }

  // Main track cells — mapped by absolute position (0-51).
  // The track goes clockwise starting from red's entry point.
  // We define the grid coordinates for each absolute position.
  const trackCoords: [number, number][] = [
    // Red start arm (going up from row 6, col 1..5 then across top)
    // Positions 0-12: red's path segment
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // 0-4
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // 5-10
    [0, 7], [0, 8], // 11-12
    // Green start arm (going right from col 9)
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 13-17
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18-23
    [7, 14], [8, 14], // 24-25
    // Yellow start arm (going down)
    [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 26-30
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31-36
    [14, 7], [14, 6], // 37-38
    // Blue start arm (going left)
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 39-43
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44-49
    [7, 0], [6, 0], // 50-51
  ];

  for (let i = 0; i < trackCoords.length; i++) {
    const [r, c] = trackCoords[i];
    grid[r][c] = { type: 'track', absPos: i };
  }

  // Home stretches (6 cells each, leading into center)
  // Red: row 7, cols 1-6
  for (let i = 0; i < 6; i++) grid[7][1 + i] = { type: 'home-stretch', player: 'red', index: i };
  // Green: col 7, rows 1-6
  for (let i = 0; i < 6; i++) grid[1 + i][7] = { type: 'home-stretch', player: 'green', index: i };
  // Yellow: row 7, cols 9-14
  for (let i = 0; i < 6; i++) grid[7][9 + i] = { type: 'home-stretch', player: 'yellow', index: i };
  // Blue: col 7, rows 9-14
  for (let i = 0; i < 6; i++) grid[9 + i][7] = { type: 'home-stretch', player: 'blue', index: i };

  return grid;
}

const GRID_MAP = buildGridMap();

/**
 * Get the grid (row, col) for a piece based on its player and logical position.
 */
function getPieceGridPosition(player: Player, position: number): { row: number; col: number } | null {
  if (position === BASE_POSITION) return null; // Rendered in base area separately
  if (position === FINISH_POSITION) return { row: 7, col: 7 }; // Center

  // Home stretch (logical 52-57)
  if (position >= MAIN_TRACK_LENGTH) {
    const hsIndex = position - MAIN_TRACK_LENGTH;
    switch (player) {
      case 'red': return { row: 7, col: 1 + hsIndex };
      case 'green': return { row: 1 + hsIndex, col: 7 };
      case 'yellow': return { row: 7, col: 9 + hsIndex };
      case 'blue': return { row: 9 + hsIndex, col: 7 };
    }
  }

  // Main track: convert logical to absolute, then look up grid coords
  const absPos = (position + PLAYER_OFFSETS[player]) % MAIN_TRACK_LENGTH;
  // Find the grid cell for this absolute position
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const role = GRID_MAP[r][c];
      if (role && role.type === 'track' && role.absPos === absPos) {
        return { row: r, col: c };
      }
    }
  }

  return null;
}

/** Base area positions for pieces (4 slots per base) */
const BASE_SLOTS: Record<Player, { row: number; col: number }[]> = {
  red: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 3 }],
  green: [{ row: 2, col: 11 }, { row: 2, col: 12 }, { row: 3, col: 11 }, { row: 3, col: 12 }],
  yellow: [{ row: 11, col: 11 }, { row: 11, col: 12 }, { row: 12, col: 11 }, { row: 12, col: 12 }],
  blue: [{ row: 11, col: 2 }, { row: 11, col: 3 }, { row: 12, col: 2 }, { row: 12, col: 3 }],
};

interface LudoGameProps {
  players: number;
  onExit: () => void;
}

export function LudoGame({ players, onExit }: LudoGameProps) {
  const [seed] = useState(() => Date.now());
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(players));
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);

  // Compute valid moves whenever gameState changes
  const validMoves = useMemo(() => getValidMoves(gameState), [gameState]);

  // Moves available for the selected piece
  const selectedMoves = useMemo(() => {
    if (selectedPieceId === null) return [];
    return validMoves.filter((m) => m.pieceId === selectedPieceId);
  }, [validMoves, selectedPieceId]);

  // Set of piece IDs that have valid moves (for highlighting)
  const movablePieceIds = useMemo(() => {
    const ids = new Set<number>();
    for (const m of validMoves) {
      ids.add(m.pieceId);
    }
    return ids;
  }, [validMoves]);

  // Destination positions for the selected piece (for highlighting)
  const selectedDestinations = useMemo(() => {
    const dests = new Set<number>();
    for (const m of selectedMoves) {
      dests.add(m.to);
    }
    return dests;
  }, [selectedMoves]);

  // Audio lifecycle
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await AudioManager.init();
      if (cancelled) return;
      const musicUri = SoundRegistry.resolve('board-game');
      if (musicUri) {
        await AudioManager.playMusic(musicUri);
      }
    })();
    return () => {
      cancelled = true;
      AudioManager.cleanup();
    };
  }, []);

  const playSfx = useCallback((name: string) => {
    const uri = SoundRegistry.resolve(name);
    if (uri) {
      AudioManager.playSfx(uri).catch(() => {});
    }
  }, []);

  const handleDiceRollComplete = useCallback(
    (_value: number) => {
      const nextState = rollDice(gameState);
      setGameState(nextState);
      setSelectedPieceId(null);
      playSfx('ludo-roll');

      // Auto-execute if only one valid move
      const moves = getValidMoves(nextState);
      if (moves.length === 1 && nextState.phase === 'selecting-piece') {
        const autoState = executeMove(nextState, moves[0]);
        setGameState(autoState);
        playMoveSfx(moves[0], autoState);
      }
    },
    [gameState, playSfx],
  );

  const playMoveSfx = useCallback(
    (move: Move, nextState: GameState) => {
      if (nextState.phase === 'game-over') {
        playSfx('ludo-win');
      } else if (move.finishes) {
        playSfx('ludo-finish');
      } else if (move.capturesPiece) {
        playSfx('ludo-capture');
      } else if (move.entersHomeStretch) {
        playSfx('ludo-enter-home');
      } else {
        playSfx('ludo-move');
      }
    },
    [playSfx],
  );

  const handlePieceTap = useCallback(
    (pieceId: number) => {
      if (gameState.phase !== 'selecting-piece') return;
      if (!movablePieceIds.has(pieceId)) return;

      const movesForPiece = validMoves.filter((m) => m.pieceId === pieceId);

      if (movesForPiece.length === 1) {
        // Single move: execute immediately
        const move = movesForPiece[0];
        const nextState = executeMove(gameState, move);
        setGameState(nextState);
        setSelectedPieceId(null);
        playMoveSfx(move, nextState);
      } else {
        // Multiple moves: select piece to show destinations
        setSelectedPieceId(pieceId);
      }
    },
    [gameState, validMoves, movablePieceIds, playMoveSfx],
  );

  const handleDestinationTap = useCallback(
    (destPos: number) => {
      if (selectedPieceId === null) return;
      const move = selectedMoves.find((m) => m.to === destPos);
      if (!move) return;

      const nextState = executeMove(gameState, move);
      setGameState(nextState);
      setSelectedPieceId(null);
      playMoveSfx(move, nextState);
    },
    [gameState, selectedPieceId, selectedMoves, playMoveSfx],
  );

  const handlePlayAgain = useCallback(() => {
    setGameState(createInitialState(players));
    setSelectedPieceId(null);
  }, [players]);

  // Render grid cells
  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const role = GRID_MAP[row][col];
        if (!role) continue;

        let bgColor = '#f8f8f8';
        let borderColor = '#cccccc';
        let isStar = false;

        switch (role.type) {
          case 'base':
            bgColor = PLAYER_COLORS[role.player];
            borderColor = PLAYER_COLORS[role.player];
            break;
          case 'track':
            bgColor = '#ffffff';
            borderColor = '#aaaaaa';
            isStar = isSafeSquare(role.absPos);
            // Color the start squares
            if (role.absPos === PLAYER_OFFSETS.red) bgColor = '#fce4ec';
            else if (role.absPos === PLAYER_OFFSETS.green) bgColor = '#e0f2f1';
            else if (role.absPos === PLAYER_OFFSETS.yellow) bgColor = '#fffde7';
            else if (role.absPos === PLAYER_OFFSETS.blue) bgColor = '#e3f2fd';
            break;
          case 'home-stretch':
            bgColor = PLAYER_COLORS[role.player];
            borderColor = PLAYER_COLORS[role.player];
            break;
          case 'center':
            bgColor = '#ffd700';
            borderColor = '#daa520';
            break;
        }

        // Highlight destination cells for selected piece
        const isDestHighlight =
          role.type === 'track' && selectedDestinations.has(role.absPos);
        const isHomeDestHighlight =
          role.type === 'home-stretch' &&
          selectedDestinations.has(MAIN_TRACK_LENGTH + role.index);
        const isCenterDest =
          role.type === 'center' && selectedDestinations.has(FINISH_POSITION);

        const highlight = isDestHighlight || isHomeDestHighlight || isCenterDest;

        result.push(
          <TouchableOpacity
            key={`cell-${row}-${col}`}
            style={[
              styles.cell,
              {
                top: row * CELL_SIZE,
                left: col * CELL_SIZE,
                backgroundColor: highlight ? 'rgba(82, 183, 136, 0.6)' : bgColor,
                borderColor,
              },
            ]}
            onPress={() => {
              if (highlight) {
                if (role.type === 'track') handleDestinationTap(role.absPos);
                else if (role.type === 'home-stretch')
                  handleDestinationTap(MAIN_TRACK_LENGTH + role.index);
                else if (role.type === 'center') handleDestinationTap(FINISH_POSITION);
              }
            }}
            activeOpacity={highlight ? 0.7 : 1}
          >
            {isStar && <Text style={styles.star}>★</Text>}
          </TouchableOpacity>,
        );
      }
    }
    return result;
  }, [selectedDestinations, handleDestinationTap]);

  // Render pieces
  const pieces = useMemo(() => {
    const result: React.ReactNode[] = [];
    const activePlayers = getAllPlayers().filter(
      (p) => gameState.pieces[p].length > 0,
    );

    for (const player of activePlayers) {
      for (const piece of gameState.pieces[player]) {
        if (piece.position === FINISH_POSITION) continue; // Don't render finished pieces

        let gridPos: { row: number; col: number } | null = null;

        if (piece.position === BASE_POSITION) {
          // Use base slot positions
          const slot = BASE_SLOTS[player][piece.id];
          if (slot) gridPos = slot;
        } else {
          gridPos = getPieceGridPosition(player, piece.position);
        }

        if (!gridPos) continue;

        const isMovable =
          gameState.phase === 'selecting-piece' &&
          player === gameState.currentPlayer &&
          movablePieceIds.has(piece.id);
        const isSelected = selectedPieceId === piece.id;

        const sprite = SpriteGenerator.generate('pawn', {
          seed,
          palette: PALETTE,
          overrides: {
            color: PLAYER_COLORS[player],
            isSelected,
            isHighlighted: isMovable,
          },
        });

        // Stack offset for multiple pieces on same cell
        const stackOffset = getStackOffset(piece, gameState, player);

        result.push(
          <TouchableOpacity
            key={`piece-${player}-${piece.id}`}
            style={[
              styles.piece,
              {
                top: gridPos.row * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + stackOffset.dy,
                left: gridPos.col * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2 + stackOffset.dx,
              },
              isMovable && styles.movablePiece,
              isSelected && styles.selectedPiece,
            ]}
            onPress={() => handlePieceTap(piece.id)}
            disabled={
              gameState.phase !== 'selecting-piece' ||
              player !== gameState.currentPlayer
            }
            activeOpacity={isMovable ? 0.7 : 1}
          >
            <Image
              source={{ uri: sprite.uri }}
              style={styles.pieceImage}
            />
          </TouchableOpacity>,
        );
      }
    }
    return result;
  }, [gameState, seed, movablePieceIds, selectedPieceId, handlePieceTap]);

  const currentPlayerColor = PLAYER_COLORS[gameState.currentPlayer];
  const currentPlayerLabel = PLAYER_LABELS[gameState.currentPlayer];

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View
          style={[styles.turnIndicator, { backgroundColor: currentPlayerColor }]}
        >
          <Text style={styles.turnText}>{currentPlayerLabel}'s Turn</Text>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Board + Dice layout */}
      <View style={styles.gameArea}>
        <View style={styles.board}>
          {cells}
          {pieces}
        </View>

        {/* Dice area */}
        <View style={styles.diceArea}>
          <DiceRoller
            onRollComplete={handleDiceRollComplete}
            disabled={gameState.phase !== 'waiting-roll'}
          />
          {gameState.lastRoll && (
            <Text style={styles.rollValue}>Rolled: {gameState.lastRoll.value}</Text>
          )}
        </View>
      </View>

      {/* Win overlay */}
      {gameState.phase === 'game-over' && gameState.winner !== null && (
        <View style={styles.winOverlay}>
          <Text style={styles.winText}>
            {PLAYER_LABELS[gameState.winner]} Wins!
          </Text>
          <TouchableOpacity
            style={[styles.playAgainButton, { backgroundColor: PLAYER_COLORS[gameState.winner] }]}
            onPress={handlePlayAgain}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/** Calculate a small pixel offset for stacking multiple pieces on the same cell */
function getStackOffset(
  piece: Piece,
  state: GameState,
  player: Player,
): { dx: number; dy: number } {
  if (piece.position === BASE_POSITION) return { dx: 0, dy: 0 };

  // Count how many pieces share this position before this one
  let index = 0;
  for (const p of state.pieces[player]) {
    if (p.id === piece.id) break;
    if (p.position === piece.position) index++;
  }
  // Also count opponent pieces at same position
  for (const otherPlayer of getAllPlayers()) {
    if (otherPlayer === player) continue;
    for (const p of state.pieces[otherPlayer]) {
      if (p.position === piece.position) index++;
    }
  }

  const offsets = [
    { dx: 0, dy: 0 },
    { dx: 3, dy: -3 },
    { dx: -3, dy: 3 },
    { dx: 3, dy: 3 },
    { dx: -3, dy: -3 },
  ];
  return offsets[index % offsets.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#1a1a2e',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  turnIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  turnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#555555',
  },
  exitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  board: {
    width: BOARD_PX,
    height: BOARD_PX,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#333333',
    backgroundColor: '#f0f0f0',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: {
    fontSize: 12,
    color: '#daa520',
  },
  piece: {
    position: 'absolute',
    width: PIECE_SIZE,
    height: PIECE_SIZE,
  },
  pieceImage: {
    width: PIECE_SIZE,
    height: PIECE_SIZE,
  },
  movablePiece: {
    borderWidth: 2,
    borderColor: '#52b788',
    borderRadius: PIECE_SIZE / 2,
  },
  selectedPiece: {
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: PIECE_SIZE / 2,
  },
  diceArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  rollValue: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: 'bold',
  },
  winOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  playAgainButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});