/**
 * Chess Rook SVG template.
 * Generates a 32x32 pixel art rook (castle tower) piece.
 * Color is derived from seed or overridden via { color }.
 */

import { mulberry32 } from '../../utils/prng';

const CHESS_COLORS: Record<string, [string, string]> = {
  white: ['#F0E8D0', '#C8B898'],
  black: ['#404040', '#1A1A1A'],
};

/** Overrides for chess rook template. */
export interface ChessRookOverrides {
  color?: 'white' | 'black';
}

export function generateChessRook(seed: number, palette: string[], overrides?: ChessRookOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const colorKeys = Object.keys(CHESS_COLORS) as Array<keyof typeof CHESS_COLORS>;
  const colorKey = overrides?.color ?? colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, shadowColor] = CHESS_COLORS[colorKey];

  const outline = palette[0] ?? '#000000';
  const highlight = palette[1] ?? '#FFFFFF';

  const highlightX = 11 + rng() * 4;
  const highlightY = 10 + rng() * 4;
  const shadowOpacity = 0.3 + rng() * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base -->
<rect x="6" y="27" width="20" height="3" rx="1" fill="${shadowColor}" stroke="${outline}" stroke-width="1"/>
<!-- Body -->
<rect x="9" y="14" width="14" height="13" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Battlement band -->
<rect x="8" y="11" width="16" height="4" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Merlon left -->
<rect x="8" y="5" width="4" height="7" rx="0.5" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Merlon center -->
<rect x="14" y="5" width="4" height="7" rx="0.5" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Merlon right -->
<rect x="20" y="5" width="4" height="7" rx="0.5" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Highlight -->
<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="1.5" fill="${highlight}" opacity="0.5"/>
<!-- Shadow on body -->
<rect x="18" y="16" width="3" height="9" rx="1" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>
</svg>`;

  return svg;
}
