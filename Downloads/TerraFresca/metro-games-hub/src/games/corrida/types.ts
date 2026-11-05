export type TileType = 'asphalt' | 'grass' | 'barrier' | 'finish';

export type PlayerIndex = 0 | 1;

export interface RacerState {
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  lastCheckpoint: number;
  finished: boolean;
  finishTime: number | null;
  stunnedUntil: number;
}

export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface RaceState {
  racers: [RacerState, RacerState];
  track: TileType[][];
  checkpoints: Array<{ x: number; y: number }>;
  totalLaps: number;
  phase: RacePhase;
  countdownTimer: number;
  winner: PlayerIndex | null;
  startTime: number;
  elapsed: number;
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  steerX: number;
}

export type LayoutMode = 'split-screen' | 'overlay';
