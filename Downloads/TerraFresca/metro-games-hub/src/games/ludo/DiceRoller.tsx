/**
 * Simplified animated dice component for Ludo.
 * Uses SpriteGenerator 'dice-face' template with scale animation on roll.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { SpriteGenerator } from '../../shared/assets/SpriteGenerator';

const DICE_SIZE = 80;
const SEED = 91;
const PALETTE = ['#e63946', '#2a9d8f', '#e9c46a', '#457b9d', '#f1faee'];

const ROLL_DURATION = 600;
const BOUNCE_DURATION = 200;
const TOTAL_DURATION = ROLL_DURATION + BOUNCE_DURATION;

interface DiceRollerProps {
  onRollComplete: (value: number) => void;
  disabled: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function DiceRoller({ onRollComplete, disabled }: DiceRollerProps) {
  const [displayFace, setDisplayFace] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isRolling, setIsRolling] = useState(false);

  const rafIdRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handlePress = useCallback(() => {
    if (disabled || isRolling) return;

    const targetValue = Math.floor(Math.random() * 6) + 1;
    setIsRolling(true);

    const startTime = performance.now();
    let lastFaceChangeTime = 0;

    const animate = (now: number) => {
      if (!mountedRef.current) return;

      const elapsed = now - startTime;

      if (elapsed >= TOTAL_DURATION) {
        setDisplayFace(targetValue);
        setScale(1.0);
        setIsRolling(false);
        onRollComplete(targetValue);
        return;
      }

      if (elapsed < ROLL_DURATION) {
        const progress = elapsed / ROLL_DURATION;
        const easedProgress = easeOutCubic(progress);
        const currentInterval = 60 + easedProgress * 180;
        const timeSinceLastChange = elapsed - lastFaceChangeTime;

        if (timeSinceLastChange >= currentInterval) {
          let randomFace: number;
          do {
            randomFace = Math.floor(Math.random() * 6) + 1;
          } while (randomFace === targetValue);
          setDisplayFace(randomFace);
          lastFaceChangeTime = elapsed;
        }
        setScale(1.0);
      } else {
        const bounceElapsed = elapsed - ROLL_DURATION;
        const bounceProgress = Math.min(bounceElapsed / BOUNCE_DURATION, 1.0);
        setDisplayFace(targetValue);
        const bounceScale = 1.0 + 0.12 * Math.sin(bounceProgress * Math.PI);
        setScale(bounceScale);
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);
  }, [disabled, isRolling, onRollComplete]);

  const sprite = SpriteGenerator.generate('dice-face', {
    seed: SEED,
    palette: PALETTE,
    overrides: { face: displayFace as 1 | 2 | 3 | 4 | 5 | 6 },
  });

  const accessibilityLabel = isRolling
    ? 'Dice rolling'
    : `Dice showing ${displayFace}`;

  return (
    <TouchableOpacity
      testID="ludo-dice"
      style={[styles.container, disabled && styles.disabled]}
      onPress={handlePress}
      disabled={disabled || isRolling}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to roll"
    >
      <Image
        testID="ludo-dice-face"
        source={{ uri: sprite.uri }}
        style={[styles.diceImage, { transform: [{ scale }] }]}
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
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  disabled: {
    opacity: 0.5,
  },
  diceImage: {
    width: DICE_SIZE,
    height: DICE_SIZE,
  },
});
