import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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

  useEffect(() => {
    return () => {
      if (game) {
        game.cleanup();
      }
    };
  }, [game]);

  if (!game) {
    return (
      <View style={styles.container}>
        {/* Game not found — could show error UI later */}
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
  },
});