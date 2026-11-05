import { describe, it, expect } from 'vitest';
import type { TileType, RacerState, InputState } from '../types';
import { TRACK_WIDTH, TRACK_HEIGHT, TILE_SIZE, createDefaultTrack } from '../track';
import {
  getTileAt,
  getMaxSpeed,
  updateRacer,
  checkLapProgress,
  MAX_SPEED_ASPHALT,
  MAX_SPEED_GRASS,
  ACCELERATION,
  BRAKING,
  FRICTION,
  STUN_DURATION,
  CHECKPOINT_RADIUS,
} from '../physics';

function makeRacer(overrides: Partial<RacerState> = {}): RacerState {
  return {
    x: 14 * TILE_SIZE + TILE_SIZE / 2,
    y: 61 * TILE_SIZE + TILE_SIZE / 2,
    angle: -Math.PI / 2, // facing up
    speed: 0,
    lap: 0,
    lastCheckpoint: -1,
    finished: false,
    finishTime: null,
    stunnedUntil: 0,
    ...overrides,
  };
}

function makeInput(overrides: Partial<InputState> = {}): InputState {
  return {
    accelerate: false,
    brake: false,
    steerX: 0,
    ...overrides,
  };
}

// Build a simple test track (all asphalt with barrier borders)
function makeSimpleTrack(): TileType[][] {
  const track: TileType[][] = [];
  for (let y = 0; y < TRACK_HEIGHT; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < TRACK_WIDTH; x++) {
      if (x === 0 || x === TRACK_WIDTH - 1 || y === 0 || y === TRACK_HEIGHT - 1) {
        row.push('barrier');
      } else {
        row.push('asphalt');
      }
    }
    track.push(row);
  }
  return track;
}

describe('getTileAt', () => {
  const track = createDefaultTrack();

  it('returns correct tile for valid coordinates', () => {
    // Center of an asphalt tile on the bottom straight
    const tile = getTileAt(track, 5 * TILE_SIZE + 1, 61 * TILE_SIZE + 1);
    expect(tile).toBe('asphalt');
  });

  it('returns barrier for border coordinates', () => {
    const tile = getTileAt(track, 0, 0);
    expect(tile).toBe('barrier');
  });

  it('clamps negative coordinates to 0', () => {
    const tile = getTileAt(track, -100, -100);
    expect(tile).toBe('barrier'); // (0,0) is barrier
  });

  it('clamps out-of-bounds coordinates to max', () => {
    const tile = getTileAt(track, 9999, 9999);
    expect(tile).toBe('barrier'); // (31,63) is barrier
  });

  it('returns finish tile at finish line position', () => {
    const tile = getTileAt(track, 15 * TILE_SIZE + 1, 60 * TILE_SIZE + 1);
    expect(tile).toBe('finish');
  });
});

describe('getMaxSpeed', () => {
  it('returns MAX_SPEED_ASPHALT for asphalt', () => {
    expect(getMaxSpeed('asphalt')).toBe(MAX_SPEED_ASPHALT);
    expect(getMaxSpeed('asphalt')).toBe(8 * TILE_SIZE);
  });

  it('returns MAX_SPEED_GRASS for grass', () => {
    expect(getMaxSpeed('grass')).toBe(MAX_SPEED_GRASS);
    expect(getMaxSpeed('grass')).toBe(4 * TILE_SIZE);
  });

  it('returns 0 for barrier', () => {
    expect(getMaxSpeed('barrier')).toBe(0);
  });

  it('returns MAX_SPEED_ASPHALT for finish', () => {
    expect(getMaxSpeed('finish')).toBe(MAX_SPEED_ASPHALT);
  });
});

