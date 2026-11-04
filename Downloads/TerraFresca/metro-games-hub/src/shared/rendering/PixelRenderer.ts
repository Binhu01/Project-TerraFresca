import type React from 'react';

export interface SpriteSpec {
  uri: string;
  width: number;
  height: number;
}

export interface PixelRendererProps {
  sprite: SpriteSpec;
  x: number;
  y: number;
  scale?: number;
  palette?: string[]; // hex colors, max 256
}

export interface PixelRenderer {
  Sprite: React.ComponentType<PixelRendererProps>;
  Canvas: React.ComponentType<{ width: number; height: number; children: React.ReactNode }>;
}