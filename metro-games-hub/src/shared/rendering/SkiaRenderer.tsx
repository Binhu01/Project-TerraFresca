import React from 'react';
import {
  Canvas as SkiaCanvas,
  Image as SkiaImage,
  FilterMode,
  MipmapMode,
} from '@shopify/react-native-skia';
import type { PixelRenderer, PixelRendererProps } from './PixelRenderer';
import { useSpriteImage } from './useSpriteImage';

/**
 * Skia-backed PixelRenderer implementation.
 * Uses nearest-neighbor sampling for crisp pixel-art scaling.
 * Decodes SpriteSpec data URIs (base64 SVG) into SkImage via useSpriteImage.
 */

const SkiaSprite: React.FC<PixelRendererProps> = ({ sprite, x, y, scale = 1 }) => {
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const image = useSpriteImage(sprite);

  return (
    <SkiaImage
      image={image}
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