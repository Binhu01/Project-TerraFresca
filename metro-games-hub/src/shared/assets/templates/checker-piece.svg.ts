/**
 * Checker piece SVG template for Damas Brasileiras.
 * Generates a 32x32 pixel art circle (checker piece) with optional king crown and selection highlight.
 * Color and visual variations are derived from seed and player override.
 */

import { mulberry32 } from '../../utils/prng';

const PIECE_COLORS: Record<string, [string, string]> = {
  white: ['#F0E0C0', '#C0B090'],
  black: ['#A03020', '#702010'],
};

/** Overrides for checker piece template. */
export interface CheckerPieceOverrides {
  player?: 'white' | 'black';
  isKing?: boolean;
  isSelected?: boolean;
}

export function generateCheckerPiece(seed: number, palette: string[], overrides?: CheckerPieceOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  // Use explicit player override if provided, otherwise derive from seed
  const playerKeys = Object.keys(PIECE_COLORS) as Array<keyof typeof PIECE_COLORS>;
  const playerKey = overrides?.player ?? playerKeys[Math.floor(rng() * playerKeys.length)];
  const [mainColor, shadowColor] = PIECE_COLORS[playerKey];

  const isKing = overrides?.isKing ?? false;
  const isSelected = overrides?.isSelected ?? false;

  // Outline color from palette
  const outline = palette[0] ?? '#000000';
  // Highlight from palette
  const highlight = palette[1] ?? '#FFFFFF';

  // Seed-dependent variations
  const highlightX = 12 + rng() * 4;
  const highlightY = 10 + rng() * 4;
  const shadowOpacity = 0.3 + rng() * 0.2;

  // Selection ring color
  const selectionColor = '#FFD700';

  // Crown color for king
  const crownColor = '#FFD700';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;

  // Selection highlight ring (behind the piece)
  if (isSelected) {
    svg += `\n<circle cx="16" cy="16" r="14" fill="none" stroke="${selectionColor}" stroke-width="2"/>`;
  }

  // Main piece circle
  svg += `\n<circle cx="16" cy="16" r="12" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>`;

  // Shadow on piece
  svg += `\n<ellipse cx="18" cy="19" rx="6" ry="5" fill="${shadowColor}" opacity="${shadowOpacity.toFixed(2)}"/>`;

  // Highlight on piece
  svg += `\n<circle cx="${highlightX.toFixed(1)}" cy="${highlightY.toFixed(1)}" r="2" fill="${highlight}" opacity="0.5"/>`;

  // King crown (3 small rectangles on top)
  if (isKing) {
    svg += `\n<rect x="10" y="5" width="3" height="4" rx="1" fill="${crownColor}" stroke="${outline}" stroke-width="0.5"/>`;
    svg += `\n<rect x="14.5" y="3" width="3" height="6" rx="1" fill="${crownColor}" stroke="${outline}" stroke-width="0.5"/>`;
    svg += `\n<rect x="19" y="5" width="3" height="4" rx="1" fill="${crownColor}" stroke="${outline}" stroke-width="0.5"/>`;
  }

  svg += '\n</svg>';

  return svg;
}
