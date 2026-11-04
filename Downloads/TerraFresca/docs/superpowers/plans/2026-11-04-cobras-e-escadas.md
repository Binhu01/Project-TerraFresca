# Cobras e Escadas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o jogo Cobras e Escadas como primeiro GameModule completo, validando end-to-end a integração com PixelRenderer, SpriteGenerator, AudioManager e navegação do Metro Games Hub.

**Architecture:** Jogo turn-based 2-4 jogadores locais em tabuleiro 10x10 serpenteante. Estado gerenciado via React hooks (useState/useReducer). Renderização via PixelRenderer abstraction. Sprites gerados proceduralmente via SpriteGenerator. Áudio via AudioManager singleton. Integrado ao hub via GameRegistry.register().

**Tech Stack:** React Native, Expo SDK 58, TypeScript, @shopify/react-native-skia, expo-av, jest, @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-11-04-cobras-e-escadas-design.md`

## Global Constraints

- Tabuleiro 10x10 com layout serpenteante (alternando direção por linha)
- 8 cobras + 8 escadas, posicionadas proceduralmente via seed determinístico
- Vitória apenas ao alcançar exatamente casa 100; ultrapassar = não move
- 2-4 jogadores locais, turnos alternados, sem IA
- Animações via requestAnimationFrame com interpolação linear
- Todos os sprites via SpriteGenerator (sem assets estáticos)
- Todos os áudios via AudioManager (sem imports diretos de expo-av no game code)
- Cleanup obrigatório em GameModule.cleanup() (timers, listeners, áudio)
- Tests run offline, no device required for unit tests
- TypeScript strict mode — zero errors on `npx tsc --noEmit`
- All new files must end with trailing newline
- Landscape orientation enforced (RotationPrompt already integrated)

## Review Focus

1. **Board coordinate mapping correctness** — serpentine layout must map cell numbers 1-100 to correct (row, col) grid positions. Test: unit test verifies all 100 cells map correctly, including edge cases (cell 1, 10, 11, 20, 99, 100).
2. **Snake/ladder generation determinism** — same seed must always produce same snake/ladder configuration. Test: generate twice with same seed, assert identical output.
3. **Win condition exactness** — player must land exactly on 100; overshoot means no move. Test: player at 97 rolls 4 → stays at 97; player at 97 rolls 3 → wins.
4. **Animation cleanup on unmount** — if player exits mid-animation, no orphaned requestAnimationFrame or setState calls. Test: mount → start animation → unmount → assert zero active timers and no console warnings.
5. **Audio lifecycle** — music starts on mount, stops on cleanup; SFX plays at correct moments without overlap. Test: mock AudioManager, verify playMusic called on mount, cleanup called on unmount, SFX calls match game events.

---

### Task 1: Board Logic + Coordinate Mapping

**Files:**
- Create: `src/games/cobras-escadas/board.ts`
- Create: `src/games/cobras-escadas/__tests__/board.test.ts`

**Interfaces:**
- Produces: `getCellPosition(cell: number): { row: number; col: number }`, `generateBoard(seed: number): BoardConfig`

- [ ] **Step 1: Write failing test for coordinate mapping**

In `board.test.ts`:
```typescript
import { getCellPosition } from '../board';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/cobras-escadas/__tests__/board.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement coordinate mapping**

In `board.ts`: implement `getCellPosition(cell)` using serpentine formula. Row = `9 - Math.floor((cell - 1) / 10)`. Col depends on row parity: even rows (from bottom) go left→right, odd rows go right→left.

- [ ] **Step 4: Write failing test for board generation**

Add to `board.test.ts`:
```typescript
import { generateBoard } from '../board';

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
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx jest src/games/cobras-escadas/__tests__/board.test.ts`
Expected: FAIL — generateBoard not implemented

- [ ] **Step 6: Implement board generation**

In `board.ts`: use mulberry32 PRNG (same as SpriteGenerator) seeded by input. Generate 8 snakes and 8 ladders respecting all constraints. Use rejection sampling: generate candidate pair, validate constraints, retry if invalid.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/games/cobras-escadas/__tests__/board.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/games/cobras-escadas/
git commit -m "feat(cobras-escadas): add board logic with serpentine mapping and procedural generation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Game State Machine + Turn Logic

**Files:**
- Create: `src/games/cobras-escadas/gameState.ts`
- Create: `src/games/cobras-escadas/__tests__/gameState.test.ts`

**Interfaces:**
- Consumes: `BoardConfig` from Task 1
- Produces: `GameState`, `createInitialState(players, boardConfig)`, `rollDice(state)`, `movePawn(state, steps)`, `applySnakeOrLadder(state)`, `checkWin(state)`

