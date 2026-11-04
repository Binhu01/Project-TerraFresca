/**
 * Chess Knight SVG template.
 * Generates a 32x32 pixel art knight (horse head) piece.
 * Color is derived from seed or overridden via { color }.
 */

import { mulberry32 } from '../../utils/prng';

const CHESS_COLORS: Record<string, [string, string]> = {
  white: ['#F0E8D0', '#C8B898'],
  black: ['#404040', '#1A1A1A'],
};

/** Overrides for chess knight template. */
export interface ChessKnightOverrides {
  color?: 'white' | 'black';
}

export function generateChessKnight(seed: number, palette: string[], overrides?: ChessKnightOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const colorKeys = Object.keys(CHESS_COLORS) as Array<keyof typeof CHESS_COLORS>;
  const colorKey = overrides?.color ?? colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, shadowColor] = CHESS_COLORS[colorKey];

  const outline = palette[0] ?? '#000000';
  const highlight = palette[1] ?? '#FFFFFF';

  const highlightX = 11 + rng() * 4;
  const highlightY = 8 + rng() * 3;
  const shadowOpacity = 0.3 + rng() * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base -->
<rect x="6" y="27" width="20" height="3" rx="1" fill="${shadowColor}" stroke="${outline}" stroke-width="1"/>
<!-- Body/pedestal -->
<rect x="10" y="20" width="12" height="7" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Neck -->
<rect x="12" y="14" width="8" height="7" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Head (horse profile facing right) -->
<polygon points="12,14 10,8 12,4 18,3 22,5 22,9 20,12 20,14" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Ear -->
<polygon points="14,4 13,1 16,3" fill="${mainColor}" stroke="${outline}" stroke-width="0.5"/>
<!-- Eye -->
<circle cx="17" cy="7" r="1" fill="${outline}"/>
<!-- Nostril -->
<circle cx="21" cy="8" r="0.7" fill="${outline}"/>
<!-- Mane line -->
<line x1="13" y1="4" x2="12" y2="12" stroke="${shadowColor}" stroke-width="1"/>
<!-- Highlight -->
<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="1.5" fill="${highlight}" opacity="0.5"/>
<!-- Shadow on body -->
<rect x="17" y="21" width="3" height="5" rx="1" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>
</svg>`;

  return svg;
}
