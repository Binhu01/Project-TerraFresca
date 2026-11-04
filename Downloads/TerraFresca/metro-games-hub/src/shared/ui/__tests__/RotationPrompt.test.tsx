import React from 'react';
import { render } from '@testing-library/react-native';
import { RotationPrompt } from '../RotationPrompt';
import * as ScreenOrientation from 'expo-screen-orientation';

test('shows prompt when orientation is portrait', async () => {
  jest.spyOn(ScreenOrientation, 'getOrientationAsync').mockResolvedValue(
    ScreenOrientation.Orientation.PORTRAIT_UP
  );
  const { getByText } = await render(<RotationPrompt />);
  expect(getByText(/gire o dispositivo/i)).toBeTruthy();
});

test('hides prompt when orientation is landscape', async () => {
  jest.spyOn(ScreenOrientation, 'getOrientationAsync').mockResolvedValue(
    ScreenOrientation.Orientation.LANDSCAPE_LEFT
  );
  const { queryByText } = await render(<RotationPrompt />);
  expect(queryByText(/gire o dispositivo/i)).toBeNull();
});
