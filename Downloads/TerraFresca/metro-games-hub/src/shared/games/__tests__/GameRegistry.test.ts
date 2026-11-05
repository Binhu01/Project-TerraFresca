import React from 'react';
import { View } from 'react-native';
import { GameRegistry } from '../GameRegistry';
import type { GameModule } from '../GameModule';

/** Minimal valid React component for test mocks — avoids null-component pitfalls. */
function MockGameComponent() {
  return React.createElement(View, { testID: 'mock-game' });
}

const mockGame: GameModule = {
  metadata: { id: 'test', name: 'Test', iconSeed: 1, minPlayers: 2, maxPlayers: 2, type: 'turn-based' },
  Component: MockGameComponent,
  cleanup: jest.fn(),
};

beforeEach(() => GameRegistry.clear());

test('register and retrieve by id', () => {
  GameRegistry.register(mockGame);
  expect(GameRegistry.get('test')).toBe(mockGame);
});

test('getAll returns registered games in registration order', () => {
  GameRegistry.register(mockGame);
  expect(GameRegistry.getAll()).toHaveLength(1);
});

test('get unknown id returns undefined', () => {
  expect(GameRegistry.get('nope')).toBeUndefined();
});

test('duplicate id throws', () => {
  GameRegistry.register(mockGame);
  expect(() => GameRegistry.register(mockGame)).toThrow(/already registered/);
});
