import { Audio } from 'expo-av';

type Sound = Audio.Sound;

let initialized = false;
let volume = 1.0;
let previousVolume = 1.0;
let currentMusic: Sound | null = null;
const activeSfx: Set<Sound> = new Set();

function assertInitialized(): void {
  if (!initialized) {
    throw new Error('AudioManager not initialized. Call AudioManager.init() first.');
  }
}

export const AudioManager = {
  async init(): Promise<void> {
    initialized = true;
  },

  async playMusic(uri: string, loop: boolean = false): Promise<void> {
    assertInitialized();

    // Stop and unload any currently playing music
    if (currentMusic) {
      try {
        await currentMusic.stopAsync();
        await currentMusic.unloadAsync();
      } catch {
        // Ignore errors during cleanup of old track
      }
      currentMusic = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, isLooping: loop, volume }
    );
    currentMusic = sound;
  },

  async playSfx(uri: string): Promise<void> {
    assertInitialized();

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume }
    );
    activeSfx.add(sound);

    // Auto-cleanup when done playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        sound.unloadAsync().then(() => activeSfx.delete(sound)).catch(() => {});
      }
    });
  },

  /**
   * Set master volume (0–1). Setting to 0 is equivalent to mute but does NOT
   * store the pre-mute level — use mute()/unmute() for toggle semantics.
   */
  setVolume(level: number): void {
    volume = Math.max(0, Math.min(1, level));
    if (volume > 0) {
      previousVolume = volume;
    }
  },

  getVolume(): number {
    return volume;
  },

  /** Store current volume and set to 0. Idempotent if already muted. */
  mute(): void {
    previousVolume = volume || previousVolume;
    volume = 0;
  },

  /** Restore volume to the level saved before mute(). No-op if not muted. */
  unmute(): void {
    volume = previousVolume;
  },

  async cleanup(): Promise<void> {
    if (currentMusic) {
      try {
        await currentMusic.stopAsync();
        await currentMusic.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      currentMusic = null;
    }

    for (const sfx of activeSfx) {
      try {
        await sfx.stopAsync();
        await sfx.unloadAsync();
      } catch {
        // Ignore cleanup errors
      }
    }
    activeSfx.clear();

    initialized = false;
    volume = 1.0;
    previousVolume = 1.0;
  },
};
