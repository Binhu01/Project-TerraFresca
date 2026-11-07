/**
 * Procedural sprite generator with deterministic SVG-to-SpriteSpec output.
 * Templates are keyed by name and produce SVG strings parameterized by seed and palette.
 * Output is cached by template+seed+palette key.
 */

import type { SpriteSpec } from '../rendering/PixelRenderer';
import { generateBoardCell } from './templates/board-cell.svg.ts';
import { generateCheckerPiece } from './templates/checker-piece.svg.ts';
import { generateChessBishop } from './templates/chess-bishop.svg.ts';
import { generateChessKing } from './templates/chess-king.svg.ts';
import { generateChessKnight } from './templates/chess-knight.svg.ts';
import { generateChessPawn } from './templates/chess-pawn.svg.ts';
import { generateChessQueen } from './templates/chess-queen.svg.ts';
import { generateChessRook } from './templates/chess-rook.svg.ts';
import { generateDiceFace } from './templates/dice-face.svg.ts';
import { generateLadder } from './templates/ladder.svg.ts';
import { generatePawn } from './templates/pawn.svg.ts';
import { generateRaceCar } from './templates/race-car.svg.ts';
import { generateRaceTileAsphalt } from './templates/race-tile-asphalt.svg.ts';
import { generateRaceTileBarrier } from './templates/race-tile-barrier.svg.ts';
import { generateRaceTileGrass } from './templates/race-tile-grass.svg.ts';
import { generateSnake } from './templates/snake.svg.ts';
import { generateStationBg } from './templates/station-bg.svg.ts';
import { generateTrainBase } from './templates/train-base.svg.ts';

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
  'checker-piece': { fn: generateCheckerPiece, dims: [32, 32] },
  'chess-bishop': { fn: generateChessBishop, dims: [32, 32] },
  'chess-king': { fn: generateChessKing, dims: [32, 32] },
  'chess-knight': { fn: generateChessKnight, dims: [32, 32] },
  'chess-pawn': { fn: generateChessPawn, dims: [32, 32] },
  'chess-queen': { fn: generateChessQueen, dims: [32, 32] },
  'chess-rook': { fn: generateChessRook, dims: [32, 32] },
  'dice-face': { fn: generateDiceFace, dims: [96, 96] },
  'ladder': { fn: generateLadder, dims: [48, 240] },
  'pawn': { fn: generatePawn, dims: [32, 32] },
  'race-car': { fn: generateRaceCar, dims: [32, 32] },
  'race-tile-asphalt': { fn: generateRaceTileAsphalt, dims: [32, 32] },
  'race-tile-barrier': { fn: generateRaceTileBarrier, dims: [32, 32] },
  'race-tile-grass': { fn: generateRaceTileGrass, dims: [32, 32] },
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
