import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './navigation/AppNavigator';
import { GameRegistry } from './shared/games/GameRegistry';
import { ChessGame } from './games/chess/ChessGame';
import { RotationPrompt } from './shared/ui/RotationPrompt';

GameRegistry.register(ChessGame);

export default function App() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return (
    <>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
      <RotationPrompt />
    </>
  );
}