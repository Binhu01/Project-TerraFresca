import type { RaceState, RacerState, InputState, PlayerIndex } from './types';
import { createDefaultTrack, CHECKPOINTS, START_POSITIONS, TOTAL_LAPS, TILE_SIZE } from './track';
import { updateRacer, checkLapProgress } from './physics';

/**
 * Creates the initial race state with both racers at their starting positions.
 * Pure function — no side effects.
 */
export function createInitialRaceState(): RaceState {
  const track = createDefaultTrack();

  const racer0: RacerState = {
    x: START_POSITIONS[0].x * TILE_SIZE + TILE_SIZE / 2,
    y: START_POSITIONS[0].y * TILE_SIZE + TILE_SIZE / 2,
    angle: -Math.PI / 2,
    speed: 0,
    lap: 0,
    lastCheckpoint: -1,
    finished: false,
    finishTime: null,
    stunnedUntil: 0,
  };

  const racer1: RacerState = {
    x: START_POSITIONS[1].x * TILE_SIZE + TILE_SIZE / 2,
    y: START_POSITIONS[1].y * TILE_SIZE + TILE_SIZE / 2,
    angle: -Math.PI / 2,
    speed: 0,
    lap: 0,
    lastCheckpoint: -1,
    finished: false,
    finishTime: null,
    stunnedUntil: 0,
  };

  return {
    racers: [racer0, racer1],
    track,
    checkpoints: CHECKPOINTS,
    totalLaps: TOTAL_LAPS,
    phase: 'countdown',
    countdownTimer: 3000,
    winner: null,
    startTime: 0,
    elapsed: 0,
  };
}

/**
 * Updates the countdown phase. Decrements timer by deltaTime (in seconds),
 * transitions to 'racing' when timer reaches zero.
 * Pure function — accepts `now` instead of calling Date.now().
 */
export function updateCountdown(
  state: RaceState,
  deltaTime: number,
  now: number,
): RaceState {
  const newTimer = state.countdownTimer - deltaTime * 1000;

  if (newTimer <= 0) {
    return {
      ...state,
      countdownTimer: 0,
      phase: 'racing',
      startTime: now,
    };
  }

  return {
    ...state,
    countdownTimer: newTimer,
  };
}

/**
 * Determines the winner from the current racer states.
 * Returns the index of the finished racer, or the one with lower finishTime
 * if both finished in the same frame. Returns null if neither has finished.
 */
export function determineWinner(
  racers: [RacerState, RacerState],
): PlayerIndex | null {
  const p0Finished = racers[0].finished;
  const p1Finished = racers[1].finished;

  if (!p0Finished && !p1Finished) {
    return null;
  }

  if (p0Finished && !p1Finished) {
    return 0;
  }

  if (!p0Finished && p1Finished) {
    return 1;
  }

  // Both finished — tie-break by finishTime (lower wins)
  const t0 = racers[0].finishTime ?? Infinity;
  const t1 = racers[1].finishTime ?? Infinity;

  if (t0 <= t1) {
    return 0;
  }
  return 1;
}

/**
 * Updates the racing phase. Applies physics and lap progress for both racers,
 * then checks for a winner and transitions to 'finished' if one is found.
 * Pure function — accepts `now` instead of calling Date.now().
 */
export function updateRacing(
  state: RaceState,
  inputs: [InputState, InputState],
  deltaTime: number,
  now: number,
): RaceState {
  // Update each racer's physics
  const oldRacer0 = state.racers[0];
  const oldRacer1 = state.racers[1];

  const newRacer0Phys = updateRacer(oldRacer0, inputs[0], state.track, deltaTime, now);
  const newRacer1Phys = updateRacer(oldRacer1, inputs[1], state.track, deltaTime, now);

  // Check lap progress for each racer
  const progress0 = checkLapProgress(
    oldRacer0,
    newRacer0Phys,
    state.checkpoints,
    state.totalLaps,
    now,
  );

  const progress1 = checkLapProgress(
    oldRacer1,
    newRacer1Phys,
    state.checkpoints,
    state.totalLaps,
    now,
  );

  const newRacer0: RacerState = {
    ...newRacer0Phys,
    lap: progress0.lap,
    lastCheckpoint: progress0.lastCheckpoint,
    finished: progress0.finished,
    finishTime: progress0.finishTime,
  };

  const newRacer1: RacerState = {
    ...newRacer1Phys,
    lap: progress1.lap,
    lastCheckpoint: progress1.lastCheckpoint,
    finished: progress1.finished,
    finishTime: progress1.finishTime,
  };

  const newRacers: [RacerState, RacerState] = [newRacer0, newRacer1];

  // Determine winner
  const winner = determineWinner(newRacers);

  const newElapsed = now - state.startTime;

  if (winner !== null) {
    return {
      ...state,
      racers: newRacers,
      phase: 'finished',
      winner,
      elapsed: newElapsed,
    };
  }

  return {
    ...state,
    racers: newRacers,
    elapsed: newElapsed,
  };
}

/**
 * Main race update dispatcher. Routes to the appropriate phase handler.
 * If phase is 'finished', returns state unchanged (terminal state).
 * Pure function — accepts `now` instead of calling Date.now().
 */
export function updateRace(
  state: RaceState,
  inputs: [InputState, InputState],
  deltaTime: number,
  now: number,
): RaceState {
  switch (state.phase) {
    case 'countdown':
      return updateCountdown(state, deltaTime, now);
    case 'racing':
      return updateRacing(state, inputs, deltaTime, now);
    case 'finished':
      return state;
  }
}
