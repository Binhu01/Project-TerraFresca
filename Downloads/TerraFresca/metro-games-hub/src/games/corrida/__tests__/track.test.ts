import { describe, it, expect } from 'vitest';
import {
  TRACK_WIDTH,
  TRACK_HEIGHT,
  createDefaultTrack,
  CHECKPOINTS,
  START_POSITIONS,
} from '../track';
import type { TileType } from '../types';

describe('Corrida track', () => {
  const track = createDefaultTrack();

  it('has correct dimensions (32x64)', () => {
    expect(track.length).toBe(TRACK_HEIGHT);
    expect(track[0].length).toBe(TRACK_WIDTH);
    for (let y = 0; y < TRACK_HEIGHT; y++) {
      expect(track[y].length).toBe(TRACK_WIDTH);
    }
  });

  it('has barrier tiles on all borders', () => {
    // Top row (row 0)
    for (let x = 0; x < TRACK_WIDTH; x++) {
      expect(track[0][x]).toBe('barrier');
    }
    // Bottom row (row 63)
    for (let x = 0; x < TRACK_WIDTH; x++) {
      expect(track[TRACK_HEIGHT - 1][x]).toBe('barrier');
    }
    // Left column (col 0)
    for (let y = 0; y < TRACK_HEIGHT; y++) {
      expect(track[y][0]).toBe('barrier');
    }
    // Right column (col 31)
    for (let y = 0; y < TRACK_HEIGHT; y++) {
      expect(track[y][TRACK_WIDTH - 1]).toBe('barrier');
    }
  });

  it('has finish line at expected location with finish tiles', () => {
    // Finish line should be at row 60, columns 12-19
    let finishCount = 0;
    for (let x = 12; x <= 19; x++) {
      if (track[60][x] === 'finish') {
        finishCount++;
      }
    }
    expect(finishCount).toBeGreaterThan(0);
  });

  it('has exactly 4 checkpoints', () => {
    expect(CHECKPOINTS.length).toBe(4);
  });

  it('all checkpoints are on asphalt tiles', () => {
    for (const cp of CHECKPOINTS) {
      expect(cp.x).toBeGreaterThanOrEqual(0);
      expect(cp.x).toBeLessThan(TRACK_WIDTH);
      expect(cp.y).toBeGreaterThanOrEqual(0);
      expect(cp.y).toBeLessThan(TRACK_HEIGHT);
      expect(track[cp.y][cp.x]).toBe('asphalt');
    }
  });

  it('has exactly 2 start positions', () => {
    expect(START_POSITIONS.length).toBe(2);
  });

  it('both start positions are on asphalt tiles', () => {
    for (const pos of START_POSITIONS) {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThan(TRACK_WIDTH);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeLessThan(TRACK_HEIGHT);
      expect(track[pos.y][pos.x]).toBe('asphalt');
    }
  });

  it('has no unreachable asphalt islands (flood-fill connectivity)', () => {
    // Count all asphalt and finish tiles
    let totalDrivable = 0;
    for (let y = 0; y < TRACK_HEIGHT; y++) {
      for (let x = 0; x < TRACK_WIDTH; x++) {
        if (track[y][x] === 'asphalt' || track[y][x] === 'finish') {
          totalDrivable++;
        }
      }
    }

    // Flood-fill from first start position
    const visited = new Set<string>();
    const queue: Array<{ x: number; y: number }> = [START_POSITIONS[0]];
    visited.add(`${START_POSITIONS[0].x},${START_POSITIONS[0].y}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const n of neighbors) {
        if (
          n.x >= 0 &&
          n.x < TRACK_WIDTH &&
          n.y >= 0 &&
          n.y < TRACK_HEIGHT &&
          !visited.has(`${n.x},${n.y}`) &&
          (track[n.y][n.x] === 'asphalt' || track[n.y][n.x] === 'finish')
        ) {
          visited.add(`${n.x},${n.y}`);
          queue.push(n);
        }
      }
    }

    expect(visited.size).toBe(totalDrivable);
  });
});
