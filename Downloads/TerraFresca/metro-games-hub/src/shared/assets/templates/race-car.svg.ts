/**
 * Race Car SVG template.
 * Generates a 32x32 top-down pixel art racing car silhouette.
 * Color is derived from seed or overridden via { color }.
 * Rotation override is accepted but not applied to SVG (handled at render time).
 */

import { mulberry32 } from '../../utils/prng';

const CAR_COLORS: Record<string, [string, string]> = {
  red: ['#E53935', '#B71C1C'],
  blue: ['#1E88E5', '#0D47A1'],
};

/** Overrides for race car template. */
export interface RaceCarOverrides {
  color?: 'red' | 'blue';
  rotation?: number;
}

export function generateRaceCar(seed: number, palette: string[], overrides?: RaceCarOverrides): string {
  const rng = mulberry32(seed);
  const W = 32;
  const H = 32;

  const colorKeys = Object.keys(CAR_COLORS) as Array<keyof typeof CAR_COLORS>;
  const colorKey = overrides?.color ?? colorKeys[Math.floor(rng() * colorKeys.length)];
  const [mainColor, darkColor] = CAR_COLORS[colorKey];

  const outline = palette[0] ?? '#000000';
  const windshield = palette[1] ?? '#B3E5FC';

  // Deterministic variation
  const stripeOffset = 12 + Math.floor(rng() * 4);
  const highlightX = 13 + Math.floor(rng() * 6);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- Shadow -->
<ellipse cx="16" cy="29" rx="7" ry="2" fill="${outline}" opacity="0.3"/>
<!-- Body -->
<rect x="9" y="6" width="14" height="22" rx="3" fill="${mainColor}" stroke="${outline}" stroke-width="1"/>
<!-- Dark rear section -->
<rect x="9" y="22" width="14" height="6" rx="2" fill="${darkColor}" stroke="${outline}" stroke-width="1"/>
<!-- Windshield -->
<rect x="11" y="9" width="10" height="5" rx="1" fill="${windshield}" stroke="${outline}" stroke-width="0.5"/>
<!-- Rear window -->
<rect x="11" y="20" width="10" height="3" rx="1" fill="${windshield}" opacity="0.7" stroke="${outline}" stroke-width="0.5"/>
<!-- Racing stripe -->
<rect x="${stripeOffset}" y="6" width="2" height="22" fill="${darkColor}" opacity="0.4"/>
<!-- Headlights -->
<rect x="10" y="6" width="3" height="2" rx="1" fill="#FFF9C4"/>
<rect x="19" y="6" width="3" height="2" rx="1" fill="#FFF9C4"/>
<!-- Taillights -->
<rect x="10" y="27" width="3" height="1" rx="0.5" fill="#FF5252"/>
<rect x="19" y="27" width="3" height="1" rx="0.5" fill="#FF5252"/>
<!-- Highlight -->
<rect x="${highlightX}" y="10" width="1" height="8" fill="#FFFFFF" opacity="0.3"/>
<!-- Wheels -->
<rect x="7" y="8" width="3" height="5" rx="1" fill="${outline}"/>
<rect x="22" y="8" width="3" height="5" rx="1" fill="${outline}"/>
<rect x="7" y="20" width="3" height="5" rx="1" fill="${outline}"/>
<rect x="22" y="20" width="3" height="5" rx="1" fill="${outline}"/>
</svg>`;

  return svg;
}
