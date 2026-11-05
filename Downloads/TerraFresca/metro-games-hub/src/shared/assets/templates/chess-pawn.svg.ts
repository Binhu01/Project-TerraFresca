/**
 * Chess Pawn SVG template.
 * Generates a 32x32 pixel art pawn piece with round head and tapered body.
 * Color is derived from seed or overridden via { color }.
 */

import { mulberry32 } from '../../utils/prng';

const CHESS_COLORS: Record<string, [string, string]> = {
  white: ['#F0E8D0', '#C8B898'],
  black: ['#404040', '#1A1A1A'],
};

/** Overrides for chess pawn template. */
export interface ChessPawnOverrides {
  color?: 'white' | 'black';
}

export function generateChessPawn(seed: number, palette: string[], overrides?: ChessPawnOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const colorKeys = Object.keys(CHESS_COLORS) as Array<keyof typeof CHESS_COLORS>;
  const colorKey = overrides?.color ?? colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, shadowColor] = CHESS_COLORS[colorKey];

  const outline = palette[0] ?? '#000000';
  const highlight = palette[1] ?? '#FFFFFF';

  const highlightX = 13 + rng() * 3;
  const highlightY = 7 + rng() * 2;
  const shadowOpacity = 0.3 + rng() * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base -->
<ellipse cx="16" cy="28" rx="9" ry="3" fill="${shadowColor}" stroke="${outline}" stroke-width="1"/>
<!-- Body (tapered) -->
<polygon points="11,27 13,16 19,16 21,27" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Collar -->
<rect x="12" y="14" width="8" height="3" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Head -->
<circle cx="16" cy="10" r="5" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Highlight on head -->
<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="1.5" fill="${highlight}" opacity="0.6"/>
<!-- Shadow on body -->
<rect x="17" y="18" width="2" height="7" rx="1" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>
</svg>`;

  return svg;
}
