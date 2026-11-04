import React from 'react';
import { render } from '@testing-library/react-native';
import { MetroHub } from '../MetroHub';
import { GameRegistry } from '../../shared/games/GameRegistry';
import type { GameModule } from '../../shared/games/GameModule';

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
} as any;

const mockGame: GameModule = {
  metadata: { id: 'chess', name: 'Xadrez', iconSeed: 10, minPlayers: 2, maxPlayers: 2, type: 'turn-based' },
  Component: () => null,
  cleanup: jest.fn(),
};

beforeEach(() => {
  GameRegistry.clear();
  GameRegistry.register(mockGame);
});

test('renders one train per registered game', async () => {
  const { getAllByTestId } = await render(<MetroHub navigation={mockNavigation} />);
  expect(getAllByTestId('train-card')).toHaveLength(1);
});

test('displays game name on train', async () => {
  const { getByText } = await render(<MetroHub navigation={mockNavigation} />);
  expect(getByText('Xadrez')).toBeTruthy();
});
