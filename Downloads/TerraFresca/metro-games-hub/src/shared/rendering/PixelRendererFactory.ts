import type { PixelRenderer } from './PixelRenderer';

let cachedRenderer: PixelRenderer | null = null;

/**
 * Factory that selects the best available rendering backend.
 * Prefers @shopify/react-native-skia; falls back to expo-gl.
 * Result is cached after first call.
 */
export const PixelRendererFactory = {
  create(): PixelRenderer {
    if (cachedRenderer) {
      return cachedRenderer;
    }

    try {
      // Runtime check: attempt to require Skia.
      // In test environments the mock satisfies this.
      // On device, this succeeds when the native module is linked.
      require('@shopify/react-native-skia');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { SkiaRenderer } = require('./SkiaRenderer');
      cachedRenderer = SkiaRenderer;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GLRenderer } = require('./GLRenderer');
      cachedRenderer = GLRenderer;
    }

    return cachedRenderer!;
  },

  /** Reset cache — exposed for testing only. */
  _resetCache(): void {
    cachedRenderer = null;
  },
};