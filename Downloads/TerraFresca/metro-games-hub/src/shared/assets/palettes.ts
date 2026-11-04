/**
 * Named 16-bit style palettes for procedural sprite generation.
 * Each palette is exactly 16 hex colors.
 * Indices 0-7 are shared UI subset across all palettes.
 */

// Shared UI subset (indices 0-7)
const UI_SUBSET = [
  '#000000', // 0: black
  '#FFFFFF', // 1: white
  '#4A4A4A', // 2: dark gray
  '#8C8C8C', // 3: mid gray
  '#C0C0C0', // 4: light gray
  '#FFD700', // 5: highlight yellow
  '#E03030', // 6: error red
  '#30B050', // 7: success green
] as const;

export const STATION_PALETTE: string[] = [
  ...UI_SUBSET,
  '#1A1A2E', // 8: deep navy (ceiling)
  '#16213E', // 9: dark blue (walls)
  '#0F3460', // 10: medium blue (accents)
  '#533483', // 11: purple trim
  '#E94560', // 12: neon pink (signage)
  '#2B2B40', // 13: platform dark
  '#3D3D5C', // 14: platform light
  '#F5E6CA', // 15: warm tile
];

export const CHESS_PALETTE: string[] = [
  ...UI_SUBSET,
  '#2C1810', // 8: dark wood
  '#5C3A28', // 9: medium wood
  '#8B6914', // 10: gold accent
  '#D4A843', // 11: light gold
  '#F0E6D2', // 12: cream square
  '#3E2723', // 13: dark square
  '#6D4C41', // 14: brown piece
  '#BCAAA4', // 15: light piece
];

export const RACING_PALETTE: string[] = [
  ...UI_SUBSET,
  '#0D0D0D', // 8: asphalt black
  '#2A2A2A', // 9: road dark
  '#404040', // 10: road mid
  '#FF6600', // 11: orange cone
  '#0066CC', // 12: sky blue
  '#339933', // 13: grass green
  '#CC0000', // 14: car red
  '#EEEEEE', // 15: stripe white
];

/** Map of palette name to palette array for lookup by string key. */
export const PALETTES: Record<string, string[]> = {
  station: STATION_PALETTE,
  chess: CHESS_PALETTE,
  racing: RACING_PALETTE,
};
