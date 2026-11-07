/**
 * Generic file mock for Jest moduleNameMapper.
 * Maps binary asset imports (.mp3, .wav, .png, etc.) to a stub object
 * with a uri property so that SoundRegistry and other asset consumers
 * resolve gracefully in the test environment.
 */
export default { uri: 'mock://asset-placeholder' };