import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { CobrasEscadasGame } from '../CobrasEscadasGame';

// Mock dependencies
jest.mock('../../../shared/rendering/PixelRendererFactory', () => ({
  PixelRendererFactory: { create: jest.fn(() => ({ render: jest.fn() })) },
}));
jest.mock('../../../shared/audio/AudioManager', () => ({
  AudioManager: {
    init: jest.fn().mockResolvedValue(undefined),
    playMusic: jest.fn(),
    stopMusic: jest.fn(),
    playSfx: jest.fn(),
    cleanup: jest.fn(),
  },
}));
jest.mock('../../../shared/audio/SoundRegistry', () => ({
  SoundRegistry: {
    resolve: jest.fn((name: string) => `mock://${name}`),
  },
}));
jest.mock('../../../shared/assets/SpriteGenerator', () => ({
  SpriteGenerator: {
    generate: jest.fn(() => ({ uri: 'data:image/svg+xml;base64,mock', width: 48, height: 48 })),
  },
}));

test('renders player setup screen initially', async () => {
  const { getByText } = await render(<CobrasEscadasGame playerCount={2} />);
  expect(getByText(/Configurar Jogadores/i)).toBeTruthy();
  expect(getByText(/Iniciar Jogo/i)).toBeTruthy();
});

test('shows player count selector options', async () => {
  const { getByText } = await render(<CobrasEscadasGame playerCount={2} />);
  expect(getByText(/2 Jogadores/i)).toBeTruthy();
  expect(getByText(/3 Jogadores/i)).toBeTruthy();
  expect(getByText(/4 Jogadores/i)).toBeTruthy();
});

test('transitions to game board after setup', async () => {
  const { getByText, getByTestId } = await render(<CobrasEscadasGame playerCount={2} />);

  // Press start button to begin game
  fireEvent.press(getByText(/Iniciar Jogo/i));

  // Should show dice area after setup
  await waitFor(() => {
    expect(getByTestId('dice-area')).toBeTruthy();
  });
});

test('calls AudioManager.playMusic on mount', async () => {
  const { AudioManager } = require('../../../shared/audio/AudioManager');
  await render(<CobrasEscadasGame playerCount={2} />);
  await waitFor(() => {
    expect(AudioManager.playMusic).toHaveBeenCalled();
  });
});

test('calls AudioManager.cleanup on unmount', async () => {
  const { AudioManager } = require('../../../shared/audio/AudioManager');
  const { unmount } = await render(<CobrasEscadasGame playerCount={2} />);
  unmount();
  expect(AudioManager.cleanup).toHaveBeenCalled();
});