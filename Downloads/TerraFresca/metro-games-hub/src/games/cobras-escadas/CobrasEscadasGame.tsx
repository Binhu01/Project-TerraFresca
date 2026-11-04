/**
 * Cobras e Escadas game component: board rendering, pawn positioning, audio lifecycle.
 * Uses React Native Views with absolute positioning for the 10x10 grid.
 * DiceRoller animation will be integrated in Task 4b.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { generateBoard, getCellPosition } from './board';
import {
  createInitialState,
  startRoll,
  movePawn,
  applySnakeOrLadder,
  advanceTurn,
} from './gameState';
import type { GameState } from './gameState';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import { AudioManager } from '../../shared/audio/AudioManager';

const CELL_SIZE = 48;
const BOARD_SIZE = CELL_SIZE * 10;
const SEED = Date.now();
const PALETTE = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2'];

interface CobrasEscadasGameProps {
  playerCount: number;
}

export function CobrasEscadasGame({ playerCount }: CobrasEscadasGameProps) {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(playerCount, generateBoard(SEED))
  );

  // Audio lifecycle
  useEffect(() => {
    AudioManager.playMusic('board-game');
    return () => {
      AudioManager.cleanup();
    };
  }, []);

  const handleDicePress = useCallback(() => {
    if (gameState.phase !== 'waiting-roll') return;

    const result = startRoll(gameState);
    setGameState(result.state);

    // For now, immediately transition to moving (Task 4b will add animation delay)
    const moved = movePawn(result.state);
    setGameState(moved.state);

    const afterSnake = applySnakeOrLadder(moved.state);
    setGameState(afterSnake);

    if (afterSnake.phase !== 'game-over') {
      const nextTurn = advanceTurn(afterSnake);
      setGameState(nextTurn);
    }
  }, [gameState]);

  const handlePlayAgain = useCallback(() => {
    setGameState(createInitialState(playerCount, generateBoard(Date.now())));
  }, [playerCount]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <View style={styles.container}>
      {/* Player indicators */}
      <View style={styles.playerBar}>
        {gameState.players.map((player) => (
          <View
            key={player.id}
            style={[
              styles.playerIndicator,
              player.id === currentPlayer.id && styles.activePlayer,
            ]}
          >
            <Text style={styles.playerName}>Player {player.id + 1}</Text>
          </View>
        ))}
      </View>

      {/* Board grid */}
      <View style={styles.board}>
        {Array.from({ length: 100 }, (_, i) => {
          const cellNumber = i + 1;
          const { row, col } = getCellPosition(cellNumber);
          const isSnake = gameState.boardConfig.snakes[cellNumber] !== undefined;
          const isLadder = gameState.boardConfig.ladders[cellNumber] !== undefined;

          return (
            <View
              key={cellNumber}
              style={[
                styles.cell,
                {
                  top: row * CELL_SIZE,
                  left: col * CELL_SIZE,
                },
                isSnake && styles.snakeCell,
                isLadder && styles.ladderCell,
              ]}
            >
              <Text style={styles.cellNumber}>{cellNumber}</Text>
            </View>
          );
        })}

        {/* Pawns */}
        {gameState.players.map((player) => {
          const { row, col } = getCellPosition(player.position);
          return (
            <Image
              key={`pawn-${player.id}`}
              source={{ uri: SpriteGenerator.generate('pawn', { seed: SEED, palette: PALETTE, overrides: { color: player.color } }).uri }}
              style={[
                styles.pawn,
                {
                  top: row * CELL_SIZE + (CELL_SIZE - 32) / 2,
                  left: col * CELL_SIZE + (CELL_SIZE - 32) / 2,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Dice area placeholder for Task 4b */}
      <TouchableOpacity
        testID="dice-area"
        style={styles.diceArea}
        onPress={handleDicePress}
        disabled={gameState.phase !== 'waiting-roll'}
      >
        <Text style={styles.diceText}>
          {gameState.diceValue !== null ? `Dice: ${gameState.diceValue}` : 'Roll Dice'}
        </Text>
      </TouchableOpacity>

      {/* Win overlay */}
      {gameState.phase === 'game-over' && gameState.winner !== null && (
        <View style={styles.winOverlay}>
          <Text style={styles.winText}>
            Player {gameState.winner + 1} Wins!
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
    padding: 16,
    backgroundColor: '#1b4332',
  },
  playerBar: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  playerIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#2d6a4f',
  },
  activePlayer: {
    backgroundColor: '#52b788',
  },
  playerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: 'relative',
    backgroundColor: '#d8f3dc',
    borderWidth: 2,
    borderColor: '#2d6a4f',
  },
  cell: {
    position: 'absolute',
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: '#95d5b2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellNumber: {
    fontSize: 10,
    color: '#2d6a4f',
  },
  snakeCell: {
    backgroundColor: '#ffadad',
  },
  ladderCell: {
    backgroundColor: '#caffbf',
  },
  pawn: {
    position: 'absolute',
    width: 32,
    height: 32,
  },
  diceArea: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#40916c',
    borderRadius: 8,
  },
  diceText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  winOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    backgroundColor: '#52b788',
    borderRadius: 8,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
