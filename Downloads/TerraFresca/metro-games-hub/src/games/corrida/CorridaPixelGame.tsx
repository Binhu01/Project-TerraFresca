/**
 * Corrida Pixel — real-time racing game with react-native-skia Canvas rendering.
 *
 * Architecture:
 * - Race state and input state live in useRef (mutable, no re-renders per frame)
 * - requestAnimationFrame loop calls updateRace() and draws to Skia Canvas each frame
 * - HUD overlays use React Native Views on top of Canvas
 * - Touch zones map to InputState per player
 * - Responsive: split-screen (width >= 700) or overlay mode
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import {
  Canvas,
  Rect,
  Group,
  useCanvasRef,
} from '@shopify/react-native-skia';
import type { RaceState, InputState, LayoutMode, PlayerIndex, TileType } from './types';
import { createInitialRaceState, updateRace } from './raceEngine';
import { TILE_SIZE, TRACK_WIDTH, TRACK_HEIGHT } from './track';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import type { SpriteSpec } from '../../shared/rendering/PixelRenderer';

// -- Palette for race sprites (warm racing palette: reds, oranges, teals) --
const RACE_PALETTE = [
  '#1a1a2e', // dark bg
  '#e94560', // p1 red
  '#0f3460', // p2 blue
  '#16213e', // asphalt dark
  '#2d4059', // asphalt light
  '#4caf50', // grass
  '#8bc34a', // grass light
  '#795548', // barrier
  '#ffffff', // finish white
  '#ffeb3b', // finish yellow
];

// -- Pre-generate sprite assets --
function generateRaceSprites(): Record<string, SpriteSpec> {
  return {
    asphalt: SpriteGenerator.generate('race-tile-asphalt', { seed: 99, palette: RACE_PALETTE }),
    grass: SpriteGenerator.generate('race-tile-grass', { seed: 99, palette: RACE_PALETTE }),
    barrier: SpriteGenerator.generate('race-tile-barrier', { seed: 99, palette: RACE_PALETTE }),
    carP1: SpriteGenerator.generate('race-car', { seed: 99, palette: RACE_PALETTE, overrides: { player: 0 } }),
    carP2: SpriteGenerator.generate('race-car', { seed: 99, palette: RACE_PALETTE, overrides: { player: 1 } }),
  };
}

const SPRITES = generateRaceSprites();

// -- Tile color fallback for rect drawing when image loading is slow --
const TILE_COLORS: Record<TileType, string> = {
  asphalt: '#2d4059',
  grass: '#4caf50',
  barrier: '#795548',
  finish: '#ffeb3b',
};

// -- Props --
interface CorridaPixelGameProps {
  players: number;
  onExit: () => void;
}

// -- Touch zone helpers --
interface TouchZone {
  playerId: PlayerIndex;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Pure function that derives input state from active touches.
 * Lives outside the component to avoid stale-closure risk in useCallback handlers.
 */
function updateInputFromTouches(
  touches: Map<number, TouchZone>,
  inputRef: React.MutableRefObject<[InputState, InputState]>,
): void {
  const newInputs: [InputState, InputState] = [
    { accelerate: false, brake: false, steerX: 0 },
    { accelerate: false, brake: false, steerX: 0 },
  ];

  touches.forEach((touch) => {
    const input = newInputs[touch.playerId];
    const dx = touch.currentX - touch.startX;
    const dy = touch.currentY - touch.startY;

    // Vertical: up = accelerate, down = brake
    if (dy < -10) input.accelerate = true;
    if (dy > 10) input.brake = true;

    // Horizontal: steer (-1 to +1), clamped
    const maxSteerPx = 80;
    input.steerX = Math.max(-1, Math.min(1, dx / maxSteerPx));
  });

  inputRef.current = newInputs;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}

