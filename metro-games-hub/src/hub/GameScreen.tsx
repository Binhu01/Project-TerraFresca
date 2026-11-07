import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { GameRegistry } from '../shared/games/GameRegistry';
import type { RootStackParamList } from '../navigation/AppNavigator';

type GameScreenNavProp = StackNavigationProp<RootStackParamList, 'GameScreen'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'GameScreen'>;

interface GameScreenProps {
  navigation: GameScreenNavProp;
  route: GameScreenRouteProp;
}

export function GameScreen({ navigation, route }: GameScreenProps) {
  const { gameId } = route.params;
  const game = GameRegistry.get(gameId);

  // Use stable gameId string as dependency instead of game object reference
  // to prevent premature cleanup if GameRegistry returns a new object identity.
  useEffect(() => {
    const currentGame = GameRegistry.get(gameId);
    return () => {
      if (currentGame) {
        currentGame.cleanup();
      }
    };
  }, [gameId]);

  if (!game) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Jogo não encontrado: {gameId}</Text>
      </View>
    );
  }

  const handleExit = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <game.Component players={game.metadata.minPlayers} onExit={handleExit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2B2D42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EDF2F4',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
