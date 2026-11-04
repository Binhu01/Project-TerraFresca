import { AudioManager } from '../AudioManager';

beforeEach(() => AudioManager.cleanup());

test('init loads without error', async () => {
  await expect(AudioManager.init()).resolves.toBeUndefined();
});

test('playMusic after init does not throw', async () => {
  await AudioManager.init();
  await expect(AudioManager.playMusic('test.mp3', true)).resolves.toBeUndefined();
});

test('play before init throws descriptive error', async () => {
  await expect(AudioManager.playMusic('test.mp3')).rejects.toThrow(/not initialized/);
});

test('mute sets volume to 0', async () => {
  await AudioManager.init();
  AudioManager.mute();
  expect(AudioManager.getVolume()).toBe(0);
});

test('unmute restores previous volume', async () => {
  await AudioManager.init();
  AudioManager.setVolume(0.7);
  AudioManager.mute();
  AudioManager.unmute();
  expect(AudioManager.getVolume()).toBe(0.7);
});
