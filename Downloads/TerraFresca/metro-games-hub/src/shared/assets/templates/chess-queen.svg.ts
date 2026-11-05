/**
 * Chess Queen SVG template.
 * Generates a 32x32 pixel art queen piece with crown points on top.
 * Color is derived from seed or overridden via { color }.
 */

import { mulberry32 } from '../../utils/prng';

const CHESS_COLORS: Record<string, [string, string]> = {
  white: ['#F0E8D0', '#C8B898'],
  black: ['#404040', '#1A1A1A'],
};

/** Overrides for chess queen template. */
export interface ChessQueenOverrides {
  color?: 'white' | 'black';
}

export function generateChessQueen(seed: number, palette: string[], overrides?: ChessQueenOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const colorKeys = Object.keys(CHESS_COLORS) as Array<keyof typeof CHESS_COLORS>;
  const colorKey = overrides?.color ?? colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, shadowColor] = CHESS_COLORS[colorKey];

  const outline = palette[0] ?? '#000000';
  const highlight = palette[1] ?? '#FFFFFF';

  const highlightX = 12 + rng() * 4;
  const highlightY = 8 + rng() * 3;
  const shadowOpacity = 0.3 + rng() * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base -->
<rect x="6" y="27" width="20" height="3" rx="1" fill="${shadowColor}" stroke="${outline}" stroke-width="1"/>
<!-- Body -->
<rect x="10" y="16" width="12" height="11" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Neck -->
<rect x="12" y="12" width="8" height="5" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Crown band -->
<rect x="9" y="10" width="14" height="3" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Crown point left -->
<polygon points="9,10 7,4 11,8" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Crown point center -->
<polygon points="14,10 16,2 18,10" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Crown point right -->
<polygon points="21,10 25,4 23,10" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Crown jewels -->
<circle cx="8" cy="5" r="1.5" fill="${highlight}" opacity="0.7"/>
<circle cx="16" cy="3" r="1.5" fill="${highlight}" opacity="0.7"/>
<circle cx="24" cy="5" r="1.5" fill="${highlight}" opacity="0.7"/>
<!-- Highlight -->
<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="1.5" fill="${highlight}" opacity="0.5"/>
<!-- Shadow on body -->
<rect x="17" y="18" width="3" height="7" rx="1" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>
</svg>`;

  return svg;
}
