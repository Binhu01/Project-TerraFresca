/**
 * Ladder overlay SVG template for Cobras e Escadas.
 * Generates a 48x240 vertical ladder spanning multiple board cells.
 * Style is procedurally generated from seed.
 */

import { mulberry32 } from '../../utils/prng';

export function generateLadder(seed: number, palette: string[]): string {
  const rng = mulberry32(seed);
  const W = 48;
  const H = 240;

  // Ladder colors from palette
  const railIdx = 9 + Math.floor(rng() * 3);
  const railColor = palette[railIdx] ?? '#5C3A28';
  const rungIdx = 11 + Math.floor(rng() * 3);
  const rungColor = palette[rungIdx] ?? '#D4A843';
  const outlineColor = palette[0] ?? '#000000';
  const highlightColor = palette[1] ?? '#FFFFFF';

  // Rail dimensions
  const railWidth = 4;
  const leftRailX = 10 + Math.floor(rng() * 4);
  const rightRailX = W - leftRailX - railWidth;

  // Rungs
  const rungCount = 8 + Math.floor(rng() * 4); // 8-11 rungs
  const rungSpacing = H / (rungCount + 1);
  const rungHeight = 3;

  let rungs = '';
  for (let i = 1; i <= rungCount; i++) {
    const ry = i * rungSpacing;
    // Slight width variation per rung for hand-crafted look
    const widthVar = (rng() - 0.5) * 2;
    const rx = leftRailX + railWidth + widthVar;
    const rw = rightRailX - leftRailX - railWidth - widthVar * 2;
    rungs += `<rect x="${rx.toFixed(1)}" y="${(ry - rungHeight / 2).toFixed(1)}" width="${rw.toFixed(1)}" height="${rungHeight}" rx="1" fill="${rungColor}" stroke="${outlineColor}" stroke-width="0.5"/>`;
    // Highlight on top of each rung
    rungs += `<rect x="${(rx + 1).toFixed(1)}" y="${(ry - rungHeight / 2).toFixed(1)}" width="${(rw - 2).toFixed(1)}" height="1" rx="0.5" fill="${highlightColor}" opacity="0.2"/>`;
  }

  // Side rails with slight taper toward top
  const topTaper = rng() * 2;
  const leftPath = `M ${leftRailX} ${H} L ${(leftRailX + topTaper).toFixed(1)} 0 L ${(leftRailX + railWidth + topTaper).toFixed(1)} 0 L ${leftRailX + railWidth} ${H} Z`;
  const rightPath = `M ${rightRailX} ${H} L ${(rightRailX - topTaper).toFixed(1)} 0 L ${(rightRailX + railWidth - topTaper).toFixed(1)} 0 L ${rightRailX + railWidth} ${H} Z`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Left rail -->
<path d="${leftPath}" fill="${railColor}" stroke="${outlineColor}" stroke-width="0.5"/>
<!-- Right rail -->
<path d="${rightPath}" fill="${railColor}" stroke="${outlineColor}" stroke-width="0.5"/>
<!-- Rail highlights -->
<line x1="${leftRailX + 1}" y1="${H}" x2="${(leftRailX + topTaper + 1).toFixed(1)}" y2="0" stroke="${highlightColor}" stroke-width="0.5" opacity="0.2"/>
<line x1="${rightRailX + 1}" y1="${H}" x2="${(rightRailX - topTaper + 1).toFixed(1)}" y2="0" stroke="${highlightColor}" stroke-width="0.5" opacity="0.2"/>
<!-- Rungs -->
${rungs}
</svg>`;

  return svg;
}
