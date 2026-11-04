/**
 * Damas Brasileiras game component: 8x8 checkers board rendering,
 * piece selection, move execution, mandatory capture, and audio lifecycle.
 * Uses React Native Views with absolute positioning for the grid.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import {
  createInitialState,
  getValidMoves,
  executeMove,
} from './gameState';
import type { GameState, Move, Player } from './types';
import { indexToRowCol, rowColToIndex } from './board';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import { AudioManager } from '../../shared/audio/AudioManager';
import { SoundRegistry } from '../../shared/audio/SoundRegistry';

const CELL_SIZE = 48;
const BOARD_SIZE = CELL_SIZE * 8;
const PIECE_SIZE = 32;
const PALETTE = ['#5c3d2e', '#b08968', '#ddb892', '#7f5539', '#e6ccb2'];

interface DamasGameProps {
  players: number;
  onExit: () => void;
}

export function DamasGame({ players: _players, onExit }: DamasGameProps) {
  const [seed] = useState(() => Date.now());
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);

  // Compute valid moves whenever gameState changes
  const validMoves = useMemo(() => getValidMoves(gameState), [gameState]);

  // Set of destination indices for the currently selected piece
  const selectedMoves = useMemo(() => {
    if (selectedPiece === null) return [];
    return validMoves.filter((m) => m.from === selectedPiece);
  }, [validMoves, selectedPiece]);

  const validDestinations = useMemo(() => {
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

  const handleSquareTap = useCallback(
    (index: number) => {
      if (gameState.phase === 'game-over') return;

      const piece = gameState.board[index];

      // If tapping a valid destination for the selected piece, execute the move
      if (selectedPiece !== null && validDestinations.has(index)) {
        const move = selectedMoves.find((m) => m.to === index);
        if (move) {
          const prevState = gameState;
          const nextState = executeMove(gameState, move);
          setGameState(nextState);
          setSelectedPiece(null);

          // Determine which SFX to play
          if (nextState.phase === 'game-over') {
            playSfx('damas-win');
          } else if (move.captures.length > 0) {
            playSfx('damas-capture');
            // Check if promotion happened during this move
            const movedPiece = nextState.board[move.to];
            const prevPiece = prevState.board[move.from];
            if (movedPiece && prevPiece && !prevPiece.isKing && movedPiece.isKing) {
              playSfx('damas-promote');
            }
          } else {
            // Simple move — check for promotion
            const movedPiece = nextState.board[move.to];
            const prevPiece = prevState.board[move.from];
            if (movedPiece && prevPiece && !prevPiece.isKing && movedPiece.isKing) {
              playSfx('damas-promote');
            } else {
              playSfx('damas-move');
            }
          }
        }
        return;
      }

      // If tapping own piece, select it (respecting mustCaptureFrom)
      if (piece !== null && piece.player === gameState.currentPlayer) {
        if (gameState.mustCaptureFrom !== null) {
          // Only allow selecting the forced piece
          if (index === gameState.mustCaptureFrom) {
            setSelectedPiece(index);
          }
        } else {
          // Check if this piece has any valid moves
          const hasMoves = validMoves.some((m) => m.from === index);
          if (hasMoves) {
            setSelectedPiece(index);
          }
        }
      }
    },
    [gameState, selectedPiece, validMoves, selectedMoves, validDestinations, playSfx],
  );

  const handlePlayAgain = useCallback(() => {
    setGameState(createInitialState());
    setSelectedPiece(null);
  }, []);

  // Render 64 squares (light + dark), pieces only on dark squares
  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isDark = (row + col) % 2 === 1;
        const isValidDest = isDark && validDestinations.has(rowColToIndex(row, col));

        result.push(
          <TouchableOpacity
            key={`${row}-${col}`}
            style={[
              styles.cell,
              { top: row * CELL_SIZE, left: col * CELL_SIZE },
              isDark ? styles.darkCell : styles.lightCell,
              isValidDest && styles.validMoveCell,
            ]}
            onPress={() => {
              if (isDark) {
                handleSquareTap(rowColToIndex(row, col));
              }
            }}
            activeOpacity={isDark ? 0.7 : 1}
          />,
        );
      }
    }
    return result;
  }, [validDestinations, handleSquareTap]);

  // Render pieces on dark squares
  const pieces = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let i = 0; i < 32; i++) {
      const piece = gameState.board[i];
      if (piece === null) continue;

      const { row, col } = indexToRowCol(i);
      const isSelected = selectedPiece === i;

      const sprite = SpriteGenerator.generate('checker-piece', {
        seed,
        palette: PALETTE,
        overrides: {
          player: piece.player,
          isKing: piece.isKing,
          isSelected,
        },
      });

      result.push(
        <Image
          key={`piece-${i}`}
          source={{ uri: sprite.uri }}
          style={[
            styles.piece,
            {
              top: row * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2,
              left: col * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2,
            },
          ]}
        />,
      );
    }
    return result;
  }, [gameState.board, selectedPiece, seed]);

  const currentPlayerLabel = gameState.currentPlayer === 'white' ? 'White' : 'Black';

  return (
    <View style={styles.container}>
      {/* Turn indicator */}
      <View style={styles.topBar}>
        <View
          style={[
            styles.turnIndicator,
            gameState.currentPlayer === 'white'
              ? styles.whiteTurn
              : styles.blackTurn,
          ]}
        >
          <Text style={styles.turnText}>{currentPlayerLabel}'s Turn</Text>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
      </View>

      {/* Board */}
      <View style={styles.board}>
        {cells}
        {pieces}
      </View>

      {/* Win overlay */}
      {gameState.phase === 'game-over' && gameState.winner !== null && (
        <View style={styles.winOverlay}>
          <Text style={styles.winText}>
            {gameState.winner === 'white' ? 'White' : 'Black'} Wins!
          </Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#2c1810',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  turnIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  whiteTurn: {
    backgroundColor: '#ddb892',
  },
  blackTurn: {
    backgroundColor: '#5c3d2e',
  },
  turnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#7f5539',
  },
  exitText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#5c3d2e',
    backgroundColor: '#e6ccb2',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  lightCell: {
    backgroundColor: '#e6ccb2',
  },
  darkCell: {
    backgroundColor: '#7f5539',
  },
  validMoveCell: {
    backgroundColor: 'rgba(82, 183, 136, 0.6)',
  },
  piece: {
    position: 'absolute',
    width: PIECE_SIZE,
    height: PIECE_SIZE,
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
    backgroundColor: '#b08968',
    borderRadius: 8,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
