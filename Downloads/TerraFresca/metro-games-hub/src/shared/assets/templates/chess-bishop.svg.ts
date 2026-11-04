/**
 * Chess Bishop SVG template.
 * Generates a 32x32 pixel art bishop piece with mitre hat and diagonal slit.
 * Color is derived from seed or overridden via { color }.
 */

import { mulberry32 } from '../../utils/prng';

const CHESS_COLORS: Record<string, [string, string]> = {
  white: ['#F0E8D0', '#C8B898'],
  black: ['#404040', '#1A1A1A'],
};

/** Overrides for chess bishop template. */
export interface ChessBishopOverrides {
  color?: 'white' | 'black';
}

export function generateChessBishop(seed: number, palette: string[], overrides?: ChessBishopOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const colorKeys = Object.keys(CHESS_COLORS) as Array<keyof typeof CHESS_COLORS>;
  const colorKey = overrides?.color ?? colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, shadowColor] = CHESS_COLORS[colorKey];

  const outline = palette[0] ?? '#000000';
  const highlight = palette[1] ?? '#FFFFFF';

  const highlightX = 12 + rng() * 4;
  const highlightY = 10 + rng() * 3;
  const shadowOpacity = 0.3 + rng() * 0.2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Base -->
<rect x="7" y="27" width="18" height="3" rx="1" fill="${shadowColor}" stroke="${outline}" stroke-width="1"/>
<!-- Body -->
<rect x="11" y="16" width="10" height="11" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Neck -->
<rect x="12" y="12" width="8" height="5" rx="1" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Mitre (pointed hat) -->
<polygon points="16,3 10,12 22,12" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Diagonal slit on mitre -->
<line x1="13" y1="6" x2="19" y2="10" stroke="${outline}" stroke-width="1"/>
<!-- Top ball -->
<circle cx="16" cy="3" r="1.5" fill="${mainColor}" stroke="${outline}" stroke-width="0.5"/>
<!-- Highlight -->
<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="1.5" fill="${highlight}" opacity="0.5"/>
<!-- Shadow on body -->
<rect x="17" y="18" width="2" height="7" rx="1" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>
</svg>`;

  return svg;
}
