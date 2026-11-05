import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { OrientationChangeEvent } from 'expo-screen-orientation';

const LANDSCAPE_ORIENTATIONS = new Set([
  ScreenOrientation.Orientation.LANDSCAPE_LEFT,
  ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
]);

export function RotationPrompt() {
  // Fail-visible: default to non-landscape so the prompt shows until orientation is confirmed.
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    let mounted = true;

    const updateOrientation = (orientation: ScreenOrientation.Orientation) => {
      if (mounted) {
        setIsLandscape(LANDSCAPE_ORIENTATIONS.has(orientation));
      }
    };

    ScreenOrientation.getOrientationAsync().then((orientation) => {
      updateOrientation(orientation);
    });

    const subscription = ScreenOrientation.addOrientationChangeListener(
      (event: OrientationChangeEvent) => {
        updateOrientation(event.orientationInfo.orientation);
      }
    );

    return () => {
      mounted = false;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, []);

  if (isLandscape) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Text style={styles.text}>Por favor, gire o dispositivo para o modo paisagem</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