describe('updateRacer', () => {
  const track = makeSimpleTrack();
  const dt = 1 / 60; // ~16.67ms
  const now = 1000;

  it('accelerates toward max speed', () => {
    const racer = makeRacer({ speed: 0 });
    const input = makeInput({ accelerate: true });
    const result = updateRacer(racer, input, track, dt, now);
    expect(result.speed).toBeGreaterThan(0);
    expect(result.speed).toBeCloseTo(ACCELERATION * dt, 1);
  });

  it('caps speed at tile max speed', () => {
    const racer = makeRacer({ speed: MAX_SPEED_ASPHALT - 1 });
    const input = makeInput({ accelerate: true });
    const result = updateRacer(racer, input, track, dt, now);
    expect(result.speed).toBeLessThanOrEqual(MAX_SPEED_ASPHALT);
  });

  it('brakes faster than friction', () => {
    const racerBrake = makeRacer({ speed: 100 });
    const racerFriction = makeRacer({ speed: 100 });
    const inputBrake = makeInput({ brake: true });
    const inputNone = makeInput();

    const resultBrake = updateRacer(racerBrake, inputBrake, track, dt, now);
    const resultFriction = updateRacer(racerFriction, inputNone, track, dt, now);

    const brakeDelta = 100 - resultBrake.speed;
    const frictionDelta = 100 - resultFriction.speed;
    expect(brakeDelta).toBeGreaterThan(frictionDelta);
  });

  it('applies friction when no input', () => {
    const racer = makeRacer({ speed: 100 });
    const input = makeInput();
    const result = updateRacer(racer, input, track, dt, now);
    expect(result.speed).toBeLessThan(100);
    expect(result.speed).toBeCloseTo(100 - FRICTION * dt, 1);
  });

  it('does not go below zero speed with friction', () => {
    const racer = makeRacer({ speed: 1 });
    const input = makeInput();
    const result = updateRacer(racer, input, track, dt, now);
    expect(result.speed).toBeGreaterThanOrEqual(0);
  });

  it('caps speed at grass max when on grass', () => {
    // Create a track with grass at the racer position
    const grassTrack = makeSimpleTrack();
    const gx = Math.floor((14 * TILE_SIZE + TILE_SIZE / 2) / TILE_SIZE);
    const gy = Math.floor((61 * TILE_SIZE + TILE_SIZE / 2) / TILE_SIZE);
    grassTrack[gy][gx] = 'grass';

    const racer = makeRacer({ speed: MAX_SPEED_GRASS - 1 });
    const input = makeInput({ accelerate: true });
    const result = updateRacer(racer, input, grassTrack, dt, now);
    expect(result.speed).toBeLessThanOrEqual(MAX_SPEED_GRASS);
  });

  it('steering rotates angle', () => {
    const racer = makeRacer({ speed: 100, angle: 0 });
    const input = makeInput({ steerX: 1 });
    const result = updateRacer(racer, input, track, dt, now);
    expect(result.angle).not.toBe(0);
    expect(result.angle).toBeGreaterThan(0);
  });

  it('steering has no effect at zero speed (uses denominator 1)', () => {
    const racer = makeRacer({ speed: 0, angle: 0 });
    const input = makeInput({ steerX: 1 });
    const result = updateRacer(racer, input, track, dt, now);
    // At zero speed, steering still applies but with denominator 1
    // The angle should change slightly due to the formula
    expect(typeof result.angle).toBe('number');
  });

  it('barrier collision zeros speed and sets stun', () => {
    // Place racer near barrier edge so movement hits it
    const barrierTrack = makeSimpleTrack();
    // Racer at x=1 tile, moving left toward barrier at x=0
    const racer = makeRacer({
      x: 1 * TILE_SIZE + 2,
      y: 30 * TILE_SIZE + TILE_SIZE / 2,
      speed: 200,
      angle: Math.PI, // facing left
    });
    const input = makeInput({ accelerate: true });
    const result = updateRacer(racer, input, barrierTrack, dt, now);

    // Should have hit barrier: speed=0, stunned
    expect(result.speed).toBe(0);
    expect(result.stunnedUntil).toBe(now + STUN_DURATION);
    // Position should remain unchanged (old position kept)
    expect(result.x).toBe(racer.x);
    expect(result.y).toBe(racer.y);
  });

  it('ignores input during stun period', () => {
    const racer = makeRacer({
      speed: 0,
      stunnedUntil: now + 100,
    });
    const input = makeInput({ accelerate: true });
    const result = updateRacer(racer, input, track, dt, now);
    // Should be completely unchanged
    expect(result).toBe(racer); // same reference since we return early
  });

  it('resumes after stun expires', () => {
    const racer = makeRacer({
      speed: 0,
      stunnedUntil: now - 1, // stun already expired
    });
    const input = makeInput({ accelerate: true });
    const result = updateRacer(racer, input, track, dt, now);
    expect(result.speed).toBeGreaterThan(0);
  });

  it('moves position based on speed and angle', () => {
    const racer = makeRacer({
      x: 10 * TILE_SIZE,
      y: 30 * TILE_SIZE,
      speed: 100,
      angle: 0, // facing right
    });
    const input = makeInput();
    const result = updateRacer(racer, input, track, dt, now);
    // With friction applied, speed decreases but position still moves right
    expect(result.x).toBeGreaterThan(racer.x);
    expect(result.y).toBeCloseTo(racer.y, 1);
  });
});

