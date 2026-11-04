/**
 * Procedural sprite generator with deterministic SVG-to-SpriteSpec output.
 * Templates are keyed by name and produce SVG strings parameterized by seed and palette.
 * Output is cached by template+seed+palette key.
 */

import type { SpriteSpec } from '../rendering/PixelRenderer';
import { generateBoardCell } from './templates/board-cell.svg';
import { generateDiceFace } from './templates/dice-face.svg';
import { generateLadder } from './templates/ladder.svg';
import { generatePawn } from './templates/pawn.svg';
import { generateSnake } from './templates/snake.svg';
import { generateStationBg } from './templates/station-bg.svg';
import { generateTrainBase } from './templates/train-base.svg';

/** Parameters for sprite generation. */
export interface GenerateParams<TOverrides = Record<string, unknown>> {
  seed: number;
  palette: string[];
  overrides?: TOverrides;
}

/** Template function signature with optional overrides. */
export type TemplateFn<TOverrides = Record<string, unknown>> = (
  seed: number,
  palette: string[],
  overrides?: TOverrides
) => string;

/** Template dimensions: [width, height]. */
type TemplateDims = [number, number];

interface TemplateEntry {
  fn: TemplateFn<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  dims: TemplateDims;
}

const TEMPLATES: Record<string, TemplateEntry> = {
  'board-cell': { fn: generateBoardCell, dims: [48, 48] },
  'dice-face': { fn: generateDiceFace, dims: [96, 96] },
  'ladder': { fn: generateLadder, dims: [48, 240] },
  'pawn': { fn: generatePawn, dims: [32, 32] },
  'snake': { fn: generateSnake, dims: [48, 240] },
  'station-bg': { fn: generateStationBg, dims: [480, 270] },
  'train-base': { fn: generateTrainBase, dims: [64, 48] },
};

/** Cache key builder. */
function cacheKey(template: string, seed: number, palette: string[], overrides?: Record<string, unknown>): string {
  const palId = palette.join(',');
  const overrideId = overrides ? JSON.stringify(overrides) : '';
  return `${template}:${seed}:${palId}:${overrideId}`;
}

const cache = new Map<string, SpriteSpec>();

export const SpriteGenerator = {
  /**
   * Generate a sprite from a named template.
   * Returns a cached SpriteSpec if previously generated with the same parameters.
   */
  generate(template: string, params: GenerateParams): SpriteSpec {
    const entry = TEMPLATES[template];
    if (!entry) {
      throw new Error(`Unknown sprite template: "${template}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
    }

    const key = cacheKey(template, params.seed, params.palette, params.overrides);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const svgString = entry.fn(params.seed, params.palette, params.overrides);
    const encoded = typeof btoa === 'function'
      ? btoa(svgString)
      : Buffer.from(svgString, 'utf-8').toString('base64');
    const uri = `data:image/svg+xml;base64,${encoded}`;

    const spec: SpriteSpec = {
      uri,
      width: entry.dims[0],
      height: entry.dims[1],
    };

    cache.set(key, spec);
    return spec;
  },

  /** Clear the sprite cache (useful for testing). */
  clearCache(): void {
    cache.clear();
  },
};
