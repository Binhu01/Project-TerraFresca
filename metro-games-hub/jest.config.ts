import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFiles: ['./src/__tests__/setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/setup\\.ts$',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/react-native-skia|expo-gl|expo-av|expo-screen-orientation|expo-font)',
  ],
  moduleNameMapper: {
    '\\.(mp3|wav|ogg|m4a)$': '<rootDir>/src/__tests__/__mocks__/fileMock.ts',
  },
};

export default config;