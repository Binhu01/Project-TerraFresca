/**
 * Cobras e Escadas game component with 3D dice, custom player names,
 * and smart pawn positioning when multiple players share the same cell.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { generateBoard, getCellPosition } from './board';
import {
  createInitialState,
  startRoll,
  movePawn,
  applySnakeOrLadder,
  advanceTurn,
} from './gameState';
import type { GameState, Player } from './gameState';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import { AudioManager } from '../../shared/audio/AudioManager';
import { SoundRegistry } from '../../shared/audio/SoundRegistry';
import { Dice3D } from './Dice3D';
import { PlayerSetup } from './PlayerSetup';

const CELL_SIZE = 48;
const BOARD_SIZE = CELL_SIZE * 10;
const PALETTE = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2'];

interface PlayerConfig {
  name: string;
  color: string;
}

interface CobrasEscadasGameProps {
  playerCount: number;
}

/** Calculate offset for pawns sharing the same cell */
function getPawnOffset(playerIndex: number, totalPlayersInCell: number): { dx: number; dy: number } {
  if (totalPlayersInCell === 1) return { dx: 0, dy: 0 };

  const spacing = 10;
  if (totalPlayersInCell === 2) {
    return playerIndex === 0 ? { dx: -spacing, dy: 0 } : { dx: spacing, dy: 0 };
  }
  if (totalPlayersInCell === 3) {
    const offsets = [
      { dx: -spacing, dy: -spacing / 2 },
      { dx: spacing, dy: -spacing / 2 },
      { dx: 0, dy: spacing },
    ];
    return offsets[playerIndex] ?? { dx: 0, dy: 0 };
  }
  // 4 players in corners
  const offsets = [
    { dx: -spacing, dy: -spacing },
    { dx: spacing, dy: -spacing },
    { dx: -spacing, dy: spacing },
    { dx: spacing, dy: spacing },
  ];
  return offsets[playerIndex] ?? { dx: 0, dy: 0 };
}

