import type { GameModule } from './GameModule';

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
