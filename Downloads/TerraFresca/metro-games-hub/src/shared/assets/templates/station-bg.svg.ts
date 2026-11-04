/**
 * Station background SVG template.
 * Generates a 480x270 metro station scene parameterized by seed and palette.
 */

/** Mulberry32 PRNG — deterministic from seed. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateStationBg(seed: number, palette: string[]): string {
  const rng = mulberry32(seed);
  const W = 480;
  const H = 270;

  // Ceiling region (top 60px)
  const ceilingColor = palette[8] ?? '#1A1A2E';
  const ceilingTileCount = 12;
  const tileWidth = W / ceilingTileCount;
  let ceilingTiles = '';
  for (let i = 0; i < ceilingTileCount; i++) {
    const shade = rng() > 0.5 ? palette[9] ?? '#16213E' : ceilingColor;
    ceilingTiles += `<rect x="${i * tileWidth}" y="0" width="${tileWidth}" height="60" fill="${shade}" stroke="${palette[2]}" stroke-width="0.5"/>`;
  }

  // Wall region (60-200px)
  const wallColor = palette[9] ?? '#16213E';
  const signCount = 2 + Math.floor(rng() * 3); // 2-4 signs
  let signs = '';
  for (let i = 0; i < signCount; i++) {
    const sx = 40 + Math.floor(rng() * (W - 120));
    const sy = 80 + Math.floor(rng() * 80);
    const sw = 40 + Math.floor(rng() * 60);
    const sh = 16 + Math.floor(rng() * 20);
    const signColor = palette[12] ?? '#E94560';
    signs += `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="2" fill="${signColor}" opacity="0.9"/>`;
  }

  // Platform region (200-270px)
  const platformDark = palette[13] ?? '#2B2B40';
  const platformLight = palette[14] ?? '#3D3D5C';
  const tileColor = palette[15] ?? '#F5E6CA';
  const platformTileCount = 16;
  const pTileW = W / platformTileCount;
  let platformTiles = '';
  for (let i = 0; i < platformTileCount; i++) {
    const c = rng() > 0.3 ? platformDark : platformLight;
    platformTiles += `<rect x="${i * pTileW}" y="200" width="${pTileW}" height="70" fill="${c}"/>`;
  }

  // Platform edge line
  const edgeLine = `<rect x="0" y="198" width="${W}" height="4" fill="${tileColor}"/>`;

  // Accent stripe along wall-platform boundary
  const accentStripe = `<rect x="0" y="195" width="${W}" height="3" fill="${palette[10] ?? '#0F3460'}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect x="0" y="0" width="${W}" height="${H}" fill="${wallColor}"/>
${ceilingTiles}
${signs}
${accentStripe}
${edgeLine}
${platformTiles}
</svg>`;

  return svg;
}
