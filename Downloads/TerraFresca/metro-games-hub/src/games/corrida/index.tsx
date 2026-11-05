/**
 * Corrida Pixel game module export for GameRegistry.
 */

import type { GameModule } from '../../shared/games/GameModule';
import { CorridaPixelGame } from './CorridaPixelGame';

export const CorridaPixelModule: GameModule = {
  metadata: {
    id: 'corrida-pixel',
    name: 'Corrida Pixel',
    iconSeed: 99,
    minPlayers: 2,
    maxPlayers: 2,
    type: 'real-time',
  },
  Component: CorridaPixelGame,
  cleanup: () => {},
};
