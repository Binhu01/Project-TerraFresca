import type { TileType } from './types';

export const TRACK_WIDTH = 32;
export const TRACK_HEIGHT = 64;
export const TILE_SIZE = 32;
export const TOTAL_LAPS = 3;

/**
 * Creates a simple oval circuit track.
 *
 * Layout (32 wide x 64 tall):
 * - Row 0 and row 63: barrier border
 * - Col 0 and col 31: barrier border
 * - Inner grass oval forming the infield
 * - Asphalt road between outer barrier and inner grass
 * - Finish line on the bottom straight (row 60, cols 12-19)
 */
export function createDefaultTrack(): TileType[][] {
  const track: TileType[][] = [];

  for (let y = 0; y < TRACK_HEIGHT; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < TRACK_WIDTH; x++) {
      row.push(getTileAt(x, y));
    }
    track.push(row);
  }

  return track;
}

function getTileAt(x: number, y: number): TileType {
  // Outer border: all edges are barriers
  if (x === 0 || x === TRACK_WIDTH - 1 || y === 0 || y === TRACK_HEIGHT - 1) {
    return 'barrier';
  }

  // Finish line on bottom straight: row 60, columns 12-19
  if (y === 60 && x >= 12 && x <= 19) {
    return 'finish';
  }

  // Define the inner grass oval boundary
  // The grass infield is an oval shape centered roughly at (15.5, 31.5)
  // We use a parametric approach: the grass region is bounded by curves

  // Top curve of grass: rows 8-14, narrowing from full width to narrower
  // Bottom curve of grass: rows 49-55, widening from narrow to full width
  // Left side of grass: cols that vary by row
  // Right side of grass: cols that vary by row

  const grassLeft = getGrassBoundaryLeft(y);
  const grassRight = getGrassBoundaryRight(y);

  // If within the grass region, it's grass
  if (grassLeft !== null && grassRight !== null && x >= grassLeft && x <= grassRight) {
    return 'grass';
  }

  // Everything else inside the barrier border is asphalt
  return 'asphalt';
}

/**
 * Returns the left column index where grass starts for a given row,
 * or null if there is no grass on this row.
 */
function getGrassBoundaryLeft(y: number): number | null {
  // No grass in top/bottom barrier-adjacent rows
  if (y <= 7 || y >= 56) {
    return null;
  }

  // Top curve: rows 8-14, grass narrows from edges toward center
  if (y >= 8 && y <= 14) {
    const t = (y - 8) / 6; // 0..1
    // At y=8: grass starts at col 14 (narrow opening at top)
    // At y=14: grass starts at col 6 (wider)
    return Math.round(14 - t * 8);
  }

  // Straight sections: rows 15-48
  if (y >= 15 && y <= 48) {
    return 6;
  }

  // Bottom curve: rows 49-55, grass widens back
  if (y >= 49 && y <= 55) {
    const t = (y - 49) / 6; // 0..1
    // At y=49: grass starts at col 6
    // At y=55: grass starts at col 14
    return Math.round(6 + t * 8);
  }

  return null;
}

/**
 * Returns the right column index where grass ends for a given row,
 * or null if there is no grass on this row.
 */
function getGrassBoundaryRight(y: number): number | null {
  if (y <= 7 || y >= 56) {
    return null;
  }

  // Top curve: rows 8-14
  if (y >= 8 && y <= 14) {
    const t = (y - 8) / 6;
    // Mirror of left side around center (15.5)
    return Math.round(17 + t * 8);
  }

  // Straight sections: rows 15-48
  if (y >= 15 && y <= 48) {
    return 25;
  }

  // Bottom curve: rows 49-55
  if (y >= 49 && y <= 55) {
    const t = (y - 49) / 6;
    return Math.round(25 - t * 8);
  }

  return null;
}

/**
 * Four checkpoints distributed around the oval.
 * All coordinates must be on asphalt tiles.
 * Order: bottom-straight (near finish), right-curve, top-straight, left-curve.
 */
export const CHECKPOINTS: Array<{ x: number; y: number }> = [
  { x: 16, y: 58 },  // Bottom straight, just above finish line
  { x: 28, y: 32 },  // Right side midpoint
  { x: 16, y: 5 },   // Top straight midpoint
  { x: 3, y: 32 },   // Left side midpoint
];

/**
 * Starting grid positions for P1 and P2 on the finish straight.
 * Both must be on asphalt tiles, side by side.
 */
export const START_POSITIONS: [{ x: number; y: number }, { x: number; y: number }] = [
  { x: 14, y: 61 },  // P1
  { x: 17, y: 61 },  // P2
];
