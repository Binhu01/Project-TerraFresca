import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { GameModule } from '../../shared/games/GameModule';
import { CobrasEscadasGame } from './CobrasEscadasGame';
import { AudioManager } from '../../shared/audio/AudioManager';

/**
 * Adapter component that bridges the GameModule interface props
 * ({ players, onExit }) to CobrasEscadasGame's props ({ playerCount }).
 * Provides an exit button so users can navigate back to MetroHub.
 */
const CobrasEscadasAdapter: React.FC<{ players: number; onExit: () => void }> = ({
  players,
  onExit,
}) => {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.exitButton}
        onPress={onExit}
        accessibilityLabel="Exit game"
        accessibilityRole="button"
      >
        <Text style={styles.exitButtonText}>← Exit</Text>
      </TouchableOpacity>
      <CobrasEscadasGame playerCount={players} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  exitButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 6,
  },
  exitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export const CobrasEscadasModule: GameModule = {
  metadata: {
    id: 'cobras-escadas',
    name: 'Cobras e Escadas',
    iconSeed: 20,
    minPlayers: 2,
    maxPlayers: 4,
    type: 'turn-based',
  },
  Component: CobrasEscadasAdapter,
  cleanup: () => {
    AudioManager.cleanup();
  },
};