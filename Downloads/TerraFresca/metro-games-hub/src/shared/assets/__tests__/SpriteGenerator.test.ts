import { SpriteGenerator } from '../SpriteGenerator';
import { STATION_PALETTE } from '../palettes';

test('same seed produces identical output', () => {
  const a = SpriteGenerator.generate('station-bg', { seed: 42, palette: STATION_PALETTE });
  const b = SpriteGenerator.generate('station-bg', { seed: 42, palette: STATION_PALETTE });
  expect(a.uri).toBe(b.uri);
});

test('different seed produces different output', () => {
  const a = SpriteGenerator.generate('station-bg', { seed: 42, palette: STATION_PALETTE });
  const b = SpriteGenerator.generate('station-bg', { seed: 99, palette: STATION_PALETTE });
  expect(a.uri).not.toBe(b.uri);
});

test('output conforms to SpriteSpec shape', () => {
  const spec = SpriteGenerator.generate('train-base', { seed: 1, palette: STATION_PALETTE });
  expect(spec).toHaveProperty('uri');
  expect(spec).toHaveProperty('width');
  expect(spec).toHaveProperty('height');
  expect(typeof spec.width).toBe('number');
});
