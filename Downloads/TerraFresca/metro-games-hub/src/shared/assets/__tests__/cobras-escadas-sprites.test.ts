import { SpriteGenerator } from '../SpriteGenerator';
import { CHESS_PALETTE } from '../palettes';

const PALETTE = CHESS_PALETTE;

/** Decode a base64 data URI back to an SVG string for inspection. */
function decodeSvg(uri: string): string {
  const base64 = uri.replace('data:image/svg+xml;base64,', '');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/** Count <circle> elements in an SVG string (used to verify pip counts). */
function countCircles(svg: string): number {
  return (svg.match(/<circle /g) ?? []).length;
}

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

describe('dice-face overrides', () => {
  test('override produces exact requested face value', () => {
    // Face N has exactly N pip <circle> elements.
    // The highlight is an <ellipse>, not a <circle>, so countCircles counts only pips.
    const expectedPipCounts: Record<number, number> = {
      1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
    };

    for (let face = 1; face <= 6; face++) {
      const result = SpriteGenerator.generate('dice-face', {
        seed: 42,
        palette: PALETTE,
        overrides: { face: face as 1 | 2 | 3 | 4 | 5 | 6 },
      });
      expect(result.uri).toBeTruthy();
      const svg = decodeSvg(result.uri);
      const totalCircles = countCircles(svg);
      expect(totalCircles).toBe(expectedPipCounts[face]);
    }
  });

  test('same override with same seed produces identical output', () => {
    const a = SpriteGenerator.generate('dice-face', {
      seed: 42,
      palette: PALETTE,
      overrides: { face: 3 },
    });
    const b = SpriteGenerator.generate('dice-face', {
      seed: 42,
      palette: PALETTE,
      overrides: { face: 3 },
    });
    expect(a.uri).toBe(b.uri);
  });

  test('different face overrides produce different output', () => {
    const face1 = SpriteGenerator.generate('dice-face', {
      seed: 42,
      palette: PALETTE,
      overrides: { face: 1 },
    });
    const face6 = SpriteGenerator.generate('dice-face', {
      seed: 42,
      palette: PALETTE,
      overrides: { face: 6 },
    });
    expect(face1.uri).not.toBe(face6.uri);
  });

  test('backward compatibility: no override matches original behavior', () => {
    const withoutOverride = SpriteGenerator.generate('dice-face', {
      seed: 13,
      palette: PALETTE,
    });
    // Re-clear cache and generate again to verify determinism
    SpriteGenerator.clearCache();
    const fresh = SpriteGenerator.generate('dice-face', {
      seed: 13,
      palette: PALETTE,
    });
    expect(withoutOverride.uri).toBe(fresh.uri);
  });
});

describe('pawn overrides', () => {
  test('override produces exact requested color', () => {
    const colors = ['red', 'blue', 'green', 'yellow'] as const;
    for (const color of colors) {
      const result = SpriteGenerator.generate('pawn', {
        seed: 42,
        palette: PALETTE,
        overrides: { color },
      });
      expect(result.uri).toBeTruthy();
      const svg = decodeSvg(result.uri);
      expect(svg).toContain('<svg');
    }
  });

  test('same color override with same seed produces identical output', () => {
    const a = SpriteGenerator.generate('pawn', {
      seed: 42,
      palette: PALETTE,
      overrides: { color: 'blue' },
    });
    const b = SpriteGenerator.generate('pawn', {
      seed: 42,
      palette: PALETTE,
      overrides: { color: 'blue' },
    });
    expect(a.uri).toBe(b.uri);
  });

  test('different color overrides produce different output', () => {
    const red = SpriteGenerator.generate('pawn', {
      seed: 42,
      palette: PALETTE,
      overrides: { color: 'red' },
    });
    const blue = SpriteGenerator.generate('pawn', {
      seed: 42,
      palette: PALETTE,
      overrides: { color: 'blue' },
    });
    expect(red.uri).not.toBe(blue.uri);
  });

  test('backward compatibility: no override matches original behavior', () => {
    const withoutOverride = SpriteGenerator.generate('pawn', {
      seed: 7,
      palette: PALETTE,
    });
    SpriteGenerator.clearCache();
    const fresh = SpriteGenerator.generate('pawn', {
      seed: 7,
      palette: PALETTE,
    });
    expect(withoutOverride.uri).toBe(fresh.uri);
  });
});

describe('board-cell overrides', () => {
  test('cellNumber override uses cellNumber for variation', () => {
    const cell1 = SpriteGenerator.generate('board-cell', {
      seed: 42,
      palette: PALETTE,
      overrides: { cellNumber: 1 },
    });
    const cell50 = SpriteGenerator.generate('board-cell', {
      seed: 42,
      palette: PALETTE,
      overrides: { cellNumber: 50 },
    });
    // Same seed but different cellNumber should produce different SVGs
    // cellNumber 1 % 4 = 1, cellNumber 50 % 4 = 2 → different baseIdx
    expect(cell1.uri).not.toBe(cell50.uri);
  });

  test('same cellNumber override with same seed produces identical output', () => {
    const a = SpriteGenerator.generate('board-cell', {
      seed: 42,
      palette: PALETTE,
      overrides: { cellNumber: 25 },
    });
    const b = SpriteGenerator.generate('board-cell', {
      seed: 42,
      palette: PALETTE,
      overrides: { cellNumber: 25 },
    });
    expect(a.uri).toBe(b.uri);
  });

  test('backward compatibility: no override matches original behavior', () => {
    const withoutOverride = SpriteGenerator.generate('board-cell', {
      seed: 42,
      palette: PALETTE,
    });
    SpriteGenerator.clearCache();
    const fresh = SpriteGenerator.generate('board-cell', {
      seed: 42,
      palette: PALETTE,
    });
    expect(withoutOverride.uri).toBe(fresh.uri);
  });
});
