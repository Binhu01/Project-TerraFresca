import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DiceRoller } from '../DiceRoller';

jest.mock('../../../shared/assets/SpriteGenerator', () => ({
  SpriteGenerator: {
    generate: jest.fn(() => ({ uri: 'data:image/svg+xml;base64,mock', width: 96, height: 96 })),
  },
}));
jest.mock('../../../shared/audio/AudioManager', () => ({
  AudioManager: {
    playSfx: jest.fn(),
  },
}));

test('renders dice face image at 96x96', async () => {
  const { getByTestId } = await render(
    <DiceRoller value={null} isRolling={false} playerColor="red" onRoll={() => {}} onRollComplete={() => {}} />
  );
  const diceImage = getByTestId('dice-face');
  // Style is an array: [baseStyle, { transform }]
  const styleArr = diceImage.props.style;
  const baseStyle = Array.isArray(styleArr) ? styleArr[0] : styleArr;
  expect(baseStyle.width).toBe(96);
  expect(baseStyle.height).toBe(96);
});

test('shows face 1 when value is null (initial state)', async () => {
  const { SpriteGenerator } = require('../../../shared/assets/SpriteGenerator');
  await render(
    <DiceRoller value={null} isRolling={false} playerColor="red" onRoll={() => {}} onRollComplete={() => {}} />
  );
  expect(SpriteGenerator.generate).toHaveBeenCalledWith(
    'dice-face',
    expect.objectContaining({ overrides: { face: 1 } })
  );
});

test('calls onRoll when pressed and not rolling', async () => {
  const onRoll = jest.fn();
  const { getByTestId } = await render(
    <DiceRoller value={3} isRolling={false} playerColor="blue" onRoll={onRoll} onRollComplete={() => {}} />
  );
  fireEvent.press(getByTestId('dice-area'));
  expect(onRoll).toHaveBeenCalledTimes(1);
});

test('does not call onRoll when already rolling', async () => {
  const onRoll = jest.fn();
  const { getByTestId } = await render(
    <DiceRoller value={3} isRolling={true} playerColor="blue" onRoll={onRoll} onRollComplete={() => {}} />
  );
  fireEvent.press(getByTestId('dice-area'));
  expect(onRoll).not.toHaveBeenCalled();
});

test('has correct accessibility label', async () => {
  const { getByTestId } = await render(
    <DiceRoller value={5} isRolling={false} playerColor="green" onRoll={() => {}} onRollComplete={() => {}} />
  );
  expect(getByTestId('dice-area').props.accessibilityLabel).toContain('5');
});
