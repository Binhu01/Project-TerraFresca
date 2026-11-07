/**
 * Xadrez (Chess) game component: 8x8 board rendering, piece selection,
 * move execution with legal-move validation, check/checkmate/stalemate
 * indicators, promotion overlay, and audio lifecycle.
 * Uses React Native Views with absolute positioning for the grid.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { createInitialState, getValidMoves, makeMove, isCheck } from './gameState';
import type { GameState, Move, PieceType, Player } from './types';
import { getFile, getRank } from './board';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import { AudioManager } from '../../shared/audio/AudioManager';
import { SoundRegistry } from '../../shared/audio/SoundRegistry';

const CELL_SIZE = 48;
const BOARD_SIZE = CELL_SIZE * 8;
const PIECE_SIZE = 36;

// Classic chess palette — warm wood tones, not purple/indigo
const LIGHT_SQUARE = '#f0d9b5';
const DARK_SQUARE = '#b58863';
const SELECTED_COLOR = 'rgba(255, 255, 0, 0.4)';
const VALID_MOVE_COLOR = 'rgba(82, 183, 136, 0.5)';
const CHECK_COLOR = '#e63946';
const PALETTE = ['#f0d9b5', '#b58863', '#ffffff', '#1a1a1a'];

const TEMPLATE_MAP: Record<PieceType, string> = {
  king: 'chess-king',
  queen: 'chess-queen',
  rook: 'chess-rook',
  bishop: 'chess-bishop',
  knight: 'chess-knight',
  pawn: 'chess-pawn',
};

const GAME_OVER_LABELS: Record<string, string> = {
  checkmate: 'Checkmate!',
  stalemate: 'Stalemate — Draw',
  'fifty-move': '50-Move Rule — Draw',
  'insufficient-material': 'Insufficient Material — Draw',
};

interface ChessGameProps {
  players: number;
  onExit: () => void;
}

export function ChessGame({ players: _players, onExit }: ChessGameProps) {
  const [seed] = useState(() => Date.now());
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [promotionTimer, setPromotionTimer] = useState(false);

  // Compute valid moves for selected square
  const validDestinations = useMemo(() => {
    if (selectedSquare === null) return new Set<number>();
    const moves = getValidMoves(gameState, selectedSquare);
    return new Set(moves);
  }, [gameState, selectedSquare]);

  // Check if current player's king is in check
  const currentPlayerInCheck = useMemo(
    () => isCheck(gameState.board, gameState.currentPlayer),
    [gameState.board, gameState.currentPlayer],
  );

  // Find king square for check indicator
  const kingInCheckSquare = useMemo(() => {
    if (!currentPlayerInCheck) return -1;
    for (let i = 0; i < 64; i++) {
      const piece = gameState.board[i];
      if (piece !== null && piece.type === 'king' && piece.player === gameState.currentPlayer) {
        return i;
      }
    }
    return -1;
  }, [gameState.board, gameState.currentPlayer, currentPlayerInCheck]);

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

  // Handle promotion phase: auto-resolve after ~500ms
  useEffect(() => {
    if (gameState.phase === 'promoting') {
      setPromotionTimer(true);
      const timer = setTimeout(() => {
        setPromotionTimer(false);
        // Promotion already resolved in makeMove (auto-queen),
        // just transition phase back to selecting
        setGameState((prev) => ({ ...prev, phase: 'selecting' }));
        playSfx('chess-promotion');
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [gameState.phase, playSfx]);

  const handleSquareTap = useCallback(
    (index: number) => {
      if (gameState.phase !== 'selecting') return;

      const piece = gameState.board[index];

      // If tapping a valid destination for the selected piece, execute move
      if (selectedSquare !== null && validDestinations.has(index)) {
        const prevState = gameState;
        const nextState = makeMove(gameState, selectedSquare, index);
        setGameState(nextState);
        setSelectedSquare(null);

        // Determine SFX based on move flags
        const lastMove = nextState.moveHistory[nextState.moveHistory.length - 1];
        if (lastMove) {
          playMoveSfx(lastMove, nextState);
        }
        return;
      }

      // If tapping own piece, select it
      if (piece !== null && piece.player === gameState.currentPlayer) {
        const moves = getValidMoves(gameState, index);
        if (moves.length > 0) {
          setSelectedSquare(index);
        } else {
          setSelectedSquare(null);
        }
      } else {
        // Tapping empty square or opponent piece without valid move: deselect
        setSelectedSquare(null);
      }
    },
    [gameState, selectedSquare, validDestinations, playSfx],
  );

  const playMoveSfx = useCallback(
    (move: Move, nextState: GameState) => {
      if (nextState.phase === 'game-over') {
        if (nextState.gameOverReason === 'checkmate') {
          playSfx('chess-checkmate');
        } else {
          playSfx('chess-stalemate');
        }
      } else if (move.promotion !== null) {
        playSfx('chess-promotion');
      } else if (move.isCastling !== null) {
        playSfx('chess-castling');
      } else if (move.isCheck) {
        playSfx('chess-check');
      } else if (move.capturedPiece !== null || move.isEnPassant) {
        playSfx('chess-capture');
      } else {
        playSfx('chess-move');
      }
    },
    [playSfx],
  );

  const handlePlayAgain = useCallback(() => {
    setGameState(createInitialState());
    setSelectedSquare(null);
    setPromotionTimer(false);
  }, []);

  // Render 64 squares
  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const index = rank * 8 + file;
        const isDark = (rank + file) % 2 === 1;
        const isSelected = selectedSquare === index;
        const isValidDest = validDestinations.has(index);
        const isKingCheck = kingInCheckSquare === index;

        let backgroundColor = isDark ? DARK_SQUARE : LIGHT_SQUARE;
        if (isSelected) {
          backgroundColor = SELECTED_COLOR;
        } else if (isValidDest) {
          backgroundColor = VALID_MOVE_COLOR;
        }

        result.push(
          <TouchableOpacity
            key={`cell-${index}`}
            style={[
              styles.cell,
              {
                top: (7 - rank) * CELL_SIZE,
                left: file * CELL_SIZE,
                backgroundColor,
              },
              isKingCheck && styles.checkIndicator,
            ]}
            onPress={() => handleSquareTap(index)}
            activeOpacity={0.8}
          >
            {isValidDest && !gameState.board[index] && (
              <View style={styles.validMoveDot} />
            )}
            {isValidDest && gameState.board[index] !== null && (
              <View style={styles.captureRing} />
            )}
          </TouchableOpacity>,
        );
      }
    }
    return result;
  }, [selectedSquare, validDestinations, kingInCheckSquare, gameState.board, handleSquareTap]);

  // Render pieces
  const pieces = useMemo(() => {
    const result: React.ReactNode[] = [];
    for (let i = 0; i < 64; i++) {
      const piece = gameState.board[i];
      if (piece === null) continue;

      const file = getFile(i);
      const rank = getRank(i);
      const templateName = TEMPLATE_MAP[piece.type];

      const sprite = SpriteGenerator.generate(templateName, {
        seed,
        palette: PALETTE,
        overrides: {
          color: piece.player,
        },
      });

      result.push(
        <Image
          key={`piece-${i}`}
          source={{ uri: sprite.uri }}
          style={[
            styles.piece,
            {
              top: (7 - rank) * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2,
              left: file * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2,
            },
          ]}
        />,
      );
    }
    return result;
  }, [gameState.board, seed]);

  const currentPlayerLabel = gameState.currentPlayer === 'white' ? 'Brancas' : 'Pretas';
  const gameOverLabel = gameState.gameOverReason
    ? GAME_OVER_LABELS[gameState.gameOverReason] ?? 'Game Over'
    : '';
  const winnerLabel = gameState.winner
    ? gameState.winner === 'white'
      ? 'Brancas Vencem!'
      : 'Pretas Vencem!'
    : '';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View
          style={[
            styles.turnIndicator,
            gameState.currentPlayer === 'white'
              ? styles.whiteTurn
              : styles.blackTurn,
          ]}
        >
          <Text style={styles.turnText}>{currentPlayerLabel}</Text>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Board */}
      <View style={styles.board}>
        {cells}
        {pieces}
      </View>

      {/* Promotion overlay */}
      {gameState.phase === 'promoting' && promotionTimer && (
        <View style={styles.promotionOverlay}>
          <Text style={styles.promotionText}>Promoção!</Text>
        </View>
      )}

      {/* Game over overlay */}
      {gameState.phase === 'game-over' && (
        <View style={styles.gameOverOverlay}>
          {winnerLabel !== '' && (
            <Text style={styles.winnerText}>{winnerLabel}</Text>
          )}
          <Text style={styles.gameOverReason}>{gameOverLabel}</Text>
          <TouchableOpacity style={styles.playAgainButton} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Jogar Novamente</Text>
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
    backgroundColor: '#f0d9b5',
  },
  blackTurn: {
    backgroundColor: '#4a3728',
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
    backgroundColor: LIGHT_SQUARE,
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  checkIndicator: {
    borderWidth: 3,
    borderColor: CHECK_COLOR,
  },
  validMoveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignSelf: 'center',
    marginTop: (CELL_SIZE - 12) / 2,
  },
  captureRing: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: CELL_SIZE / 2 - 2,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.3)',
  },
  piece: {
    position: 'absolute',
    width: PIECE_SIZE,
    height: PIECE_SIZE,
  },
  promotionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionText: {
    color: '#ffd700',
    fontSize: 28,
    fontWeight: 'bold',
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gameOverReason: {
    color: '#cccccc',
    fontSize: 20,
    marginBottom: 24,
  },
  playAgainButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#b58863',
    borderRadius: 8,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
