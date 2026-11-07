import { describe, it, expect } from '@jest/globals';
import {
  createInitialRaceState,
  updateCountdown,
  updateRacing,
  updateRace,
  determineWinner,
} from '../raceEngine';
import type { RaceState, RacerState, InputState } from '../types';
import { START_POSITIONS, TILE_SIZE, TOTAL_LAPS, CHECKPOINTS } from '../track';

const NO_INPUT: InputState = { accelerate: false, brake: false, steerX: 0 };
const BOTH_NO_INPUT: [InputState, InputState] = [NO_INPUT, NO_INPUT];

describe('createInitialRaceState', () => {
  it('has correct structure with both racers at start positions', () => {
    const state = createInitialRaceState();

    expect(state.phase).toBe('countdown');
    expect(state.countdownTimer).toBe(3000);
    expect(state.winner).toBeNull();
    expect(state.totalLaps).toBe(TOTAL_LAPS);
    expect(state.checkpoints).toBe(CHECKPOINTS);
    expect(state.startTime).toBe(0);
    expect(state.elapsed).toBe(0);

    // Check racer 0 position (pixel center of tile)
    expect(state.racers[0].x).toBe(START_POSITIONS[0].x * TILE_SIZE + TILE_SIZE / 2);
    expect(state.racers[0].y).toBe(START_POSITIONS[0].y * TILE_SIZE + TILE_SIZE / 2);
    expect(state.racers[0].angle).toBe(-Math.PI / 2);
    expect(state.racers[0].speed).toBe(0);
    expect(state.racers[0].lap).toBe(0);
    expect(state.racers[0].lastCheckpoint).toBe(-1);
    expect(state.racers[0].finished).toBe(false);
    expect(state.racers[0].finishTime).toBeNull();
    expect(state.racers[0].stunnedUntil).toBe(0);

    // Check racer 1 position
    expect(state.racers[1].x).toBe(START_POSITIONS[1].x * TILE_SIZE + TILE_SIZE / 2);
    expect(state.racers[1].y).toBe(START_POSITIONS[1].y * TILE_SIZE + TILE_SIZE / 2);
    expect(state.racers[1].angle).toBe(-Math.PI / 2);
    expect(state.racers[1].speed).toBe(0);
    expect(state.racers[1].lap).toBe(0);
    expect(state.racers[1].lastCheckpoint).toBe(-1);
    expect(state.racers[1].finished).toBe(false);
    expect(state.racers[1].finishTime).toBeNull();
    expect(state.racers[1].stunnedUntil).toBe(0);
  });

  it('returns a new object each call (no shared references)', () => {
    const a = createInitialRaceState();
    const b = createInitialRaceState();
    expect(a).not.toBe(b);
    expect(a.racers).not.toBe(b.racers);
    expect(a.racers[0]).not.toBe(b.racers[0]);
  });
});

describe('updateCountdown', () => {
  it('decrements countdownTimer by deltaTime*1000', () => {
    const state = createInitialRaceState();
    const result = updateCountdown(state, 0.5, 1000);

    expect(result.countdownTimer).toBe(2500);
    expect(result.phase).toBe('countdown');
  });

  it('transitions to racing when timer reaches zero', () => {
    const state = createInitialRaceState();
    const result = updateCountdown(state, 3.0, 5000);

    expect(result.countdownTimer).toBe(0);
    expect(result.phase).toBe('racing');
    expect(result.startTime).toBe(5000);
  });

  it('transitions to racing when timer goes below zero', () => {
    const state = createInitialRaceState();
    const result = updateCountdown(state, 4.0, 7000);

    expect(result.countdownTimer).toBe(0);
    expect(result.phase).toBe('racing');
    expect(result.startTime).toBe(7000);
  });

  it('does not mutate the original state', () => {
    const state = createInitialRaceState();
    const originalTimer = state.countdownTimer;
    updateCountdown(state, 1.0, 1000);

    expect(state.countdownTimer).toBe(originalTimer);
    expect(state.phase).toBe('countdown');
  });
});

