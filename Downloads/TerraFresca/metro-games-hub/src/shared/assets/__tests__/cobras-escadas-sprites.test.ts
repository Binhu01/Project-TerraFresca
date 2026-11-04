import { SpriteGenerator } from '../SpriteGenerator';
import { CHESS_PALETTE } from '../palettes';

const PALETTE = CHESS_PALETTE;

beforeEach(() => {
  SpriteGenerator.clearCache();
});

describe('board-cell template', () => {
  test('generates valid SVG data URI', () => {
    const spec = SpriteGenerator.generate('board-cell', { seed: 1, palette: PALETTE });
    expect(spec.uri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.width).toBe(48);
    expect(spec.height).toBe(48);
  });

  test('same seed produces identical output', () => {
    const a = SpriteGenerator.generate('board-cell', { seed: 42, palette: PALETTE });
    const b = SpriteGenerator.generate('board-cell', { seed: 42, palette: PALETTE });
    expect(a.uri).toBe(b.uri);
  });

  test('different seed produces different output', () => {
    const a = SpriteGenerator.generate('board-cell', { seed: 1, palette: PALETTE });
    const b = SpriteGenerator.generate('board-cell', { seed: 2, palette: PALETTE });
    expect(a.uri).not.toBe(b.uri);
  });
});

describe('pawn template', () => {
  test('generates valid SVG data URI with correct dimensions', () => {
    const spec = SpriteGenerator.generate('pawn', { seed: 1, palette: PALETTE });
    expect(spec.uri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.width).toBe(32);
    expect(spec.height).toBe(32);
  });

  test('same seed produces identical output', () => {
    const a = SpriteGenerator.generate('pawn', { seed: 7, palette: PALETTE });
    const b = SpriteGenerator.generate('pawn', { seed: 7, palette: PALETTE });
    expect(a.uri).toBe(b.uri);
  });

  test('different seed produces different output', () => {
    const a = SpriteGenerator.generate('pawn', { seed: 1, palette: PALETTE });
    const b = SpriteGenerator.generate('pawn', { seed: 2, palette: PALETTE });
    expect(a.uri).not.toBe(b.uri);
  });
});

describe('dice-face template', () => {
  test('generates valid SVG data URI with 96x96 dimensions', () => {
    const spec = SpriteGenerator.generate('dice-face', { seed: 1, palette: PALETTE });
    expect(spec.uri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.width).toBe(96);
    expect(spec.height).toBe(96);
  });

  test('same seed produces identical output', () => {
    const a = SpriteGenerator.generate('dice-face', { seed: 13, palette: PALETTE });
    const b = SpriteGenerator.generate('dice-face', { seed: 13, palette: PALETTE });
    expect(a.uri).toBe(b.uri);
  });

  test('different seed produces different output', () => {
    const a = SpriteGenerator.generate('dice-face', { seed: 1, palette: PALETTE });
    const b = SpriteGenerator.generate('dice-face', { seed: 2, palette: PALETTE });
    expect(a.uri).not.toBe(b.uri);
  });
});

describe('snake template', () => {
  test('generates valid SVG data URI with 48x240 dimensions', () => {
    const spec = SpriteGenerator.generate('snake', { seed: 1, palette: PALETTE });
    expect(spec.uri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.width).toBe(48);
    expect(spec.height).toBe(240);
  });

  test('same seed produces identical output', () => {
    const a = SpriteGenerator.generate('snake', { seed: 55, palette: PALETTE });
    const b = SpriteGenerator.generate('snake', { seed: 55, palette: PALETTE });
    expect(a.uri).toBe(b.uri);
  });

  test('different seed produces different output', () => {
    const a = SpriteGenerator.generate('snake', { seed: 1, palette: PALETTE });
    const b = SpriteGenerator.generate('snake', { seed: 2, palette: PALETTE });
    expect(a.uri).not.toBe(b.uri);
  });
});

describe('ladder template', () => {
  test('generates valid SVG data URI with 48x240 dimensions', () => {
    const spec = SpriteGenerator.generate('ladder', { seed: 1, palette: PALETTE });
    expect(spec.uri).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(spec.width).toBe(48);
    expect(spec.height).toBe(240);
  });

  test('same seed produces identical output', () => {
    const a = SpriteGenerator.generate('ladder', { seed: 77, palette: PALETTE });
    const b = SpriteGenerator.generate('ladder', { seed: 77, palette: PALETTE });
    expect(a.uri).toBe(b.uri);
  });

  test('different seed produces different output', () => {
    const a = SpriteGenerator.generate('ladder', { seed: 1, palette: PALETTE });
    const b = SpriteGenerator.generate('ladder', { seed: 2, palette: PALETTE });
    expect(a.uri).not.toBe(b.uri);
  });
});
