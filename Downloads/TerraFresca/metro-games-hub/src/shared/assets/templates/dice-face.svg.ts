/**
 * Dice face SVG template for Cobras e Escadas.
 * Generates a 96x96 BG3-style dice face parameterized by seed.
 * Face value (1-6) is derived from seed.
 */

import { mulberry32 } from '../../utils/prng';

// Pip positions for each face value on a 96x96 grid
// Each position is [cx, cy]
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[48, 48]],
  2: [[28, 28], [68, 68]],
  3: [[28, 28], [48, 48], [68, 68]],
  4: [[28, 28], [68, 28], [28, 68], [68, 68]],
  5: [[28, 28], [68, 28], [48, 48], [28, 68], [68, 68]],
  6: [[28, 28], [68, 28], [28, 48], [68, 48], [28, 68], [68, 68]],
};

/** Overrides for dice-face template. */
export interface DiceFaceOverrides {
  face?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function generateDiceFace(seed: number, palette: string[], overrides?: DiceFaceOverrides): string {
  const rng = mulberry32(seed);
  const W = 96;
  const H = 96;

  // Use explicit face override if provided, otherwise derive from seed
  const face = overrides?.face ?? (1 + Math.floor(rng() * 6));

  // Die body color — light with subtle variation
  const bodyColor = palette[1] ?? '#FFFFFF';
  const bodyShadow = palette[4] ?? '#C0C0C0';

  // Pip color
  const pipColor = palette[0] ?? '#000000';

  // Border
  const borderColor = palette[2] ?? '#4A4A4A';

  // Corner radius for rounded die look
  const cornerR = 12;

  // Generate pips
  const pips = PIP_POSITIONS[face] ?? PIP_POSITIONS[1];
  const pipRadius = 7;
  let pipSvg = '';
  for (const [cx, cy] of pips) {
    pipSvg += `<circle cx="${cx}" cy="${cy}" r="${pipRadius}" fill="${pipColor}"/>`;
  }

  // Subtle inner shadow for depth
  const shadowOpacity = 0.08 + rng() * 0.06;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Die body -->
<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${cornerR}" ry="${cornerR}" fill="${bodyColor}" stroke="${borderColor}" stroke-width="2"/>
<!-- Inner shadow for depth -->
<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="${cornerR - 2}" ry="${cornerR - 2}" fill="${bodyShadow}" opacity="${shadowOpacity.toFixed(2)}"/>
<!-- Pips -->
${pipSvg}
<!-- Top-left highlight -->
<ellipse cx="28" cy="24" rx="14" ry="8" fill="${palette[1] ?? '#FFFFFF'}" opacity="0.15" transform="rotate(-20 28 24)"/>
</svg>`;

  return svg;
}
