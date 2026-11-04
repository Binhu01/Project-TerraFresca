/**
 * Ludo game module export for GameRegistry.
 */

import type { GameModule } from '../../shared/games/GameModule';
import { LudoGame } from './LudoGame';

export const LudoModule: GameModule = {
  metadata: { id: 'ludo', name: 'Ludo', iconSeed: 91, minPlayers: 2, maxPlayers: 4, type: 'turn-based' },
  Component: LudoGame,
  cleanup: () => {},
};