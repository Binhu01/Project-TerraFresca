import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { GameRegistry } from '../shared/games/GameRegistry';
import { SpriteGenerator } from '../shared/assets/SpriteGenerator';
import type { RootStackParamList } from '../navigation/AppNavigator';

/** Metro-themed palette for hub sprites — warm transit tones, not generic purple. */
const STATION_PALETTE = [
  '#2B2D42', // dark steel
  '#8D99AE', // platform grey
  '#EDF2F4', // tile white
  '#EF233C', // signal red
  '#D90429', // accent red
  '#FFB703', // safety yellow
  '#FB8500', // amber light
];

type MetroHubNavProp = StackNavigationProp<RootStackParamList, 'MetroHub'>;

interface MetroHubProps {
  navigation: MetroHubNavProp;
}

export function MetroHub({ navigation }: MetroHubProps) {
  const games = GameRegistry.getAll();

  const handleSelectGame = (gameId: string) => {
    navigation.navigate('GameScreen', { gameId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metro Games Hub</Text>
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {games.map((game) => {
          const iconSprite = SpriteGenerator.generate('train-base', {
            seed: game.metadata.iconSeed,
            palette: STATION_PALETTE,
          });
          return (
            <TouchableOpacity
              key={game.metadata.id}
              testID="train-card"
              style={styles.card}
              onPress={() => handleSelectGame(game.metadata.id)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: iconSprite.uri }}
                style={[styles.icon, { width: iconSprite.width * 2, height: iconSprite.height * 2 }]}
                resizeMode="contain"
              />
              <Text style={styles.gameName}>{game.metadata.name}</Text>
              <Text style={styles.gameType}>{game.metadata.type}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2B2D42',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EDF2F4',
    textAlign: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    backgroundColor: '#8D99AE',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: 140,
  },
  icon: {
    marginBottom: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2D42',
    textAlign: 'center',
  },
  gameType: {
    fontSize: 12,
    color: '#2B2D42',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
