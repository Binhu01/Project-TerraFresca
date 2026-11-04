import type { TileType, RacerState, InputState } from './types';
import { TRACK_WIDTH, TRACK_HEIGHT, TILE_SIZE } from './track';

// Physics constants (pixels/s or pixels/s²)
export const MAX_SPEED_ASPHALT = 8 * TILE_SIZE; // 256 px/s
export const MAX_SPEED_GRASS = 4 * TILE_SIZE; // 128 px/s
export const ACCELERATION = 12 * TILE_SIZE; // 384 px/s²
export const BRAKING = 20 * TILE_SIZE; // 640 px/s²
export const FRICTION = 4 * TILE_SIZE; // 128 px/s²
export const MAX_LATERAL_SPEED = 3 * TILE_SIZE; // 96
export const STUN_DURATION = 500; // ms
export const CHECKPOINT_RADIUS = 2 * TILE_SIZE; // 64 px

/**
 * Converts pixel coordinates to tile grid indices, clamps to track bounds,
 * and returns the tile type at that position.
 */
export function getTileAt(track: TileType[][], x: number, y: number): TileType {
  const tileX = Math.max(0, Math.min(TRACK_WIDTH - 1, Math.floor(x / TILE_SIZE)));
  const tileY = Math.max(0, Math.min(TRACK_HEIGHT - 1, Math.floor(y / TILE_SIZE)));
  return track[tileY][tileX];
}

/**
 * Returns the maximum speed in pixels/s for a given tile type.
 */
export function getMaxSpeed(tile: TileType): number {
  switch (tile) {
    case 'asphalt':
      return MAX_SPEED_ASPHALT;
    case 'grass':
      return MAX_SPEED_GRASS;
    case 'barrier':
      return 0;
    case 'finish':
      return MAX_SPEED_ASPHALT;
  }
}

/**
 * Applies physics simulation to a racer for one time step.
 * Pure function — no side effects.
 */
export function updateRacer(
  racer: RacerState,
  input: InputState,
  track: TileType[][],
  deltaTime: number,
  now: number,
): RacerState {
  // If stunned, ignore all input
  if (racer.stunnedUntil > now) {
    return racer;
  }

  // Determine max speed based on current tile
  const currentTile = getTileAt(track, racer.x, racer.y);
  const maxSpeed = getMaxSpeed(currentTile);

  // Calculate new speed
  let newSpeed = racer.speed;

  if (input.accelerate) {
    newSpeed += ACCELERATION * deltaTime;
    if (newSpeed > maxSpeed) {
      newSpeed = maxSpeed;
    }
  } else if (input.brake) {
    newSpeed -= BRAKING * deltaTime;
    if (newSpeed < 0) {
      newSpeed = 0;
    }
  } else {
    // Friction when no input
    newSpeed -= FRICTION * deltaTime;
    if (newSpeed < 0) {
      newSpeed = 0;
    }
  }

  // Steering: rotate angle proportional to speed
  const steerDenominator = Math.max(newSpeed, 1);
  const newAngle =
    racer.angle + (input.steerX * MAX_LATERAL_SPEED * deltaTime) / steerDenominator;

  // Movement
  const dx = Math.cos(newAngle) * newSpeed * deltaTime;
  const dy = Math.sin(newAngle) * newSpeed * deltaTime;
  const newX = racer.x + dx;
  const newY = racer.y + dy;

  // Barrier collision check at new position
  const newTile = getTileAt(track, newX, newY);
  if (newTile === 'barrier') {
    return {
      ...racer,
      speed: 0,
      stunnedUntil: now + STUN_DURATION,
    };
  }

  return {
    ...racer,
    x: newX,
    y: newY,
    angle: newAngle,
    speed: newSpeed,
  };
}

/**
 * Detects checkpoint and lap completion by checking if the segment from
 * oldRacer to newRacer passes within CHECKPOINT_RADIUS of each checkpoint.
 * Pure function — accepts `now` instead of calling Date.now().
 */
export function checkLapProgress(
  oldRacer: RacerState,
  newRacer: RacerState,
  checkpoints: Array<{ x: number; y: number }>,
  totalLaps: number,
  now: number,
): { lap: number; lastCheckpoint: number; finished: boolean; finishTime: number | null } {
  let lap = oldRacer.lap;
  let lastCheckpoint = oldRacer.lastCheckpoint;
  let finished = oldRacer.finished;
  let finishTime = oldRacer.finishTime;

  // Check each checkpoint in order
  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    // Convert checkpoint tile coords to pixel coords (center of tile)
    const cpPx = cp.x * TILE_SIZE + TILE_SIZE / 2;
    const cpPy = cp.y * TILE_SIZE + TILE_SIZE / 2;

    // Check if segment from old to new position crosses within radius
    if (segmentNearPoint(oldRacer.x, oldRacer.y, newRacer.x, newRacer.y, cpPx, cpPy, CHECKPOINT_RADIUS)) {
      // Only advance if this is exactly the next expected checkpoint
      if (i === lastCheckpoint + 1) {
        lastCheckpoint = i;
      }
    }
  }

  // Check finish line crossing: after all checkpoints visited, check if near finish area
  // The finish line is detected when lastCheckpoint is the last one AND racer crosses
  // back near checkpoint 0 area (the first checkpoint serves as finish trigger zone)
  if (lastCheckpoint === checkpoints.length - 1) {
    const finishCp = checkpoints[0];
    const finishPx = finishCp.x * TILE_SIZE + TILE_SIZE / 2;
    const finishPy = finishCp.y * TILE_SIZE + TILE_SIZE / 2;

    if (segmentNearPoint(oldRacer.x, oldRacer.y, newRacer.x, newRacer.y, finishPx, finishPy, CHECKPOINT_RADIUS)) {
      lap += 1;
      lastCheckpoint = 0;

      if (lap >= totalLaps) {
        finished = true;
        finishTime = now;
      }
    }
  }

  return { lap, lastCheckpoint, finished, finishTime };
}

/**
 * Checks if a line segment (x1,y1)-(x2,y2) passes within `radius` of point (px,py).
 * Uses closest-point-on-segment algorithm.
 */
function segmentNearPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  px: number,
  py: number,
  radius: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  // If segment is essentially a point, just check distance
  if (lenSq === 0) {
    const distSq = (px - x1) * (px - x1) + (py - y1) * (py - y1);
    return distSq <= radius * radius;
  }

  // Project point onto line, clamped to [0,1]
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));

  // Closest point on segment
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  const distSq = (px - closestX) * (px - closestX) + (py - closestY) * (py - closestY);
  return distSq <= radius * radius;
}
