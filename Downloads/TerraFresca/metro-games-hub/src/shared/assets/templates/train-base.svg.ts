/**
 * Train base sprite SVG template.
 * Generates a 64x48 train car sprite parameterized by seed and palette.
 */

import { mulberry32 } from '../../utils/prng';

export function generateTrainBase(seed: number, palette: string[]): string {
  const rng = mulberry32(seed);
  const W = 64;
  const H = 48;

  // Body color varies by seed
  const bodyColorIdx = 8 + Math.floor(rng() * 4); // indices 8-11
  const bodyColor = palette[bodyColorIdx] ?? palette[8] ?? '#1A1A2E';

  // Window positions and lighting variation
  const windowY = 10;
  const windowH = 14;
  const windowW = 10;
  const windowGap = 4;
  const windowCount = 4;
  const startX = 6;

  let windows = '';
  for (let i = 0; i < windowCount; i++) {
    const wx = startX + i * (windowW + windowGap);
    // Window lit state varies by seed
    const lit = rng() > 0.4;
    const windowFill = lit ? (palette[5] ?? '#FFD700') : (palette[2] ?? '#4A4A4A');
    windows += `<rect x="${wx}" y="${windowY}" width="${windowW}" height="${windowH}" rx="1" fill="${windowFill}" opacity="${lit ? 0.9 : 0.6}"/>`;
  }

  // Roof stripe
  const roofColor = palette[3] ?? '#8C8C8C';
  const roof = `<rect x="2" y="2" width="${W - 4}" height="6" rx="2" fill="${roofColor}"/>`;

  // Undercarriage
  const underColor = palette[0] ?? '#000000';
  const undercarriage = `<rect x="4" y="38" width="${W - 8}" height="6" rx="1" fill="${underColor}"/>`;

  // Wheels
  const wheelColor = palette[2] ?? '#4A4A4A';
  const wheels = `
<circle cx="14" cy="44" r="4" fill="${wheelColor}" stroke="${palette[4] ?? '#C0C0C0'}" stroke-width="1"/>
<circle cx="50" cy="44" r="4" fill="${wheelColor}" stroke="${palette[4] ?? '#C0C0C0'}" stroke-width="1"/>`;

  // Door indicator (seed-dependent position)
  const doorX = 28 + Math.floor(rng() * 8);
  const door = `<rect x="${doorX}" y="26" width="8" height="12" rx="1" fill="${palette[1] ?? '#FFFFFF'}" opacity="0.3"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${roof}
<rect x="2" y="8" width="${W - 4}" height="30" rx="2" fill="${bodyColor}"/>
${windows}
${door}
${undercarriage}
${wheels}
</svg>`;

  return svg;
}
