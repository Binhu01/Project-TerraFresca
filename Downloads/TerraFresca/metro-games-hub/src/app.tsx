import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './navigation/AppNavigator';
import { GameRegistry } from './shared/games/GameRegistry';
import { ChessModule } from './games/chess';
import { CobrasEscadasModule } from './games/cobras-escadas';
import { DamasModule } from './games/damas';
import { LudoModule } from './games/ludo';
import { CorridaPixelModule } from './games/corrida';
import { RotationPrompt } from './shared/ui/RotationPrompt';

GameRegistry.register(ChessModule);
GameRegistry.register(CobrasEscadasModule);
GameRegistry.register(DamasModule);
GameRegistry.register(LudoModule);
GameRegistry.register(CorridaPixelModule);

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
