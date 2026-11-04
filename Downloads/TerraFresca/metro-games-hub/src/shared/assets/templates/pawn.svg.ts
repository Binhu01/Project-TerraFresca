/**
 * Pawn SVG template for Cobras e Escadas.
 * Generates a 32x32 pixel art pawn in one of 4 colors.
 * Color selection and shape variations are derived from seed.
 */

import { mulberry32 } from '../../utils/prng';

const PAWN_COLORS: Record<string, [string, string]> = {
  red: ['#E03030', '#A02020'],
  blue: ['#3060D0', '#204090'],
  green: ['#30B050', '#208038'],
  yellow: ['#FFD700', '#CCA800'],
};

export function generatePawn(seed: number, palette: string[]): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  // Pick color from seed — cycle through the 4 pawn colors
  const colorKeys = Object.keys(PAWN_COLORS) as Array<keyof typeof PAWN_COLORS>;
  const colorKey = colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, shadowColor] = PAWN_COLORS[colorKey];

  // Outline color
  const outline = palette[0] ?? '#000000';

  // Highlight
  const highlight = palette[1] ?? '#FFFFFF';

  // Seed-dependent variations for visual uniqueness
  const baseRx = 9 + rng() * 2;
  const bodyWidth = 9 + Math.floor(rng() * 3);
  const bodyX = 16 - Math.floor(bodyWidth / 2);
  const headR = 4.5 + rng() * 1.5;
  const highlightX = 13 + rng() * 2;
  const highlightY = 6 + rng() * 2;
  const shadowOpacity = 0.3 + rng() * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base -->
<ellipse cx="16" cy="28" rx="${baseRx.toFixed(1)}" ry="3" fill="${shadowColor}" stroke="${outline}" stroke-width="1"/>
<!-- Body -->
<rect x="${bodyX}" y="16" width="${bodyWidth}" height="12" rx="2" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Neck -->
<rect x="13" y="12" width="6" height="5" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Head -->
<circle cx="16" cy="9" r="${headR.toFixed(1)}" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Highlight on head -->
<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="1.5" fill="${highlight}" opacity="0.6"/>
<!-- Shadow on body -->
<rect x="17" y="18" width="3" height="8" rx="1" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>
</svg>`;

  return svg;
}