export function CorridaPixelGame({ players: _players, onExit }: CorridaPixelGameProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const layoutMode: LayoutMode = windowWidth >= 700 ? 'split-screen' : 'overlay';

  // Mutable game state — no re-renders per frame
  const raceStateRef = useRef<RaceState>(createInitialRaceState());
  const inputRef = useRef<[InputState, InputState]>([
    { accelerate: false, brake: false, steerX: 0 },
    { accelerate: false, brake: false, steerX: 0 },
  ]);

  // Display state for HUD overlays (throttled updates)
  const [displayState, setDisplayState] = useState<RaceState>(raceStateRef.current);

  // Canvas refs
  const canvasRef1 = useCanvasRef();
  const canvasRef2 = useCanvasRef();

  // Touch tracking
  const activeTouches = useRef<Map<number, TouchZone>>(new Map());

  // Last display update time for throttling
  const lastDisplayUpdate = useRef(0);
  const DISPLAY_UPDATE_INTERVAL = 33; // ~30fps for HUD

  // -- Reset race --
  const resetRace = useCallback(() => {
    raceStateRef.current = createInitialRaceState();
    inputRef.current = [
      { accelerate: false, brake: false, steerX: 0 },
      { accelerate: false, brake: false, steerX: 0 },
    ];
    setDisplayState(raceStateRef.current);
  }, []);

  // -- Game loop --
  useEffect(() => {
    let lastTime = Date.now();
    let animFrameId: number;

    const loop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;

      // Update race state
      raceStateRef.current = updateRace(raceStateRef.current, inputRef.current, deltaTime, now);

      // Throttle HUD updates
      if (now - lastDisplayUpdate.current > DISPLAY_UPDATE_INTERVAL) {
        lastDisplayUpdate.current = now;
        setDisplayState({ ...raceStateRef.current });
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [layoutMode, canvasRef1, canvasRef2]);

  // -- Touch handling --
  const handleTouchStart = useCallback(
    (event: GestureResponderEvent, zonePlayerHint: PlayerIndex | null) => {
      const { locationX, locationY, identifier } = event.nativeEvent;
      const pageX = event.nativeEvent.pageX ?? locationX;

      let playerId: PlayerIndex;
      if (zonePlayerHint !== null) {
        playerId = zonePlayerHint;
      } else if (layoutMode === 'split-screen') {
        playerId = pageX < windowWidth / 2 ? 0 : 1;
      } else {
        // Overlay: bottom-left = P1, bottom-right = P2
        playerId = pageX < windowWidth / 2 ? 0 : 1;
      }

      activeTouches.current.set(identifier, {
        playerId,
        startX: locationX,
        startY: locationY,
        currentX: locationX,
        currentY: locationY,
      });

      updateInputFromTouches(activeTouches.current, inputRef);
    },
    [layoutMode, windowWidth],
  );

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY, identifier } = event.nativeEvent;
    const touch = activeTouches.current.get(identifier);
    if (touch) {
      touch.currentX = locationX;
      touch.currentY = locationY;
      updateInputFromTouches(activeTouches.current, inputRef);
    }
  }, []);

  const handleTouchEnd = useCallback((event: GestureResponderEvent) => {
    const { identifier } = event.nativeEvent;
    activeTouches.current.delete(identifier);
    updateInputFromTouches(activeTouches.current, inputRef);
  }, []);

  // -- Render helpers for declarative Skia Canvas --
  function renderTrackTiles(focusPlayer: number, viewW: number, viewH: number): React.ReactNode[] {
    const state = displayState;
    const racer = state.racers[focusPlayer];
    const camX = racer.x - viewW / 2;
    const camY = racer.y - viewH / 2;

    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(TRACK_WIDTH - 1, Math.ceil((camX + viewW) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(TRACK_HEIGHT - 1, Math.ceil((camY + viewH) / TILE_SIZE));

    const tiles: React.ReactNode[] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = state.track[row]?.[col];
        if (!tile) continue;

        const px = col * TILE_SIZE - camX;
        const py = row * TILE_SIZE - camY;

        tiles.push(
          <Rect
            key={`${col}-${row}`}
            x={px}
            y={py}
            width={TILE_SIZE}
            height={TILE_SIZE}
            color={TILE_COLORS[tile]}
          />,
        );
      }
    }

    return tiles;
  }

  function renderCar(playerIdx: PlayerIndex, focusPlayer: number, viewW: number, viewH: number): React.ReactNode {
    const racer = displayState.racers[playerIdx];
    const camX = displayState.racers[focusPlayer].x - viewW / 2;
    const camY = displayState.racers[focusPlayer].y - viewH / 2;

    const screenX = racer.x - camX - TILE_SIZE / 2;
    const screenY = racer.y - camY - TILE_SIZE / 2;

    // Use colored rect as car placeholder (sprites need async image loading in skia)
    const carColor = playerIdx === 0 ? '#e94560' : '#0f3460';

    return (
      <Group origin={{ x: screenX + TILE_SIZE / 2, y: screenY + TILE_SIZE / 2 }} transform={[{ rotate: racer.angle + Math.PI / 2 }]}>
        <Rect
          x={screenX}
          y={screenY}
          width={TILE_SIZE}
          height={TILE_SIZE}
          color={carColor}
        />
        {/* Direction indicator */}
        <Rect
          x={screenX + TILE_SIZE / 2 - 3}
          y={screenY}
          width={6}
          height={8}
          color="#ffffff"
        />
      </Group>
    );
  }

  // -- Countdown overlay --
  function renderCountdown(): React.ReactNode {
    if (displayState.phase !== 'countdown') return null;
    const secondsLeft = Math.ceil(displayState.countdownTimer / 1000);
    const text = secondsLeft > 0 ? secondsLeft.toString() : 'GO!';

    return (
      <View style={styles.overlayCenter}>
        <Text style={styles.countdownText}>{text}</Text>
      </View>
    );
  }

  // -- Finish overlay --
  function renderFinish(): React.ReactNode {
    if (displayState.phase !== 'finished') return null;
    const winnerIdx = displayState.winner;
    const winnerName = winnerIdx === 0 ? 'Jogador 1' : 'Jogador 2';
    const winnerTime = displayState.racers[winnerIdx ?? 0].finishTime;
    const loserTime = displayState.racers[winnerIdx === 0 ? 1 : 0].finishTime;
    const winnerElapsed = (winnerTime ?? 0) - displayState.startTime;
    const loserElapsed = (loserTime ?? 0) - displayState.startTime;

    return (
      <View style={styles.finishOverlay}>
        <Text style={styles.finishTitle}>{winnerName} Venceu!</Text>
        {winnerTime !== null && (
          <Text style={styles.finishTime}>Tempo: {formatTime(winnerElapsed)}</Text>
        )}
        {loserTime !== null && (
          <Text style={styles.finishTimeSub}>
            2º lugar: {formatTime(loserElapsed)}
          </Text>
        )}
        <TouchableOpacity style={styles.restartButton} onPress={resetRace}>
          <Text style={styles.restartButtonText}>Jogar Novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -- HUD --
  function renderHUD(): React.ReactNode {
    if (displayState.phase === 'finished') return null;

    const p1Lap = Math.min(displayState.racers[0].lap + 1, displayState.totalLaps);
    const p2Lap = Math.min(displayState.racers[1].lap + 1, displayState.totalLaps);

    return (
      <View style={styles.hudContainer} pointerEvents="none">
        <View style={styles.hudPlayer}>
          <Text style={[styles.hudLabel, { color: '#e94560' }]}>P1</Text>
          <Text style={styles.hudValue}>Volta {p1Lap}/{displayState.totalLaps}</Text>
        </View>
        <View style={styles.hudTimer}>
          <Text style={styles.timerText}>{formatTime(displayState.elapsed)}</Text>
        </View>
        <View style={styles.hudPlayer}>
          <Text style={[styles.hudLabel, { color: '#0f3460' }]}>P2</Text>
          <Text style={styles.hudValue}>Volta {p2Lap}/{displayState.totalLaps}</Text>
        </View>
      </View>
    );
  }

  // -- Control hints for overlay mode --
  function renderControlHints(): React.ReactNode {
    if (layoutMode !== 'overlay' || displayState.phase !== 'racing') return null;

    return (
      <View style={styles.controlHints} pointerEvents="none">
        <Text style={styles.controlHintText}>P1 ←</Text>
        <Text style={styles.controlHintText}>→ P2</Text>
      </View>
    );
  }

  // -- Split-screen layout --
  if (layoutMode === 'split-screen') {
    const halfWidth = Math.floor(windowWidth / 2);
    const canvasHeight = windowHeight;

    return (
      <View
        style={styles.container}
        onTouchStart={(e) => handleTouchStart(e, null)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Player 1 viewport */}
        <View style={{ width: halfWidth, height: canvasHeight }}>
          <Canvas style={{ flex: 1 }} ref={canvasRef1}>
            {renderTrackTiles(0, halfWidth, canvasHeight)}
            {renderCar(0, 0, halfWidth, canvasHeight)}
            {renderCar(1, 0, halfWidth, canvasHeight)}
          </Canvas>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Player 2 viewport */}
        <View style={{ width: halfWidth, height: canvasHeight }}>
          <Canvas style={{ flex: 1 }} ref={canvasRef2}>
            {renderTrackTiles(1, halfWidth, canvasHeight)}
            {renderCar(0, 1, halfWidth, canvasHeight)}
            {renderCar(1, 1, halfWidth, canvasHeight)}
          </Canvas>
        </View>

        {/* Overlays */}
        {renderHUD()}
        {renderCountdown()}
        {renderFinish()}
      </View>
    );
  }

  // -- Overlay layout (single canvas, shared camera) --
  const overlayCamX =
    (displayState.racers[0].x + displayState.racers[1].x) / 2 - windowWidth / 2;
  const overlayCamY =
    (displayState.racers[0].y + displayState.racers[1].y) / 2 - windowHeight / 2;

  function renderOverlayTiles(): React.ReactNode[] {
    const state = displayState;
    const startCol = Math.max(0, Math.floor(overlayCamX / TILE_SIZE));
    const endCol = Math.min(TRACK_WIDTH - 1, Math.ceil((overlayCamX + windowWidth) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(overlayCamY / TILE_SIZE));
    const endRow = Math.min(TRACK_HEIGHT - 1, Math.ceil((overlayCamY + windowHeight) / TILE_SIZE));

    const tiles: React.ReactNode[] = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = state.track[row]?.[col];
        if (!tile) continue;
        const px = col * TILE_SIZE - overlayCamX;
        const py = row * TILE_SIZE - overlayCamY;
        tiles.push(
          <Rect key={`o-${col}-${row}`} x={px} y={py} width={TILE_SIZE} height={TILE_SIZE} color={TILE_COLORS[tile]} />,
        );
      }
    }
    return tiles;
  }

  function renderOverlayCar(playerIdx: PlayerIndex): React.ReactNode {
    const racer = displayState.racers[playerIdx];
    const screenX = racer.x - overlayCamX - TILE_SIZE / 2;
    const screenY = racer.y - overlayCamY - TILE_SIZE / 2;
    const carColor = playerIdx === 0 ? '#e94560' : '#0f3460';

    return (
      <Group key={`ocar-${playerIdx}`} origin={{ x: screenX + TILE_SIZE / 2, y: screenY + TILE_SIZE / 2 }} transform={[{ rotate: racer.angle + Math.PI / 2 }]}>
        <Rect x={screenX} y={screenY} width={TILE_SIZE} height={TILE_SIZE} color={carColor} />
        <Rect x={screenX + TILE_SIZE / 2 - 3} y={screenY} width={6} height={8} color="#ffffff" />
      </Group>
    );
  }

  return (
    <View
      style={styles.container}
      onTouchStart={(e) => handleTouchStart(e, null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Canvas style={styles.fullCanvas}>
        {renderOverlayTiles()}
        {renderOverlayCar(0)}
        {renderOverlayCar(1)}
      </Canvas>

      {renderHUD()}
      {renderCountdown()}
      {renderFinish()}
      {renderControlHints()}
    </View>
  );
}

// -- Styles --
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
  },
  fullCanvas: {
    flex: 1,
  },
  divider: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#ffffff40',
  },
  hudContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  hudPlayer: {
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  hudValue: {
    fontSize: 14,
    color: '#ffffffcc',
  },
  hudTimer: {
    backgroundColor: '#00000060',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  overlayCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000080',
  },
  countdownText: {
    fontSize: 96,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  finishOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000cc',
  },
  finishTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffeb3b',
    marginBottom: 16,
  },
  finishTime: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 8,
  },
  finishTimeSub: {
    fontSize: 18,
    color: '#ffffffaa',
    marginBottom: 24,
  },
  restartButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  restartButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  exitButton: {
    backgroundColor: '#ffffff20',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exitButtonText: {
    fontSize: 16,
    color: '#ffffffcc',
  },
  controlHints: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  controlHintText: {
    fontSize: 14,
    color: '#ffffff60',
  },
});
