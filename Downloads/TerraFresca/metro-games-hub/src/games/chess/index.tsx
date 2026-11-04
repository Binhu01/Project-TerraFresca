/**
 * Xadrez (Chess) game module export for GameRegistry.
 */

import type { GameModule } from '../../shared/games/GameModule';
import { ChessGame } from './ChessGame';

export const ChessModule: GameModule = {
  metadata: {
    id: 'chess',
    name: 'Xadrez',
    iconSeed: 42,
    minPlayers: 2,
    maxPlayers: 2,
    type: 'turn-based',
  },
  Component: ChessGame,
  cleanup: () => {},
};
