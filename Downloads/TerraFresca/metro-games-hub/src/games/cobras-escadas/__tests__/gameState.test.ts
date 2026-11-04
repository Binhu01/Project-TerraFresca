import { createInitialState, rollDice, startRoll, movePawn, applySnakeOrLadder, checkWin, advanceTurn } from '../gameState';
import type { BoardConfig } from '../board';

const mockBoard: BoardConfig = {
  snakes: { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 },
  ladders: { 1: 38, 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81 },
};

// Note: use a board config that satisfies constraints for testing.
// The exact values above are illustrative — adjust to match generateBoard output or use hand-crafted valid config.

test('createInitialState sets up players at position 1', () => {
  const state = createInitialState(2, mockBoard);
  expect(state.players).toHaveLength(2);
  expect(state.players[0].position).toBe(1);
  expect(state.players[1].position).toBe(1);
  expect(state.currentPlayerIndex).toBe(0);
  expect(state.phase).toBe('waiting-roll');
  expect(state.winner).toBeNull();
});

test('rollDice with forcedValue returns exact value', () => {
  const state = createInitialState(2, mockBoard);
  for (let v = 1; v <= 6; v++) {
    const result = rollDice(state, v);
    expect(result.diceValue).toBe(v);
  }
});

test('rollDice without forcedValue produces values in [1,6]', () => {
  const state = createInitialState(2, mockBoard);
  const results = new Set<number>();
  for (let i = 0; i < 50; i++) {
    const result = rollDice(state);
    expect(result.diceValue).toBeGreaterThanOrEqual(1);
    expect(result.diceValue).toBeLessThanOrEqual(6);
    results.add(result.diceValue);
  }
  // With 50 rolls, we should see at least 4 distinct values
  expect(results.size).toBeGreaterThanOrEqual(4);
});

test('movePawn advances player by dice value', () => {
  const state = createInitialState(2, mockBoard);
  const rolled = rollDice(state);
  // Force dice value to 3 for deterministic test
  const moved = movePawn({ ...rolled.state, diceValue: 3 });
  expect(moved.state.players[0].position).toBe(4); // 1 + 3
});

test('movePawn does not move if overshooting 100', () => {
  const state = createInitialState(2, mockBoard);
  // Set player at position 97
  const stateAt97 = {
    ...state,
    players: [{ ...state.players[0], position: 97 }, state.players[1]],
  };
  const rolled = rollDice(stateAt97);
  // Force dice value to 5 (97 + 5 = 102 > 100)
  const moved = movePawn({ ...rolled.state, diceValue: 5 });
  expect(moved.state.players[0].position).toBe(97); // stays put
});

test('movePawn lands exactly on 100', () => {
  const state = createInitialState(2, mockBoard);
  const stateAt97 = {
    ...state,
    players: [{ ...state.players[0], position: 97 }, state.players[1]],
  };
  const rolled = rollDice(stateAt97);
  const moved = movePawn({ ...rolled.state, diceValue: 3 });
  expect(moved.state.players[0].position).toBe(100);
});

test('applySnakeOrLadder moves player down snake', () => {
  // Use a board where we know snake positions
  const board: BoardConfig = { snakes: { 16: 6 }, ladders: {} };
  const state = createInitialState(2, board);
  const stateAt16 = {
    ...state,
    players: [{ ...state.players[0], position: 16 }, state.players[1]],
    phase: 'snake-ladder' as const,
  };
  const result = applySnakeOrLadder(stateAt16);
  expect(result.players[0].position).toBe(6);
});

test('applySnakeOrLadder moves player up ladder', () => {
  const board: BoardConfig = { snakes: {}, ladders: { 4: 14 } };
  const state = createInitialState(2, board);
  const stateAt4 = {
    ...state,
    players: [{ ...state.players[0], position: 4 }, state.players[1]],
    phase: 'snake-ladder' as const,
  };
  const result = applySnakeOrLadder(stateAt4);
  expect(result.players[0].position).toBe(14);
});

test('applySnakeOrLadder no-op when not on snake or ladder', () => {
  const board: BoardConfig = { snakes: { 16: 6 }, ladders: { 4: 14 } };
  const state = createInitialState(2, board);
  const stateAt10 = {
    ...state,
    players: [{ ...state.players[0], position: 10 }, state.players[1]],
    phase: 'snake-ladder' as const,
  };
  const result = applySnakeOrLadder(stateAt10);
  expect(result.players[0].position).toBe(10);
});

test('checkWin returns true when player is at 100', () => {
  const state = createInitialState(2, mockBoard);
  const stateAt100 = {
    ...state,
    players: [{ ...state.players[0], position: 100 }, state.players[1]],
  };
  expect(checkWin(stateAt100)).toBe(true);
});

test('checkWin returns false when player is not at 100', () => {
  const state = createInitialState(2, mockBoard);
  expect(checkWin(state)).toBe(false);
});

test('advanceTurn cycles to next player', () => {
  const state = createInitialState(3, mockBoard);
  expect(state.currentPlayerIndex).toBe(0);
  const next = advanceTurn(state);
  expect(next.currentPlayerIndex).toBe(1);
  const next2 = advanceTurn(next);
  expect(next2.currentPlayerIndex).toBe(2);
  const next3 = advanceTurn(next2);
  expect(next3.currentPlayerIndex).toBe(0); // wraps around
});

test('startRoll transitions from waiting-roll to rolling', () => {
  const state = createInitialState(2, mockBoard);
  expect(state.phase).toBe('waiting-roll');
  const result = startRoll(state, 4);
  expect(result.state.phase).toBe('rolling');
  expect(result.diceValue).toBe(4);
  expect(result.state.diceValue).toBe(4);
});

test('startRoll throws if not in waiting-roll phase', () => {
  const state = createInitialState(2, mockBoard);
  const rolled = rollDice(state, 3);
  expect(() => startRoll(rolled.state, 5)).toThrow(/invalid phase/);
});

test('startRoll without forcedValue produces values in [1,6]', () => {
  const state = createInitialState(2, mockBoard);
  for (let i = 0; i < 20; i++) {
    const result = startRoll(state);
    expect(result.diceValue).toBeGreaterThanOrEqual(1);
    expect(result.diceValue).toBeLessThanOrEqual(6);
  }
});

test('movePawn works from rolling phase', () => {
  const state = createInitialState(2, mockBoard);
  const rolled = startRoll(state, 3);
  expect(rolled.state.phase).toBe('rolling');
  const moved = movePawn(rolled.state);
  expect(moved.state.players[0].position).toBe(4); // 1 + 3
  expect(moved.state.phase).toBe('snake-ladder');
});
