/**
 * Board cell SVG template for Cobras e Escadas.
 * Generates a 48x48 cell with subtle procedural color variation.
 */

import { mulberry32 } from '../../utils/prng';

/** Overrides for board-cell template. */
export interface BoardCellOverrides {
  cellNumber?: number;
}

export function generateBoardCell(seed: number, palette: string[], overrides?: BoardCellOverrides): string {
  const rng = mulberry32(seed);
  const W = 48;
  const H = 48;

  // Use cellNumber for positional color variation if provided, otherwise derive from seed
  const baseIdx = overrides?.cellNumber !== undefined
    ? (overrides.cellNumber % palette.length)
    : Math.floor(rng() * palette.length);
  const baseColor = palette[baseIdx] ?? '#F0E6D2';

  // Subtle shade variation from seed
  const shadeDelta = (rng() - 0.5) * 0.15;
  const opacity = 0.85 + shadeDelta;

  // Border color from palette
  const borderColor = palette[2] ?? '#4A4A4A';

  // Inner highlight for depth
  const highlightColor = palette[1] ?? '#FFFFFF';
  const highlightOpacity = 0.05 + rng() * 0.1;

  // Optional inner pattern (small diamond or dot) based on seed
  const hasPattern = rng() > 0.6;
  let pattern = '';
  if (hasPattern) {
    const patColor = palette[3] ?? '#8C8C8C';
    const patOpacity = 0.15 + rng() * 0.1;
    pattern = `<circle cx="${W / 2}" cy="${H / 2}" r="4" fill="${patColor}" opacity="${patOpacity.toFixed(2)}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect x="0" y="0" width="${W}" height="${H}" fill="${baseColor}" opacity="${opacity.toFixed(2)}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${borderColor}" stroke-width="0.5" opacity="0.4"/>
<rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="${highlightColor}" opacity="${highlightOpacity.toFixed(2)}"/>
${pattern}
</svg>`;

  return svg;
}
