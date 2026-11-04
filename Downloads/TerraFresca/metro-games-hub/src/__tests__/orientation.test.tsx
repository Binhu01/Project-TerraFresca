import * as ScreenOrientation from 'expo-screen-orientation';
import { render, act } from '@testing-library/react-native';
import App from '../app';

const mockLockAsync = ScreenOrientation.lockAsync as jest.Mock;

test('app locks to landscape on mount', async () => {
  await act(async () => {
    render(<App />);
  });
  expect(mockLockAsync).toHaveBeenCalledWith(
    ScreenOrientation.OrientationLock.LANDSCAPE
  );
});