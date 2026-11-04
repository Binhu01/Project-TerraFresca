import React from 'react';
import { render } from '@testing-library/react-native';
import { CobrasEscadasGame } from '../CobrasEscadasGame';

// Mock dependencies
jest.mock('../../../shared/rendering/PixelRendererFactory', () => ({
  PixelRendererFactory: { create: jest.fn(() => ({ render: jest.fn() })) },
}));
jest.mock('../../../shared/audio/AudioManager', () => ({
  AudioManager: {
    playMusic: jest.fn(),
    stopMusic: jest.fn(),
    playSFX: jest.fn(),
    cleanup: jest.fn(),
  },
}));
jest.mock('../../../shared/assets/SpriteGenerator', () => ({
  SpriteGenerator: {
    generate: jest.fn(() => ({ uri: 'data:image/svg+xml;base64,mock', width: 48, height: 48 })),
  },
}));

test('renders board with player indicators', async () => {
  const { getByText } = await render(<CobrasEscadasGame playerCount={2} />);
  expect(getByText(/Player 1/i)).toBeTruthy();
  expect(getByText(/Player 2/i)).toBeTruthy();
});

test('shows dice interaction area', async () => {
  const { getByTestId } = await render(<CobrasEscadasGame playerCount={2} />);
  // DiceRoller component will be added in Task 4b; for now verify placeholder exists
  expect(getByTestId('dice-area')).toBeTruthy();
});

test('calls AudioManager.playMusic on mount', async () => {
  const { AudioManager } = require('../../../shared/audio/AudioManager');
  await render(<CobrasEscadasGame playerCount={2} />);
  expect(AudioManager.playMusic).toHaveBeenCalled();
});

test('calls AudioManager.cleanup on unmount', async () => {
  const { AudioManager } = require('../../../shared/audio/AudioManager');
  const { unmount } = await render(<CobrasEscadasGame playerCount={2} />);
  unmount();
  expect(AudioManager.cleanup).toHaveBeenCalled();
});
