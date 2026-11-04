import { getCellPosition, generateBoard } from '../board';

test('cell 1 maps to bottom-left (row 9, col 0)', () => {
  expect(getCellPosition(1)).toEqual({ row: 9, col: 0 });
});

test('cell 10 maps to bottom-right (row 9, col 9)', () => {
  expect(getCellPosition(10)).toEqual({ row: 9, col: 9 });
});

test('cell 11 maps to second row right-to-left (row 8, col 9)', () => {
  expect(getCellPosition(11)).toEqual({ row: 8, col: 9 });
});

test('cell 20 maps to second row left (row 8, col 0)', () => {
  expect(getCellPosition(20)).toEqual({ row: 8, col: 0 });
});

test('cell 100 maps to top-left (row 0, col 0)', () => {
  expect(getCellPosition(100)).toEqual({ row: 0, col: 0 });
});

test('cell 99 maps to top row second column (row 0, col 1)', () => {
  expect(getCellPosition(99)).toEqual({ row: 0, col: 1 });
});

test('generates 8 snakes and 8 ladders', () => {
  const config = generateBoard(42);
  expect(Object.keys(config.snakes)).toHaveLength(8);
  expect(Object.keys(config.ladders)).toHaveLength(8);
});

test('deterministic: same seed produces same config', () => {
  const a = generateBoard(42);
  const b = generateBoard(42);
  expect(a).toEqual(b);
});

test('different seeds produce different configs', () => {
  const a = generateBoard(42);
  const b = generateBoard(99);
  expect(a).not.toEqual(b);
});

test('no snake head at 100, no snake tail at 1', () => {
  const config = generateBoard(42);
  expect(config.snakes[100]).toBeUndefined();
  expect(Object.values(config.snakes)).not.toContain(1);
});

test('no ladder base at 100, no ladder top at 1', () => {
  const config = generateBoard(42);
  expect(config.ladders[100]).toBeUndefined();
  expect(Object.values(config.ladders)).not.toContain(1);
});

test('minimum 5-cell distance between connected cells', () => {
  const config = generateBoard(42);
  for (const [head, tail] of Object.entries(config.snakes)) {
    expect(Math.abs(Number(head) - tail)).toBeGreaterThanOrEqual(5);
  }
  for (const [base, top] of Object.entries(config.ladders)) {
    expect(Math.abs(top - Number(base))).toBeGreaterThanOrEqual(5);
  }
});
