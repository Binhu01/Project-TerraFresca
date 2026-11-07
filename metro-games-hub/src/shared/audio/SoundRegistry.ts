/**
 * SoundRegistry maps symbolic sound names to Expo asset references.
 * AudioManager.playMusic/playSfx accept URIs; this registry resolves
 * human-readable identifiers (e.g. 'board-game', 'dice-roll') to
 * actual asset URIs that expo-av can load.
 *
 * Assets are loaded via require() so Metro bundler includes them in
 * the app bundle. Placeholder WAV files are used until real audio
 * assets are produced.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const req = (mod: unknown): string | null => {
  if (mod === null || mod === undefined) return null;
  // Metro returns either a number (asset ID) or an object with uri
  if (typeof mod === 'object' && mod !== null && 'uri' in mod) {
    return (mod as { uri: string }).uri;
  }
  // Numeric asset reference — expo-av can resolve these via Asset.fromModule
  // but we return null here and let callers handle it gracefully
  return null;
};

const SOUND_MAP: Record<string, string | null> = {
  // Background music
  'board-game': req(require('../../assets/sounds/board-game.mp3')),

  // SFX
  'dice-roll': req(require('../../assets/sounds/dice-roll.mp3')),
  'dice-land': req(require('../../assets/sounds/dice-land.mp3')),

  // Damas Brasileiras
  'damas-move': req(require('../../assets/sounds/damas-move.mp3')),
  'damas-capture': req(require('../../assets/sounds/damas-capture.mp3')),
  'damas-promote': req(require('../../assets/sounds/damas-promote.mp3')),
  'damas-win': req(require('../../assets/sounds/damas-win.mp3')),

  // Ludo
  'ludo-roll': req(require('../../assets/sounds/ludo-roll.mp3')),
  'ludo-move': req(require('../../assets/sounds/ludo-move.mp3')),
  'ludo-capture': req(require('../../assets/sounds/ludo-capture.mp3')),
  'ludo-enter-home': req(require('../../assets/sounds/ludo-enter-home.mp3')),
  'ludo-finish': req(require('../../assets/sounds/ludo-finish.mp3')),
  'ludo-win': req(require('../../assets/sounds/ludo-win.mp3')),

  // Chess (Xadrez)
  'chess-move': req(require('../../assets/sounds/chess-move.mp3')),
  'chess-capture': req(require('../../assets/sounds/chess-capture.mp3')),
  'chess-check': req(require('../../assets/sounds/chess-check.mp3')),
  'chess-castling': req(require('../../assets/sounds/chess-castling.mp3')),
  'chess-promotion': req(require('../../assets/sounds/chess-promotion.mp3')),
  'chess-checkmate': req(require('../../assets/sounds/chess-checkmate.mp3')),
  'chess-stalemate': req(require('../../assets/sounds/chess-stalemate.mp3')),

  // Corrida Pixel
  'race-engine': req(require('../../assets/sounds/race-engine.mp3')),
  'race-collision': req(require('../../assets/sounds/race-collision.mp3')),
  'race-lap': req(require('../../assets/sounds/race-lap.mp3')),
  'race-countdown': req(require('../../assets/sounds/race-countdown.mp3')),
  'race-finish': req(require('../../assets/sounds/race-finish.mp3')),
  'race-bg': req(require('../../assets/sounds/race-bg.mp3')),
};

export const SoundRegistry = {
  /**
   * Resolve a symbolic sound name to a URI string suitable for
   * Audio.Sound.createAsync({ uri }). Returns null when the asset
   * is not yet registered or the name is unknown.
   */
  resolve(name: string): string | null {
    return SOUND_MAP[name] ?? null;
  },
};