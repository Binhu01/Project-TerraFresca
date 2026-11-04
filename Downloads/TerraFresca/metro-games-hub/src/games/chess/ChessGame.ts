import React from 'react';
import type { GameModule } from '../../shared/games/GameModule';

const ChessComponent: React.FC<{ players: number; onExit: () => void }> = ({ players, onExit }) => {
  // Placeholder — real chess UI will be implemented later
  return React.createElement(React.Fragment, null, `Chess (${players}p) — placeholder`);
};

export const ChessGame: GameModule = {
  metadata: {
    id: 'chess',
    name: 'Chess',
    iconSeed: 42,
    minPlayers: 2,
    maxPlayers: 2,
    type: 'turn-based',
  },
  Component: ChessComponent,
  cleanup: () => {
    // No resources to release yet
  },
};
