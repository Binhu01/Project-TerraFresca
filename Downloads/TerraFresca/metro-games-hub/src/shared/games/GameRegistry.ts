import type { GameModule } from './GameModule';

/**
 * Module-level singleton Map — intentional pattern.
 * The registry lives for the entire app lifetime and is shared across all imports.
 * Use clear() only in tests to reset state between cases.
 */
const registry = new Map<string, GameModule>();

export const GameRegistry = {
  register(module: GameModule): void {
    if (registry.has(module.metadata.id)) {
      throw new Error(`Game "${module.metadata.id}" is already registered`);
    }
    registry.set(module.metadata.id, module);
  },

  get(id: string): GameModule | undefined {
    return registry.get(id);
  },

  getAll(): GameModule[] {
    return [...registry.values()];
  },

  has(id: string): boolean {
    return registry.has(id);
  },

  clear(): void {
    registry.clear();
  },
};
