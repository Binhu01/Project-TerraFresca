/**
 * Race Tile Grass SVG template.
 * Generates a 32x32 green grass tile with pixel noise variation.
 */

import { mulberry32 } from '../../utils/prng';

/** Overrides for race tile grass template. */
export interface RaceTileGrassOverrides {}

export function generateRaceTileGrass(seed: number, palette: string[], _overrides?: RaceTileGrassOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const baseColor = palette[0] ?? '#4CAF50';
  const darkColor = palette[1] ?? '#2E7D32';

  // Generate deterministic grass blade-like noise
  let noiseRects = '';
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (rng() > 0.5) {
        const opacity = (0.15 + rng() * 0.25).toFixed(2);
        noiseRects += `<rect x="${x}" y="${y}" width="2" height="2" fill="${darkColor}" opacity="${opacity}"/>\n`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base grass -->
<rect width="${W}" height="${H}" fill="${baseColor}"/>
<!-- Grass texture -->
${noiseRects}</svg>`;

  return svg;
}
