/**
 * Damas Brasileiras game module export for GameRegistry.
 */

import type { GameModule } from '../../shared/games/GameModule';
import { DamasGame } from './DamasGame';

export const DamasModule: GameModule = {
  metadata: { id: 'damas', name: 'Damas', iconSeed: 73, minPlayers: 2, maxPlayers: 2, type: 'turn-based' },
  Component: DamasGame,
  cleanup: () => {},
};
