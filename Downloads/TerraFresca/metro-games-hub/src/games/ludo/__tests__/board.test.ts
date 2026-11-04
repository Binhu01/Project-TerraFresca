import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  getAbsolutePosition,
  isSafeSquare,
  getHomeStretchStart,
  getLogicalPosition,
  getNextPlayer,
  getAllPlayers,
  MAIN_TRACK_LENGTH,
} from '../board';
import type { Player } from '../types';

describe('createInitialBoard', () => {
  it('returns an empty Map', () => {
    const board = createInitialBoard();
    expect(board).toBeInstanceOf(Map);
    expect(board.size).toBe(0);
  });
});

describe('getAbsolutePosition', () => {
  it('maps red logical 0 to absolute 0', () => {
    expect(getAbsolutePosition('red', 0)).toBe(0);
  });

  it('maps green logical 0 to absolute 13', () => {
    expect(getAbsolutePosition('green', 0)).toBe(13);
  });

  it('maps yellow logical 0 to absolute 26', () => {
    expect(getAbsolutePosition('yellow', 0)).toBe(26);
  });

  it('maps blue logical 0 to absolute 39', () => {
    expect(getAbsolutePosition('blue', 0)).toBe(39);
  });

  it('wraps red logical 51 to absolute 51', () => {
    expect(getAbsolutePosition('red', 51)).toBe(51);
  });

  it('wraps green logical 51 to absolute 12', () => {
    // (51 + 13) % 52 = 64 % 52 = 12
    expect(getAbsolutePosition('green', 51)).toBe(12);
  });

  it('wraps yellow logical 51 to absolute 25', () => {
    // (51 + 26) % 52 = 77 % 52 = 25
    expect(getAbsolutePosition('yellow', 51)).toBe(25);
  });

  it('wraps blue logical 51 to absolute 38', () => {
    // (51 + 39) % 52 = 90 % 52 = 38
    expect(getAbsolutePosition('blue', 51)).toBe(38);
  });

  it('handles mid-track positions correctly', () => {
    // red logical 26 -> absolute 26
    expect(getAbsolutePosition('red', 26)).toBe(26);
    // green logical 26 -> (26+13)%52 = 39
    expect(getAbsolutePosition('green', 26)).toBe(39);
  });
});

describe('isSafeSquare', () => {
  const safePositions = [0, 8, 13, 21, 26, 34, 39, 47];

  it.each(safePositions)('returns true for safe position %i', (pos) => {
    expect(isSafeSquare(pos)).toBe(true);
  });

  it('returns false for non-safe positions', () => {
    const nonSafe = [1, 2, 7, 9, 12, 14, 20, 22, 25, 27, 33, 35, 38, 40, 46, 48, 50, 51];
    for (const pos of nonSafe) {
      expect(isSafeSquare(pos)).toBe(false);
    }
  });

  it('returns false for negative positions', () => {
    expect(isSafeSquare(-1)).toBe(false);
  });

  it('returns false for positions beyond the track', () => {
    expect(isSafeSquare(52)).toBe(false);
  });
});

describe('getHomeStretchStart', () => {
  it('returns correct entry point for red', () => {
    // red offset 0, logical 51 -> absolute 51
    expect(getHomeStretchStart('red')).toBe(51);
  });

  it('returns correct entry point for green', () => {
    // green offset 13, logical 51 -> (51+13)%52 = 12
    expect(getHomeStretchStart('green')).toBe(12);
  });

  it('returns correct entry point for yellow', () => {
    // yellow offset 26, logical 51 -> (51+26)%52 = 25
    expect(getHomeStretchStart('yellow')).toBe(25);
  });

  it('returns correct entry point for blue', () => {
    // blue offset 39, logical 51 -> (51+39)%52 = 38
    expect(getHomeStretchStart('blue')).toBe(38);
  });
});

describe('getLogicalPosition', () => {
  const players: Player[] = ['red', 'green', 'yellow', 'blue'];

  it.each(players)('is inverse of getAbsolutePosition for %s', (player) => {
    for (let logical = 0; logical < MAIN_TRACK_LENGTH; logical++) {
      const abs = getAbsolutePosition(player, logical);
      expect(getLogicalPosition(player, abs)).toBe(logical);
    }
  });

  it('correctly inverts specific cases', () => {
    expect(getLogicalPosition('red', 0)).toBe(0);
    expect(getLogicalPosition('green', 13)).toBe(0);
    expect(getLogicalPosition('yellow', 26)).toBe(0);
    expect(getLogicalPosition('blue', 39)).toBe(0);
    expect(getLogicalPosition('green', 12)).toBe(51);
  });
});

describe('getNextPlayer', () => {
  it('cycles red -> green -> yellow -> blue -> red', () => {
    expect(getNextPlayer('red')).toBe('green');
    expect(getNextPlayer('green')).toBe('yellow');
    expect(getNextPlayer('yellow')).toBe('blue');
    expect(getNextPlayer('blue')).toBe('red');
  });
});

describe('getAllPlayers', () => {
  it('returns all four players in order', () => {
    expect(getAllPlayers()).toEqual(['red', 'green', 'yellow', 'blue']);
  });

  it('returns a new array each time', () => {
    const a = getAllPlayers();
    const b = getAllPlayers();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
