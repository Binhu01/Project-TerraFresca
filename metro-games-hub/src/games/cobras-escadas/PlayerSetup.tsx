/**
 * Player setup screen for Cobras e Escadas.
 * Allows selecting player count (2-4) and customizing names before starting the game.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const PLAYER_COLORS = ['#E52B28', '#1E70E2', '#4CAF50', '#FFEB3B'];
const DEFAULT_NAMES = ['Jogador 1', 'Jogador 2', 'Jogador 3', 'Jogador 4'];

interface PlayerSetupProps {
  onStart: (players: { name: string; color: string }[]) => void;
}

export function PlayerSetup({ onStart }: PlayerSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState<string[]>([...DEFAULT_NAMES]);

  const handleNameChange = useCallback((index: number, value: string) => {
    setNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const handleStart = useCallback(() => {
    const players = Array.from({ length: playerCount }, (_, i) => ({
      name: names[i].trim() || DEFAULT_NAMES[i],
      color: PLAYER_COLORS[i],
    }));
    onStart(players);
  }, [playerCount, names, onStart]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cobras e Escadas</Text>
      <Text style={styles.subtitle}>Configurar Jogadores</Text>

      {/* Player count selector */}
      <View style={styles.countSelector}>
        {[2, 3, 4].map((count) => (
          <TouchableOpacity
            key={count}
            style={[
              styles.countButton,
              playerCount === count && styles.countButtonActive,
            ]}
            onPress={() => setPlayerCount(count)}
            accessibilityRole="radio"
            accessibilityState={{ selected: playerCount === count }}
          >
            <Text
              style={[
                styles.countText,
                playerCount === count && styles.countTextActive,
              ]}
            >
              {count} Jogadores
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Player name inputs */}
      <View style={styles.playersList}>
        {Array.from({ length: playerCount }, (_, i) => (
          <View key={i} style={styles.playerInputRow}>
            <View
              style={[styles.colorDot, { backgroundColor: PLAYER_COLORS[i] }]}
            />
            <TextInput
              style={styles.nameInput}
              value={names[i]}
              onChangeText={(text) => handleNameChange(i, text)}
              placeholder={DEFAULT_NAMES[i]}
              placeholderTextColor="#8D99AE"
              maxLength={15}
              accessibilityLabel={`Nome do jogador ${i + 1}`}
            />
          </View>
        ))}
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={handleStart}
        accessibilityRole="button"
        accessibilityLabel="Iniciar jogo"
      >
        <Text style={styles.startButtonText}>Iniciar Jogo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1b4332',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d8f3dc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#95d5b2',
    marginBottom: 32,
  },
  countSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  countButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2d6a4f',
    borderWidth: 2,
    borderColor: '#40916c',
  },
  countButtonActive: {
    backgroundColor: '#52b788',
    borderColor: '#74c69d',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#95d5b2',
  },
  countTextActive: {
    color: '#1b4332',
  },
  playersList: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
    marginBottom: 32,
  },
  playerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#2d6a4f',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#40916c',
  },
  startButton: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    backgroundColor: '#52b788',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b4332',
  },
});