export function CobrasEscadasGame({ playerCount }: CobrasEscadasGameProps) {
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[] | null>(null);
  const [seed] = useState(() => Date.now());
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Audio lifecycle — must be before any conditional returns
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

  // Initialize game when player configs are set
  useEffect(() => {
    if (playerConfigs && !gameState) {
      const state = createInitialState(playerConfigs.length, generateBoard(seed));
      const updatedPlayers = state.players.map((p, i) => ({
        ...p,
        color: playerConfigs[i]?.color as Player['color'] ?? p.color,
      }));
      setGameState({ ...state, players: updatedPlayers });
    }
  }, [playerConfigs, gameState, seed]);

  const handleStartRoll = useCallback(() => {
    if (!gameState || gameState.phase !== 'waiting-roll') return;
    const result = startRoll(gameState);
    setGameState(result.state);
  }, [gameState]);

  const handleRollComplete = useCallback((_diceValue: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      const moved = movePawn(prev);
      const afterSnake = applySnakeOrLadder(moved.state);
      if (afterSnake.phase === 'game-over') return afterSnake;
      return advanceTurn(afterSnake);
    });
  }, []);

  const handlePlayAgain = useCallback(() => {
    setPlayerConfigs(null);
    setGameState(null);
  }, []);

  const handleSetupComplete = useCallback((players: PlayerConfig[]) => {
    setPlayerConfigs(players);
  }, []);

  // Group players by position for smart rendering — always called, handles null safely
  const playersByPosition = useMemo(() => {
    if (!gameState || !playerConfigs) return new Map<number, { player: Player; config: PlayerConfig; indexInCell: number; totalInCell: number }[]>();
    const map = new Map<number, { player: Player; config: PlayerConfig; indexInCell: number; totalInCell: number }[]>();
    gameState.players.forEach((player, idx) => {
      const existing = map.get(player.position) ?? [];
      existing.push({
        player,
        config: playerConfigs[idx],
        indexInCell: existing.length,
        totalInCell: 0,
      });
      map.set(player.position, existing);
    });
    map.forEach((group) => {
      group.forEach((item) => {
        item.totalInCell = group.length;
      });
    });
    return map;
  }, [gameState, playerConfigs]);

  // Conditional renders AFTER all hooks
  if (!playerConfigs) {
    return <PlayerSetup onStart={handleSetupComplete} />;
  }

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentPlayerConfig = playerConfigs[gameState.currentPlayerIndex];

  return (
    <View style={styles.container}>
      {/* Player indicators with custom names */}
      <View style={styles.playerBar}>
        {gameState.players.map((player, idx) => {
          const config = playerConfigs[idx];
          const isActive = player.id === currentPlayer.id;
          return (
            <View
              key={player.id}
              style={[
                styles.playerIndicator,
                isActive && styles.activePlayer,
                { borderColor: config.color, borderWidth: isActive ? 3 : 1 },
              ]}
            >
              <View style={[styles.colorDot, { backgroundColor: config.color }]} />
              <Text style={styles.playerName}>{config.name}</Text>
            </View>
          );
        })}
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
                { top: row * CELL_SIZE, left: col * CELL_SIZE },
                isSnake && styles.snakeCell,
                isLadder && styles.ladderCell,
              ]}
            >
              <Text style={styles.cellNumber}>{cellNumber}</Text>
            </View>
          );
        })}

        {/* Pawns with smart positioning */}
        {gameState.players.map((player, idx) => {
          const { row, col } = getCellPosition(player.position);
          const cellGroup = playersByPosition.get(player.position);
          const itemInCell = cellGroup?.find((g) => g.player.id === player.id);
          const offset = itemInCell
            ? getPawnOffset(itemInCell.indexInCell, itemInCell.totalInCell)
            : { dx: 0, dy: 0 };

          const config = playerConfigs[idx];
          const sprite = SpriteGenerator.generate('pawn', {
            seed,
            palette: PALETTE,
            overrides: { color: config.color },
          });

          return (
            <Image
              key={`pawn-${player.id}`}
              source={{ uri: sprite.uri }}
              style={[
                styles.pawn,
                {
                  top: row * CELL_SIZE + (CELL_SIZE - 32) / 2 + offset.dy,
                  left: col * CELL_SIZE + (CELL_SIZE - 32) / 2 + offset.dx,
                },
              ]}
            />
          );
        })}
      </View>

      {/* 3D Dice roller */}
      <Dice3D
        value={gameState.diceValue ?? null}
        isRolling={gameState.phase === 'rolling'}
        playerColor={currentPlayerConfig?.color ?? '#ffffff'}
        onRoll={handleStartRoll}
        onRollComplete={handleRollComplete}
      />

      {/* Current turn indicator */}
      <Text style={styles.turnIndicator}>
        Vez de: {currentPlayerConfig?.name ?? `Jogador ${currentPlayer.id + 1}`}
      </Text>

      {/* Win overlay */}
      {gameState.phase === 'game-over' && gameState.winner !== null && (
        <View style={styles.winOverlay}>
          <Text style={styles.winText}>
            🎉 {playerConfigs[gameState.winner]?.name ?? `Jogador ${gameState.winner + 1}`} Venceu!
          </Text>
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
    padding: 16,
    backgroundColor: '#1b4332',
  },
  loadingText: {
    color: '#d8f3dc',
    fontSize: 20,
  },
  playerBar: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  playerIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2d6a4f',
    gap: 6,
  },
  activePlayer: {
    backgroundColor: '#40916c',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  playerName: {
    color: '#ffffff',
    fontSize: 13,
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
  turnIndicator: {
    color: '#d8f3dc',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '600',
  },
  winOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  playAgainButton: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    backgroundColor: '#52b788',
    borderRadius: 10,
  },
  playAgainText: {
    color: '#1b4332',
    fontSize: 18,
    fontWeight: 'bold',
  },
});