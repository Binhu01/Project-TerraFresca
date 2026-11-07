/**
 * Race Tile Barrier SVG template.
 * Generates a 32x32 red/white diagonal striped barrier tile.
 */

import { mulberry32 } from '../../utils/prng';

/** Overrides for race tile barrier template. */
export interface RaceTileBarrierOverrides {}

export function generateRaceTileBarrier(seed: number, palette: string[], _overrides?: RaceTileBarrierOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const redColor = palette[0] ?? '#E53935';
  const whiteColor = palette[1] ?? '#FFFFFF';

  // Deterministic stripe width variation
  const stripeWidth = 6 + Math.floor(rng() * 3);

  // Build diagonal stripes using a pattern
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<pattern id="barrier-stripes-${seed}" patternUnits="userSpaceOnUse" width="${stripeWidth * 2}" height="${stripeWidth * 2}" patternTransform="rotate(45)">
<rect width="${stripeWidth}" height="${stripeWidth * 2}" fill="${redColor}"/>
<rect x="${stripeWidth}" width="${stripeWidth}" height="${stripeWidth * 2}" fill="${whiteColor}"/>
</pattern>
</defs>
<!-- Background -->
<rect width="${W}" height="${H}" fill="${whiteColor}"/>
<!-- Diagonal stripes -->
<rect width="${W}" height="${H}" fill="url(#barrier-stripes-${seed})"/>
<!-- Border -->
<rect width="${W}" height="${H}" fill="none" stroke="${redColor}" stroke-width="1"/>
</svg>`;

  return svg;
}
