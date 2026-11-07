/**
 * 3D Dice component using CSS transforms for realistic rolling animation.
 * Renders a cube with 6 faces showing proper dot patterns.
 * Supports player-colored glow and SFX integration.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { AudioManager } from '../../shared/audio/AudioManager';
import { SoundRegistry } from '../../shared/audio/SoundRegistry';

const DICE_SIZE = 80;
const HALF_SIZE = DICE_SIZE / 2;

// Dot positions for each face (3x3 grid, 0-indexed)
const FACE_DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Rotation values to show each face (rotateX, rotateY in degrees)
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 180, y: 0 },
};

interface Dice3DProps {
  value: number | null;
  isRolling: boolean;
  playerColor: string;
  onRoll: () => void;
  onRollComplete: (value: number) => void;
}

/** Generate random rotation that lands on target face after full spins */
function getTargetRotation(targetFace: number, spinCount: number = 3): { x: number; y: number } {
  const base = FACE_ROTATIONS[targetFace];
  const extraSpins = 360 * spinCount;
  // Add randomness to spin direction
  const xDir = Math.random() > 0.5 ? 1 : -1;
  const yDir = Math.random() > 0.5 ? 1 : -1;
  return {
    x: base.x + extraSpins * xDir,
    y: base.y + extraSpins * yDir,
  };
}

export function Dice3D({
  value,
  isRolling,
  playerColor,
  onRoll,
  onRollComplete,
}: Dice3DProps) {
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(true);
  const finalValueRef = useRef<number>(value ?? 1);
  const rollCompleteCalledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isRolling && value !== null) {
      finalValueRef.current = value;
      // Set final rotation without animation when not rolling
      const target = FACE_ROTATIONS[value];
      rotateX.setValue(target.x);
      rotateY.setValue(target.y);
      scaleAnim.setValue(1);
      rollCompleteCalledRef.current = false;
    } else if (!isRolling && value === null) {
      finalValueRef.current = 1;
      rotateX.setValue(0);
      rotateY.setValue(0);
      scaleAnim.setValue(1);
      rollCompleteCalledRef.current = false;
    }
  }, [value, isRolling, rotateX, rotateY, scaleAnim]);

  // Rolling animation
  useEffect(() => {
    if (!isRolling) return;

    rollCompleteCalledRef.current = false;
    const targetValue = finalValueRef.current;

    // Play dice-roll SFX at start
    const rollUri = SoundRegistry.resolve('dice-roll');
    if (rollUri) {
      AudioManager.playSfx(rollUri);
    }

    const target = getTargetRotation(targetValue, 3);

    // Main rolling animation
    const rollAnimation = Animated.parallel([
      Animated.timing(rotateX, {
        toValue: target.x,
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(rotateY, {
        toValue: target.y,
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
    ]);

    // Landing bounce
    const bounceAnimation = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.elastic(1.5),
        useNativeDriver: true,
      }),
    ]);

    rollAnimation.start(() => {
      // Play dice-land SFX
      const landUri = SoundRegistry.resolve('dice-land');
      if (landUri) {
        AudioManager.playSfx(landUri);
      }

      bounceAnimation.start(() => {
        if (mountedRef.current && !rollCompleteCalledRef.current) {
          rollCompleteCalledRef.current = true;
          onRollComplete(targetValue);
        }
      });
    });

    return () => {
      rollAnimation.stop();
      bounceAnimation.stop();
    };
  }, [isRolling, onRollComplete, rotateX, rotateY, scaleAnim]);

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

  const accessibilityLabel = isRolling
    ? 'Dado rolando'
    : `Dado mostrando ${value ?? 1}`;

  return (
    <TouchableOpacity
      testID="dice-area"
      style={[styles.container, !isRolling && { borderColor: playerColor, borderWidth: 3 }]}
      onPress={handlePress}
      disabled={isRolling}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Toque para rolar"
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          styles.cube,
          {
            transform: [
              { perspective: 600 },
              { rotateX },
              { rotateY },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Front face (1) */}
        <View style={[styles.face, styles.faceFront]}>
          {FACE_DOTS[1].map((dot) => (
            <View key={dot} style={[styles.dot, getDotPosition(dot)]} />
          ))}
        </View>
        {/* Right face (2) */}
        <View style={[styles.face, styles.faceRight]}>
          {FACE_DOTS[2].map((dot) => (
            <View key={dot} style={[styles.dot, getDotPosition(dot)]} />
          ))}
        </View>
        {/* Top face (3) */}
        <View style={[styles.face, styles.faceTop]}>
          {FACE_DOTS[3].map((dot) => (
            <View key={dot} style={[styles.dot, getDotPosition(dot)]} />
          ))}
        </View>
        {/* Bottom face (4) */}
        <View style={[styles.face, styles.faceBottom]}>
          {FACE_DOTS[4].map((dot) => (
            <View key={dot} style={[styles.dot, getDotPosition(dot)]} />
          ))}
        </View>
        {/* Left face (5) */}
        <View style={[styles.face, styles.faceLeft]}>
          {FACE_DOTS[5].map((dot) => (
            <View key={dot} style={[styles.dot, getDotPosition(dot)]} />
          ))}
        </View>
        {/* Back face (6) */}
        <View style={[styles.face, styles.faceBack]}>
          {FACE_DOTS[6].map((dot) => (
            <View key={dot} style={[styles.dot, getDotPosition(dot)]} />
          ))}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/** Get position style for a dot in the 3x3 grid */
function getDotPosition(index: number): object {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const offset = 20; // percentage from center
  return {
    top: `${25 + row * 25}%`,
    left: `${25 + col * 25}%`,
  };
}

const styles = StyleSheet.create({
  container: {
    width: DICE_SIZE + 40,
    height: DICE_SIZE + 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cube: {
    width: DICE_SIZE,
    height: DICE_SIZE,
    position: 'relative',
    transformStyle: 'preserve-3d' as unknown as string,
  },
  face: {
    position: 'absolute',
    width: DICE_SIZE,
    height: DICE_SIZE,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backfaceVisibility: 'hidden' as unknown as string,
  },
  faceFront: {
    transform: [{ translateZ: HALF_SIZE }],
  },
  faceBack: {
    transform: [{ rotateY: '180deg' }, { translateZ: HALF_SIZE }],
  },
  faceRight: {
    transform: [{ rotateY: '90deg' }, { translateZ: HALF_SIZE }],
  },
  faceLeft: {
    transform: [{ rotateY: '-90deg' }, { translateZ: HALF_SIZE }],
  },
  faceTop: {
    transform: [{ rotateX: '90deg' }, { translateZ: HALF_SIZE }],
  },
  faceBottom: {
    transform: [{ rotateX: '-90deg' }, { translateZ: HALF_SIZE }],
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1a1a1a',
    transform: [{ translateX: -7 }, { translateY: -7 }],
  },
});