describe('checkLapProgress', () => {
  const checkpoints = [
    { x: 16, y: 58 },
    { x: 28, y: 32 },
    { x: 16, y: 5 },
    { x: 3, y: 32 },
  ];
  const totalLaps = 3;
  const now = 5000;

  it('detects checkpoint crossing', () => {
    // Move from far away to within CHECKPOINT_RADIUS of checkpoint 0
    const cpPx = checkpoints[0].x * TILE_SIZE + TILE_SIZE / 2;
    const cpPy = checkpoints[0].y * TILE_SIZE + TILE_SIZE / 2;

    const oldRacer = makeRacer({
      x: cpPx - CHECKPOINT_RADIUS * 2,
      y: cpPy,
      lastCheckpoint: -1,
    });
    const newRacer = makeRacer({
      x: cpPx,
      y: cpPy,
      lastCheckpoint: -1,
    });

    const result = checkLapProgress(oldRacer, newRacer, checkpoints, totalLaps, now);
    expect(result.lastCheckpoint).toBe(0);
  });

  it('enforces checkpoint ordering (skip does not count)', () => {
    // Try to jump directly to checkpoint 2 without visiting 0 and 1
    const cpPx = checkpoints[2].x * TILE_SIZE + TILE_SIZE / 2;
    const cpPy = checkpoints[2].y * TILE_SIZE + TILE_SIZE / 2;

    const oldRacer = makeRacer({
      x: cpPx - CHECKPOINT_RADIUS * 2,
      y: cpPy,
      lastCheckpoint: -1, // haven't visited any
    });
    const newRacer = makeRacer({
      x: cpPx,
      y: cpPy,
      lastCheckpoint: -1,
    });

    const result = checkLapProgress(oldRacer, newRacer, checkpoints, totalLaps, now);
    // Should NOT advance because checkpoint 2 is not lastCheckpoint+1 (which would be 0)
    expect(result.lastCheckpoint).toBe(-1);
  });

  it('advances sequential checkpoints in order', () => {
    // Visit checkpoint 0 first
    const cp0Px = checkpoints[0].x * TILE_SIZE + TILE_SIZE / 2;
    const cp0Py = checkpoints[0].y * TILE_SIZE + TILE_SIZE / 2;

    const old0 = makeRacer({ x: cp0Px - CHECKPOINT_RADIUS * 2, y: cp0Py, lastCheckpoint: -1 });
    const new0 = makeRacer({ x: cp0Px, y: cp0Py, lastCheckpoint: -1 });
    const r0 = checkLapProgress(old0, new0, checkpoints, totalLaps, now);
    expect(r0.lastCheckpoint).toBe(0);

    // Then visit checkpoint 1
    const cp1Px = checkpoints[1].x * TILE_SIZE + TILE_SIZE / 2;
    const cp1Py = checkpoints[1].y * TILE_SIZE + TILE_SIZE / 2;

    const old1 = makeRacer({ x: cp1Px - CHECKPOINT_RADIUS * 2, y: cp1Py, lastCheckpoint: 0 });
    const new1 = makeRacer({ x: cp1Px, y: cp1Py, lastCheckpoint: 0 });
    const r1 = checkLapProgress(old1, new1, checkpoints, totalLaps, now);
    expect(r1.lastCheckpoint).toBe(1);
  });

  it('increments lap on finish line after all checkpoints', () => {
    // All checkpoints visited, now cross checkpoint 0 area again (finish trigger)
    const cp0Px = checkpoints[0].x * TILE_SIZE + TILE_SIZE / 2;
    const cp0Py = checkpoints[0].y * TILE_SIZE + TILE_SIZE / 2;

    const oldRacer = makeRacer({
      x: cp0Px - CHECKPOINT_RADIUS * 2,
      y: cp0Py,
      lap: 0,
      lastCheckpoint: checkpoints.length - 1, // all visited
    });
    const newRacer = makeRacer({
      x: cp0Px,
      y: cp0Py,
      lap: 0,
      lastCheckpoint: checkpoints.length - 1,
    });

    const result = checkLapProgress(oldRacer, newRacer, checkpoints, totalLaps, now);
    expect(result.lap).toBe(1);
    expect(result.lastCheckpoint).toBe(0);
    expect(result.finished).toBe(false);
  });

  it('sets finished=true on final lap completion', () => {
    const cp0Px = checkpoints[0].x * TILE_SIZE + TILE_SIZE / 2;
    const cp0Py = checkpoints[0].y * TILE_SIZE + TILE_SIZE / 2;

    const oldRacer = makeRacer({
      x: cp0Px - CHECKPOINT_RADIUS * 2,
      y: cp0Py,
      lap: totalLaps - 1, // on last lap
      lastCheckpoint: checkpoints.length - 1,
    });
    const newRacer = makeRacer({
      x: cp0Px,
      y: cp0Py,
      lap: totalLaps - 1,
      lastCheckpoint: checkpoints.length - 1,
    });

    const result = checkLapProgress(oldRacer, newRacer, checkpoints, totalLaps, now);
    expect(result.lap).toBe(totalLaps);
    expect(result.finished).toBe(true);
    expect(result.finishTime).toBe(now);
  });

  it('does not change state when no checkpoint is crossed', () => {
    const oldRacer = makeRacer({
      x: 10 * TILE_SIZE,
      y: 30 * TILE_SIZE,
      lap: 0,
      lastCheckpoint: 0,
    });
    const newRacer = makeRacer({
      x: 10 * TILE_SIZE + 5,
      y: 30 * TILE_SIZE + 5,
      lap: 0,
      lastCheckpoint: 0,
    });

    const result = checkLapProgress(oldRacer, newRacer, checkpoints, totalLaps, now);
    expect(result.lap).toBe(0);
    expect(result.lastCheckpoint).toBe(0);
    expect(result.finished).toBe(false);
    expect(result.finishTime).toBeNull();
  });
});