- [ ] **Step 1: Write failing tests for state machine**

In `gameState.test.ts`: test createInitialState, rollDice (returns 1-6), movePawn (normal move, overshoot stays), applySnakeOrLadder (snake down, ladder up, no-op if neither), checkWin (exact 100 wins, 99+2 doesn't win).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/cobras-escadas/__tests__/gameState.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement state machine**

In `gameState.ts`: pure functions operating on GameState. No side effects. rollDice uses Math.random (or seeded PRNG for deterministic testing). Each function returns new state (immutable updates).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/cobras-escadas/__tests__/gameState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/games/cobras-escadas/
git commit -m "feat(cobras-escadas): add game state machine with turn logic and win condition

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Sprite Templates for Cobras e Escadas

**Files:**
- Create: `src/shared/assets/templates/board-cell.svg.ts`
- Create: `src/shared/assets/templates/pawn.svg.ts`
- Create: `src/shared/assets/templates/dice-face.svg.ts`
- Create: `src/shared/assets/templates/snake.svg.ts`
- Create: `src/shared/assets/templates/ladder.svg.ts`
- Modify: `src/shared/assets/SpriteGenerator.ts` (register new templates)
- Create: `src/shared/assets/__tests__/cobras-escadas-sprites.test.ts`

**Interfaces:**
- Consumes: SpriteGenerator template registration pattern from foundation Task 5
- Produces: 5 new sprite templates registered in SpriteGenerator

- [ ] **Step 1: Write failing test for new templates**

In `cobras-escadas-sprites.test.ts`: test that SpriteGenerator.generate succeeds for 'board-cell', 'pawn', 'dice-face', 'snake', 'ladder' with appropriate params. Verify output is valid SVG data URI. Verify determinism (same seed+palette = same output).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/shared/assets/__tests__/cobras-escadas-sprites.test.ts`
Expected: FAIL — unknown template

- [ ] **Step 3: Implement sprite templates**

Create each template file following the pattern from station-bg.svg.ts and train-base.svg.ts. Register in SpriteGenerator TEMPLATES map with appropriate dimensions:
- board-cell: 48x48
- pawn: 32x32
- dice-face: 96x96 (BG3-style dice requires larger sprites for detail)
- snake: 48x240 (vertical, spans multiple cells)
- ladder: 48x240 (vertical, spans multiple cells)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/shared/assets/__tests__/cobras-escadas-sprites.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/assets/
git commit -m "feat(cobras-escadas): add sprite templates for board, pawns, dice, snakes, ladders

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Game Component + Rendering

**Files:**
- Create: `src/games/cobras-escadas/CobrasEscadasGame.tsx`
- Create: `src/games/cobras-escadas/__tests__/CobrasEscadasGame.test.tsx`

**Interfaces:**
- Consumes: gameState from Task 2, SpriteGenerator from Task 3, PixelRenderer from foundation Task 3, AudioManager from foundation Task 4
- Produces: React component rendering board, pawns, dice, animations

- [ ] **Step 1: Write failing test for game component rendering**

In `CobrasEscadasGame.test.tsx`: test that component renders with 2 players, shows board, shows dice button, shows player indicators. Mock PixelRenderer, SpriteGenerator, AudioManager.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/games/cobras-escadas/__tests__/CobrasEscadasGame.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement game component**

In `CobrasEscadasGame.tsx`: 
- Use useState for GameState, useEffect for audio init/cleanup
- Render board grid using PixelRenderer or direct Skia Canvas
- Position pawns using getCellPosition from Task 1
- Animate pawn movement with requestAnimationFrame + interpolation
- Dice button triggers rollDice → movePawn → applySnakeOrLadder → checkWin sequence
- Call AudioManager.playMusic() on mount, AudioManager.cleanup() on unmount
- Play SFX at appropriate moments (dice-roll, pawn-move, snake-slide, ladder-climb, victory)
- Show victory overlay when checkWin returns true

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/games/cobras-escadas/__tests__/CobrasEscadasGame.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/games/cobras-escadas/
git commit -m "feat(cobras-escadas): add game component with board rendering and animations

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4b: DiceRoller Component (BG3-Style Animation)

**Files:**
- Create: `src/games/cobras-escadas/DiceRoller.tsx`
- Create: `src/games/cobras-escadas/__tests__/DiceRoller.test.tsx`
- Modify: `src/games/cobras-escadas/gameState.ts` (restore `'rolling'` phase to GameState union)

**Interfaces:**
- Consumes: SpriteGenerator (`dice-face` template from Task 3), AudioManager SFX
- Produces: `DiceRoller` component with BG3-style animation

**Spec reference:** See "DiceRoller — Animação Estilo Baldur's Gate 3" section in `docs/superpowers/specs/2026-11-04-cobras-e-escadas-design.md`

- [ ] **Step 1: Restore 'rolling' phase in gameState.ts**

Add `'rolling'` back to the `GameState.phase` union type:
```typescript
phase: 'waiting-roll' | 'rolling' | 'moving' | 'snake-ladder' | 'game-over';
```
Update `rollDice` to set phase to `'rolling'` instead of `'moving'`. Add new function `confirmRoll(state: GameState): GameState` that transitions from `'rolling'` → `'moving'` (called when animation completes). Update tests accordingly.

- [ ] **Step 2: Write failing test for DiceRoller component**

In `DiceRoller.test.tsx`: test that component renders dice face, accepts `onRollComplete` prop, triggers animation on press, calls callback with correct value after animation. Mock SpriteGenerator and AudioManager.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/games/cobras-escadas/__tests__/DiceRoller.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement DiceRoller component**

In `DiceRoller.tsx`:
- Props: `value: number | null`, `isRolling: boolean`, `playerColor: string`, `onRoll: () => void`, `onRollComplete: (value: number) => void`
- Idle state: show last face (or face 1), subtle breathing pulse (scale 1.0→1.02→1.0, 2s loop)
- Rolling state: 0.8s face tumbling (face changes every ~80ms with ease-out deceleration) + 0.3s landing bounce (scale 1.0→1.15→1.0)
- Use `requestAnimationFrame` for animation (no RN Animated API)
- Play SFX `dice-roll` on roll start, `dice-land` on landing
- Glow effect around dice in current player's color
- Accessibility: dynamic `accessibilityLabel` + `accessibilityHint`
- Dimensions: 96x96px

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/games/cobras-escadas/__tests__/DiceRoller.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full verification**

Run: `npx jest --passWithNoTests && npx tsc --noEmit`
Expected: All tests pass, zero TS errors

- [ ] **Step 7: Commit**

```bash
git add src/games/cobras-escadas/
git commit -m "feat(cobras-escadas): add BG3-style DiceRoller component with rolling animation

Restores 'rolling' phase to GameState for animation integration.
DiceRoller features: face tumbling with ease-out deceleration,
landing bounce, player-colored glow, breathing idle pulse,
SFX integration, and accessibility labels.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: GameModule Registration + Hub Integration

**Files:**
- Create: `src/games/cobras-escadas/index.ts`
- Modify: `src/app.tsx` (register CobrasEscadasModule)

**Interfaces:**
- Consumes: GameModule interface from foundation Task 6, CobrasEscadasGame from Task 4
- Produces: CobrasEscadasModule registered in GameRegistry, visible in MetroHub

- [ ] **Step 1: Create GameModule export**

In `index.ts`:
```typescript
import type { GameModule } from '../../shared/games/GameModule';
import { CobrasEscadasGame } from './CobrasEscadasGame';

export const CobrasEscadasModule: GameModule = {
  metadata: {
    id: 'cobras-escadas',
    name: 'Cobras e Escadas',
    iconSeed: 20,
    minPlayers: 2,
    maxPlayers: 4,
    type: 'turn-based',
  },
  Component: CobrasEscadasGame,
  cleanup: () => {
    // Cleanup handled by component unmount
  },
};
```

- [ ] **Step 2: Register in app.tsx**

Add import and `GameRegistry.register(CobrasEscadasModule)` alongside existing ChessGame registration at module scope.

- [ ] **Step 3: Verify hub integration manually**

Run: `npx expo start`
Expected: MetroHub shows "Cobras e Escadas" card with procedurally generated icon; tapping navigates to game screen; back button returns to hub.

- [ ] **Step 4: Commit**

```bash
git add src/games/cobras-escadas/ src/app.tsx
git commit -m "feat(cobras-escadas): register GameModule and integrate with MetroHub

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Plans Remaining (Not In This Document)

This plan validates the GameModule integration end-to-end with the simplest board game. The following plans are separate:

- **Plan 3: Damas Brasileiras** — captures mandatory capture chain logic
- **Plan 4: Ludo Clássico** — multi-player (2-4), dice animation, safe houses
- **Plan 5: Xadrez** — most complex board game, chess.js integration
- **Plan 6: Corrida Pixel** — real-time rendering, responsive layout (split-screen ≥7", overlay controls <7")
- **Plan 7: Polish + Store Submission** — asset generation for all games, audio production, EAS build config, store listings