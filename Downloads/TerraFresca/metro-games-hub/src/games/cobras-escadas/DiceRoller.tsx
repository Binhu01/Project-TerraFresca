/**
 * BG3-style DiceRoller component with tumbling animation, landing bounce,
 * breathing idle pulse, player-colored glow, and SFX integration.
 * Animation uses requestAnimationFrame with pure easing for Skia compatibility.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';
import { AudioManager } from '../../shared/audio/AudioManager';

const DICE_SIZE = 96;
const SEED = 42;
const PALETTE = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2'];

// Animation timing constants
const TUMBLING_DURATION = 800;
const LANDING_DURATION = 300;
const TOTAL_DURATION = TUMBLING_DURATION + LANDING_DURATION;
const BREATHING_PERIOD = 2000;
const BREATHING_MIN = 1.0;
const BREATHING_MAX = 1.02;
const BOUNCE_MIN = 1.0;
const BOUNCE_MAX = 1.15;

interface DiceRollerProps {
  value: number | null;
  isRolling: boolean;
  playerColor: string;
  onRoll: () => void;
  onRollComplete: (value: number) => void;
}

/** Ease-out cubic: fast start, slow end. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function DiceRoller({
  value,
  isRolling,
  playerColor,
  onRoll,
  onRollComplete,
}: DiceRollerProps) {
  const [displayFace, setDisplayFace] = useState<number>(value ?? 1);
  const [scale, setScale] = useState<number>(1.0);

  // Refs for cleanup
  const rafIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Track the final value to use at end of animation
  const finalValueRef = useRef<number>(value ?? 1);

  // Update display face when value changes and not rolling
  useEffect(() => {
    if (!isRolling && value !== null) {
      setDisplayFace(value);
      finalValueRef.current = value;
    } else if (!isRolling && value === null) {
      setDisplayFace(1);
      finalValueRef.current = 1;
    }
  }, [value, isRolling]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, []);

  // Breathing idle animation
  useEffect(() => {
    if (isRolling) {
      // Cancel breathing during roll
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      return;
    }

    const startTime = Date.now();
    intervalIdRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const elapsed = (Date.now() - startTime) % BREATHING_PERIOD;
      const progress = elapsed / BREATHING_PERIOD;
      // Sine wave: 0 → 1 → 0 over one period
      const sineVal = Math.sin(progress * Math.PI * 2);
      const newScale = BREATHING_MIN + (BREATHING_MAX - BREATHING_MIN) * (0.5 + 0.5 * sineVal);
      setScale(newScale);
    }, 16);

    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [isRolling]);

  // Rolling animation
  useEffect(() => {
    if (!isRolling) return;

    const targetValue = finalValueRef.current;
    const startTime = performance.now();
    let lastFaceChangeTime = 0;

    // Play dice-roll SFX at start
    AudioManager.playSfx('dice-roll');

    const animate = (now: number) => {
      if (!mountedRef.current) return;

      const elapsed = now - startTime;

      if (elapsed >= TOTAL_DURATION) {
        // Animation complete
        setDisplayFace(targetValue);
        setScale(1.0);
        onRollComplete(targetValue);
        return;
      }

      if (elapsed < TUMBLING_DURATION) {
        // Tumbling phase: face changes at decreasing intervals (ease-out)
        const tumblingProgress = elapsed / TUMBLING_DURATION;
        const easedProgress = easeOutCubic(tumblingProgress);

        // Interval increases as we approach end (deceleration)
        // At start: ~80ms between changes, at end: much longer
        const currentInterval = 80 + easedProgress * 200;
        const timeSinceLastChange = elapsed - lastFaceChangeTime;

        if (timeSinceLastChange >= currentInterval) {
          // Pick a random face (not the target) for tumbling effect
          let randomFace: number;
          do {
            randomFace = Math.floor(Math.random() * 6) + 1;
          } while (randomFace === targetValue);
          setDisplayFace(randomFace);
          lastFaceChangeTime = elapsed;
        }

        setScale(1.0);
      } else {
        // Landing bounce phase
        const bounceElapsed = elapsed - TUMBLING_DURATION;
        const bounceProgress = Math.min(bounceElapsed / LANDING_DURATION, 1.0);

        // Show final face during bounce
        setDisplayFace(targetValue);

        // Bounce: 1.0 → 1.15 → 1.0 using sine curve
        const bounceScale = BOUNCE_MIN + (BOUNCE_MAX - BOUNCE_MIN) * Math.sin(bounceProgress * Math.PI);
        setScale(bounceScale);

        // Play dice-land SFX at start of landing phase
        if (bounceElapsed < 20) {
          AudioManager.playSfx('dice-land');
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isRolling, onRollComplete]);

  // Update finalValueRef when value changes during rolling
  useEffect(() => {
    if (value !== null) {
      finalValueRef.current = value;
    }
  }, [value]);

  const handlePress = useCallback(() => {
    if (!isRolling) {
      onRoll();
    }
  }, [isRolling, onRoll]);

  const sprite = SpriteGenerator.generate('dice-face', {
    seed: SEED,
    palette: PALETTE,
    overrides: { face: displayFace as 1 | 2 | 3 | 4 | 5 | 6 },
  });

  const accessibilityLabel = isRolling
    ? 'Dado rolando'
    : `Dado mostrando ${displayFace}`;

  return (
    <TouchableOpacity
      testID="dice-area"
      style={[
        styles.container,
        !isRolling && { borderColor: playerColor, borderWidth: 2 },
      ]}
      onPress={handlePress}
      disabled={isRolling}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Toque para rolar"
    >
      <Image
        testID="dice-face"
        source={{ uri: sprite.uri }}
        style={[
          styles.diceImage,
          { transform: [{ scale }] },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: DICE_SIZE + 16,
    height: DICE_SIZE + 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  diceImage: {
    width: DICE_SIZE,
    height: DICE_SIZE,
  },
});
