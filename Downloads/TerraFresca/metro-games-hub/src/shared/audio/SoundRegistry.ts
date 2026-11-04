/**
 * SoundRegistry maps symbolic sound names to Expo asset references.
 * AudioManager.playMusic/playSfx accept URIs; this registry resolves
 * human-readable identifiers (e.g. 'board-game', 'dice-roll') to
 * actual asset URIs that expo-av can load.
 *
 * When a sound asset is not yet available, resolve() returns null and
 * callers should treat it as a no-op rather than crashing.
 */

type AssetRef = number | { uri: string };

const SOUND_MAP: Record<string, AssetRef | null> = {
  // Background music
  'board-game': null, // TODO: require('../../assets/sounds/board-game.mp3')

  // SFX
  'dice-roll': null, // TODO: require('../../assets/sounds/dice-roll.mp3')
  'dice-land': null, // TODO: require('../../assets/sounds/dice-land.mp3')

  // Damas Brasileiras
  'damas-move': null, // TODO: require('../../assets/sounds/damas-move.mp3')
  'damas-capture': null, // TODO: require('../../assets/sounds/damas-capture.mp3')
  'damas-promote': null, // TODO: require('../../assets/sounds/damas-promote.mp3')
  'damas-win': null, // TODO: require('../../assets/sounds/damas-win.mp3')
};

export const SoundRegistry = {
  /**
   * Resolve a symbolic sound name to a URI string suitable for
   * Audio.Sound.createAsync({ uri }). Returns null when the asset
   * is not yet registered or the name is unknown.
   */
  resolve(name: string): string | null {
    const ref = SOUND_MAP[name];
    if (ref === null || ref === undefined) {
      return null;
    }
    if (typeof ref === 'number') {
      // Expo require() asset — convert to URI via Asset.fromModule
      // For now, numeric assets are not used; placeholder returns null above.
      return null;
    }
    return ref.uri;
  },
};
