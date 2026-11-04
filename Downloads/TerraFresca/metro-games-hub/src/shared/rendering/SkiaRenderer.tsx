import React from 'react';
import {
  Canvas as SkiaCanvas,
  Image as SkiaImage,
  FilterMode,
  MipmapMode,
} from '@shopify/react-native-skia';
import type { PixelRenderer, PixelRendererProps } from './PixelRenderer';

/**
 * Skia-backed PixelRenderer implementation.
 * Uses nearest-neighbor sampling for crisp pixel-art scaling.
 */

const SkiaSprite: React.FC<PixelRendererProps> = ({ sprite, x, y, scale = 1 }) => {
  const width = sprite.width * scale;
  const height = sprite.height * scale;

  return (
    <SkiaImage
      image={null}
      x={x}
      y={y}
      width={width}
      height={height}
      fit="fill"
      sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
    />
  );
};

const SkiaCanvasWrapper: React.FC<{ width: number; height: number; children: React.ReactNode }> = ({
  width,
  height,
  children,
}) => {
  return (
    <SkiaCanvas style={{ width, height }}>
      {children}
    </SkiaCanvas>
  );
};

export const SkiaRenderer: PixelRenderer = {
  Sprite: SkiaSprite,
  Canvas: SkiaCanvasWrapper,
};