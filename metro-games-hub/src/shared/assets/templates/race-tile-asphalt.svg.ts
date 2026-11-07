/**
 * Race Tile Asphalt SVG template.
 * Generates a 32x32 dark gray asphalt tile with subtle noise texture.
 */

import { mulberry32 } from '../../utils/prng';

/** Overrides for race tile asphalt template. */
export interface RaceTileAsphaltOverrides {}

export function generateRaceTileAsphalt(seed: number, palette: string[], _overrides?: RaceTileAsphaltOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const baseColor = palette[0] ?? '#424242';
  const noiseColor = palette[1] ?? '#616161';

  // Generate deterministic noise pixels
  let noiseRects = '';
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (rng() > 0.65) {
        const opacity = (0.1 + rng() * 0.2).toFixed(2);
        noiseRects += `<rect x="${x}" y="${y}" width="2" height="2" fill="${noiseColor}" opacity="${opacity}"/>\n`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base asphalt -->
<rect width="${W}" height="${H}" fill="${baseColor}"/>
<!-- Noise texture -->
${noiseRects}</svg>`;

  return svg;
}
