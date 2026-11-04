import type React from 'react';

export interface GameMetadata {
  id: string;
  name: string;
  iconSeed: number; // seed for SpriteGenerator to produce game icon
  minPlayers: number;
  maxPlayers: number;
  type: 'turn-based' | 'real-time';
}

export interface GameModule {
  metadata: GameMetadata;
  Component: React.ComponentType<{ players: number; onExit: () => void }>;
  cleanup: () => void;
}
