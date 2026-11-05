/**
 * Snake overlay SVG template for Cobras e Escadas.
 * Generates a 48x240 vertical snake spanning multiple board cells.
 * Shape and color are procedurally generated from seed.
 */

import { mulberry32 } from '../../utils/prng';

export function generateSnake(seed: number, palette: string[]): string {
  const rng = mulberry32(seed);
  const W = 48;
  const H = 240;

  // Snake colors from palette — pick two tones for body
  const bodyIdx = 8 + Math.floor(rng() * 4);
  const bodyColor = palette[bodyIdx] ?? '#30B050';
  const bellyIdx = 12 + Math.floor(rng() * 4);
  const bellyColor = palette[bellyIdx] ?? '#F0E6D2';
  const outlineColor = palette[0] ?? '#000000';
  const eyeColor = palette[5] ?? '#FFD700';

  // Generate serpentine path using sine-wave offsets
  const segments = 12;
  const segH = H / segments;
  const amplitude = 8 + rng() * 6; // horizontal wave amplitude
  const phaseOffset = rng() * Math.PI * 2;

  // Build center line points
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const y = i * segH;
    const xOffset = Math.sin(phaseOffset + (i / segments) * Math.PI * 3) * amplitude;
    const x = W / 2 + xOffset;
    points.push([x, y]);
  }

  // Build SVG path for the snake body
  let bodyPath = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prevX = points[i - 1][0];
    const prevY = points[i - 1][1];
    const curX = points[i][0];
    const curY = points[i][1];
    const cpX = (prevX + curX) / 2;
    const cpY = (prevY + curY) / 2;
    bodyPath += ` Q ${prevX.toFixed(1)} ${(prevY + (curY - prevY) * 0.5).toFixed(1)} ${cpX.toFixed(1)} ${cpY.toFixed(1)}`;
  }
  // End at tail
  const lastPt = points[points.length - 1];
  bodyPath += ` L ${lastPt[0].toFixed(1)} ${lastPt[1].toFixed(1)}`;

  // Head at top (y=0), wider
  const headX = points[0][0];
  const headY = 8;
  const headRx = 8 + rng() * 3;
  const headRy = 10;

  // Eyes
  const eyeOffX = 3 + rng() * 2;

  // Tongue (forked)
  const tongueLen = 6 + rng() * 4;

  // Tail taper at bottom
  const tailX = points[points.length - 1][0];
  const tailY = H - 4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Body -->
<path d="${bodyPath}" fill="none" stroke="${bodyColor}" stroke-width="10" stroke-linecap="round" opacity="0.9"/>
<path d="${bodyPath}" fill="none" stroke="${bellyColor}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
<!-- Outline -->
<path d="${bodyPath}" fill="none" stroke="${outlineColor}" stroke-width="11" stroke-linecap="round" opacity="0.2"/>
<!-- Head -->
<ellipse cx="${headX.toFixed(1)}" cy="${headY}" rx="${headRx.toFixed(1)}" ry="${headRy}" fill="${bodyColor}" stroke="${outlineColor}" stroke-width="1"/>
<!-- Eyes -->
<circle cx="${(headX - eyeOffX).toFixed(1)}" cy="${(headY - 2).toFixed(1)}" r="2" fill="${eyeColor}"/>
<circle cx="${(headX + eyeOffX).toFixed(1)}" cy="${(headY - 2).toFixed(1)}" r="2" fill="${eyeColor}"/>
<circle cx="${(headX - eyeOffX).toFixed(1)}" cy="${(headY - 2).toFixed(1)}" r="0.8" fill="${outlineColor}"/>
<circle cx="${(headX + eyeOffX).toFixed(1)}" cy="${(headY - 2).toFixed(1)}" r="0.8" fill="${outlineColor}"/>
<!-- Tongue -->
<line x1="${headX.toFixed(1)}" y1="0" x2="${(headX - 2).toFixed(1)}" y2="${(-tongueLen).toFixed(1)}" stroke="#CC3333" stroke-width="1.5" stroke-linecap="round"/>
<line x1="${headX.toFixed(1)}" y1="0" x2="${(headX + 2).toFixed(1)}" y2="${(-tongueLen).toFixed(1)}" stroke="#CC3333" stroke-width="1.5" stroke-linecap="round"/>
<!-- Tail tip -->
<circle cx="${tailX.toFixed(1)}" cy="${tailY}" r="3" fill="${bodyColor}" opacity="0.7"/>
</svg>`;

  return svg;
}