describe('determineWinner', () => {
  function makeRacer(overrides: Partial<RacerState> = {}): RacerState {
    return {
      x: 0, y: 0, angle: 0, speed: 0,
      lap: 0, lastCheckpoint: -1,
      finished: false, finishTime: null,
      stunnedUntil: 0,
      ...overrides,
    };
  }

  it('returns null when neither racer has finished', () => {
    const result = determineWinner([makeRacer(), makeRacer()]);
    expect(result).toBeNull();
  });

  it('returns index 0 when only player 0 finished', () => {
    const result = determineWinner([
      makeRacer({ finished: true, finishTime: 1000 }),
      makeRacer(),
    ]);
    expect(result).toBe(0);
  });

  it('returns index 1 when only player 1 finished', () => {
    const result = determineWinner([
      makeRacer(),
      makeRacer({ finished: true, finishTime: 1000 }),
    ]);
    expect(result).toBe(1);
  });

  it('tie-breaks by lower finishTime when both finished', () => {
    const result = determineWinner([
      makeRacer({ finished: true, finishTime: 2000 }),
      makeRacer({ finished: true, finishTime: 1500 }),
    ]);
    expect(result).toBe(1);
  });

  it('returns player 0 when both finished with equal finishTime', () => {
    const result = determineWinner([
      makeRacer({ finished: true, finishTime: 1000 }),
      makeRacer({ finished: true, finishTime: 1000 }),
    ]);
    expect(result).toBe(0);
  });
});

describe('updateRacing', () => {
  it('updates both racers based on inputs', () => {
    const state: RaceState = {
      ...createInitialRaceState(),
      phase: 'racing',
      startTime: 0,
    };

    const inputs: [InputState, InputState] = [
      { accelerate: true, brake: false, steerX: 0 },
      { accelerate: false, brake: false, steerX: 0 },
    ];

    const result = updateRacing(state, inputs, 1 / 60, 100);

    // Player 0 accelerated — should have moved or gained speed
    // Player 1 had no input — friction applies
    expect(result).not.toBe(state);
    expect(result.racers).not.toBe(state.racers);
    expect(result.racers[0]).not.toBe(state.racers[0]);
    expect(result.racers[1]).not.toBe(state.racers[1]);
  });

  it('does not mutate the original state', () => {
    const state: RaceState = {
      ...createInitialRaceState(),
      phase: 'racing',
      startTime: 0,
    };

    const origRacer0X = state.racers[0].x;
    const origRacer1X = state.racers[1].x;

    updateRacing(state, BOTH_NO_INPUT, 1 / 60, 100);

    expect(state.racers[0].x).toBe(origRacer0X);
    expect(state.racers[1].x).toBe(origRacer1X);
  });
});

describe('updateRace dispatcher', () => {
  it('calls updateCountdown during countdown phase', () => {
    const state = createInitialRaceState();
    const result = updateRace(state, BOTH_NO_INPUT, 1.0, 1000);

    expect(result.phase).toBe('countdown');
    expect(result.countdownTimer).toBe(2000);
  });

  it('calls updateRacing during racing phase', () => {
    const state: RaceState = {
      ...createInitialRaceState(),
      phase: 'racing',
      startTime: 0,
    };

    const result = updateRace(state, BOTH_NO_INPUT, 1 / 60, 100);
    expect(result.phase).toBe('racing');
    expect(result.elapsed).toBe(100);
  });

  it('returns state unchanged during finished phase (terminal)', () => {
    const state: RaceState = {
      ...createInitialRaceState(),
      phase: 'finished',
      winner: 0,
    };

    const result = updateRace(state, BOTH_NO_INPUT, 1 / 60, 9999);
    expect(result).toBe(state);
  });

  it('full lifecycle: countdown -> racing -> finished', () => {
    let state = createInitialRaceState();

    // Run through countdown (3 seconds)
    state = updateRace(state, BOTH_NO_INPUT, 1.5, 1500);
    expect(state.phase).toBe('countdown');
    expect(state.countdownTimer).toBe(1500);

    state = updateRace(state, BOTH_NO_INPUT, 1.5, 3000);
    expect(state.phase).toBe('racing');
    expect(state.startTime).toBe(3000);

    // Racing phase — state should update but remain racing
    // (racers won't finish without moving around the track)
    state = updateRace(state, BOTH_NO_INPUT, 1 / 60, 3016);
    expect(state.phase).toBe('racing');
  });
});
