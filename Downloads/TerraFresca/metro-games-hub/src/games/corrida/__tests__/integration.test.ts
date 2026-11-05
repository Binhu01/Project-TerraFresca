import { describe, it, expect } from 'vitest';
import type { RacerState, InputState, RaceState } from '../types';
import { createDefaultTrack, CHECKPOINTS, TILE_SIZE, TOTAL_LAPS, TRACK_WIDTH, TRACK_HEIGHT } from '../track';
import { updateRacer, checkLapProgress, MAX_SPEED_GRASS, STUN_DURATION } from '../physics';
import {
  createInitialRaceState,
  updateRace,
  determineWinner,
} from '../raceEngine';

describe('Corrida Pixel Integration Tests', () => {
  const track = createDefaultTrack();

  const noInput: InputState = { accelerate: false, brake: false, steerX: 0 };
  const accelInput: InputState = { accelerate: true, brake: false, steerX: 0 };

  function makeRacer(overrides: Partial<RacerState> = {}): RacerState {
    return {
      x: 14 * TILE_SIZE + TILE_SIZE / 2,
      y: 61 * TILE_SIZE + TILE_SIZE / 2,
      angle: -Math.PI / 2,
      speed: 0,
      lap: 0,
      lastCheckpoint: -1,
      finished: false,
      finishTime: null,
      stunnedUntil: 0,
      ...overrides,
    };
  }

  describe('Full race simulation (near-finish completion)', () => {
    it('completes the race when a racer is near finish with all checkpoints visited', () => {
      // Place P1 just before checkpoint 0 (finish trigger) with all checkpoints visited
      // and lap count at totalLaps - 1 so crossing checkpoint 0 finishes the race.
      const cp0 = CHECKPOINTS[0];
      const cp0Px = cp0.x * TILE_SIZE + TILE_SIZE / 2;
      const cp0Py = cp0.y * TILE_SIZE + TILE_SIZE / 2;

      // Start slightly below checkpoint 0 so moving upward crosses it
      const startRacer: RacerState = {
        x: cp0Px,
        y: cp0Py + TILE_SIZE, // one tile below checkpoint 0
        angle: -Math.PI / 2, // facing up
        speed: 200,
        lap: TOTAL_LAPS - 1,
        lastCheckpoint: CHECKPOINTS.length - 1, // all checkpoints visited
        finished: false,
        finishTime: null,
        stunnedUntil: 0,
      };

      const state: RaceState = {
        ...createInitialRaceState(),
        racers: [startRacer, makeRacer({ x: 3 * TILE_SIZE, y: 30 * TILE_SIZE })],
        phase: 'racing',
        startTime: 0,
      };

      const inputs: [InputState, InputState] = [accelInput, noInput];

      // Simulate several frames to cross checkpoint 0
      let current = state;
      let now = 1000;
      for (let i = 0; i < 20; i++) {
        current = updateRace(current, inputs, 1 / 60, now);
        now += 1000 / 60;
      }

      expect(current.racers[0].finished).toBe(true);
      expect(current.racers[0].finishTime).not.toBeNull();
      expect(current.phase).toBe('finished');
      expect(current.winner).toBe(0);
    });
  });

  describe('Grass slowdown', () => {
    it('caps speed at MAX_SPEED_GRASS when on grass tile', () => {
      // Find a grass tile: rows 15-48, cols 6-25 are grass in the straight sections
      const grassTileX = 10;
      const grassTileY = 30;
      const racer = makeRacer({
        x: grassTileX * TILE_SIZE + TILE_SIZE / 2,
        y: grassTileY * TILE_SIZE + TILE_SIZE / 2,
        speed: 0,
      });

      // Verify we're actually on grass
      expect(track[grassTileY][grassTileX]).toBe('grass');

      // Accelerate for many frames to try to exceed grass max speed
      let current = racer;
      let now = 1000;
      for (let i = 0; i < 200; i++) {
        current = updateRacer(current, accelInput, track, 1 / 60, now);
        now += 1000 / 60;
      }

      expect(current.speed).toBeLessThanOrEqual(MAX_SPEED_GRASS + 0.01);
      expect(current.speed).toBeGreaterThan(0);
    });
  });

  describe('Barrier collision', () => {
    it('sets speed to 0 and stunnedUntil on barrier hit, ignores input during stun', () => {
      // Place racer near the top edge of row 1, moving upward into barrier at row 0.
      // Row 1 spans y=[32,64). Place racer at y=34 so that with speed 200 and dt=1/60,
      // dy = cos(-PI/2)*200*(1/60) ≈ -3.33, new y ≈ 30.67 which is in row 0 (barrier).
      const racer = makeRacer({
        x: 16 * TILE_SIZE + TILE_SIZE / 2,
        y: TILE_SIZE + 2, // just inside row 1, near barrier boundary
        angle: -Math.PI / 2, // facing up toward row 0 barrier
        speed: 200,
      });

      const now = 5000;
      const result = updateRacer(racer, accelInput, track, 1 / 60, now);

      expect(result.speed).toBe(0);
      expect(result.stunnedUntil).toBe(now + STUN_DURATION);

      // During stun period, input should be ignored
      const duringStun = updateRacer(result, accelInput, track, 1 / 60, now + 100);
      expect(duringStun.speed).toBe(0);
      expect(duringStun.x).toBe(result.x);
      expect(duringStun.y).toBe(result.y);
      expect(duringStun.angle).toBe(result.angle);

      // After stun expires, input should work again
      const afterStun = updateRacer(result, accelInput, track, 1 / 60, now + STUN_DURATION + 1);
      expect(afterStun.speed).toBeGreaterThan(0);
    });
  });

  describe('Checkpoint ordering', () => {
    it('does not advance lastCheckpoint when skipping checkpoints out of order', () => {
      // Racer starts with lastCheckpoint = -1 (no checkpoints visited)
      // Try to pass checkpoint 2 directly without passing 0 and 1 first
      const cp2 = CHECKPOINTS[2]; // top straight midpoint
      const cp2Px = cp2.x * TILE_SIZE + TILE_SIZE / 2;
      const cp2Py = cp2.y * TILE_SIZE + TILE_SIZE / 2;

      const oldRacer = makeRacer({
        x: cp2Px - TILE_SIZE,
        y: cp2Py,
        lastCheckpoint: -1,
      });

      const newRacer = makeRacer({
        x: cp2Px + TILE_SIZE,
        y: cp2Py,
        lastCheckpoint: -1,
      });

      const result = checkLapProgress(oldRacer, newRacer, CHECKPOINTS, TOTAL_LAPS, 1000);

      // lastCheckpoint should NOT advance because checkpoint 0 was not visited first
      expect(result.lastCheckpoint).toBe(-1);
      expect(result.lap).toBe(0);
      expect(result.finished).toBe(false);
    });

    it('advances lastCheckpoint only when visiting the next expected checkpoint', () => {
      // Visit checkpoint 0 first (the correct next checkpoint from -1)
      const cp0 = CHECKPOINTS[0];
      const cp0Px = cp0.x * TILE_SIZE + TILE_SIZE / 2;
      const cp0Py = cp0.y * TILE_SIZE + TILE_SIZE / 2;

      const oldRacer = makeRacer({
        x: cp0Px - TILE_SIZE,
        y: cp0Py,
        lastCheckpoint: -1,
      });

      const newRacer = makeRacer({
        x: cp0Px + TILE_SIZE,
        y: cp0Py,
        lastCheckpoint: -1,
      });

      const result = checkLapProgress(oldRacer, newRacer, CHECKPOINTS, TOTAL_LAPS, 1000);

      expect(result.lastCheckpoint).toBe(0);
    });
  });

  describe('Tie-break', () => {
    it('returns the racer with lower finishTime when both finished', () => {
      const racers: [RacerState, RacerState] = [
        makeRacer({ finished: true, finishTime: 5000 }),
        makeRacer({ finished: true, finishTime: 4500 }),
      ];

      expect(determineWinner(racers)).toBe(1);
    });

    it('returns P0 when both have equal finishTime', () => {
      const racers: [RacerState, RacerState] = [
        makeRacer({ finished: true, finishTime: 5000 }),
        makeRacer({ finished: true, finishTime: 5000 }),
      ];

      expect(determineWinner(racers)).toBe(0);
    });

    it('returns the only finished racer', () => {
      const racers: [RacerState, RacerState] = [
        makeRacer({ finished: false, finishTime: null }),
        makeRacer({ finished: true, finishTime: 4000 }),
      ];

      expect(determineWinner(racers)).toBe(1);
    });

    it('returns null when neither racer has finished', () => {
      const racers: [RacerState, RacerState] = [
        makeRacer({ finished: false, finishTime: null }),
        makeRacer({ finished: false, finishTime: null }),
      ];

      expect(determineWinner(racers)).toBeNull();
    });
  });

  describe('Countdown transition', () => {
    it('transitions from countdown to racing after timer expires', () => {
      const state = createInitialRaceState();
      expect(state.phase).toBe('countdown');
      expect(state.countdownTimer).toBe(3000);

      // Pass 4 seconds (deltaTime is in seconds)
      const now = 10000;
      const result = updateRace(state, [noInput, noInput], 4, now);

      expect(result.phase).toBe('racing');
      expect(result.countdownTimer).toBe(0);
      expect(result.startTime).toBe(now);
    });

    it('decrements countdown timer without transitioning when time remains', () => {
      const state = createInitialRaceState();
      const now = 10000;

      // Pass 1 second — timer should decrease but stay in countdown
      const result = updateRace(state, [noInput, noInput], 1, now);

      expect(result.phase).toBe('countdown');
      expect(result.countdownTimer).toBe(2000);
    });
  });

  describe('Performance sanity', () => {
    it('runs 1000 frames of updateRace under 16ms average per frame', () => {
      const state = createInitialRaceState();
      // Transition to racing phase first
      const racingState = updateRace(state, [noInput, noInput], 4, 10000);

      const inputs: [InputState, InputState] = [accelInput, accelInput];
      const deltaTime = 1 / 60;

      // Warm up
      let current = racingState;
      let now = 20000;
      for (let i = 0; i < 10; i++) {
        current = updateRace(current, inputs, deltaTime, now);
        now += deltaTime * 1000;
      }

      // Measure 1000 iterations
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        current = updateRace(current, inputs, deltaTime, now);
        now += deltaTime * 1000;
      }

      const elapsed = performance.now() - start;
      const avgMs = elapsed / iterations;

      expect(avgMs).toBeLessThan(16);
    });
  });
});
