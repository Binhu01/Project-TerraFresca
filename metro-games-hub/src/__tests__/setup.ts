// Jest test setup for Metro Games Hub
// Mocks and global configuration for tests

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(),
  unlockAsync: jest.fn(),
  getOrientationAsync: jest.fn().mockResolvedValue(3),
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  removeOrientationChangeListener: jest.fn(),
  Orientation: {
    PORTRAIT_UP: 1,
    PORTRAIT_DOWN: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
    UNKNOWN: 0,
  },
  OrientationLock: {
    DEFAULT: 0,
    ALL: 1,
    PORTRAIT: 2,
    PORTRAIT_UP: 3,
    PORTRAIT_DOWN: 4,
    LANDSCAPE: 5,
    LANDSCAPE_LEFT: 6,
    LANDSCAPE_RIGHT: 7,
    OTHER: 8,
    UNKNOWN: 9,
  },
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  }),
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => children,
  Image: () => null,
  useCanvasRef: () => ({ current: null }),
  useImage: () => null,
  Skia: { Image: { MakeFromEncoded: () => null } },
  FilterMode: { Nearest: 0, Linear: 1 },
  MipmapMode: { None: 0, Nearest: 1, Linear: 2 },
}));

jest.mock('expo-gl', () => ({
  GLView: ({ children }: { children: React.ReactNode }) => children,
  createContextAsync: jest.fn(),
}));

jest.mock('expo-av', () => {
  const mockSound = {
    playAsync: jest.fn().mockResolvedValue({ isPlaying: true }),
    stopAsync: jest.fn().mockResolvedValue({ isPlaying: false }),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setVolumeAsync: jest.fn().mockResolvedValue(undefined),
    setIsLoopingAsync: jest.fn().mockResolvedValue(undefined),
    getStatusAsync: jest.fn().mockResolvedValue({ isLoaded: true }),
  };
  return {
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue({ sound: mockSound, status: { isLoaded: true } }),
      },
    },
  };
});