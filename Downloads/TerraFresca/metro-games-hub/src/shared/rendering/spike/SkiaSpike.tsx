import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  Image,
  useCanvasRef,
  Skia,
  FilterMode,
  MipmapMode,
  AlphaType,
  ColorType,
} from '@shopify/react-native-skia';

// 16-color palette (CGA-inspired)
const PALETTE = [
  '#000000', '#0000AA', '#00AA00', '#00AAAA',
  '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
  '#555555', '#5555FF', '#55FF55', '#55FFFF',
  '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Generate a 32x32 pixel art sprite as raw RGBA Uint8Array
function generateSpriteData(): Uint8Array {
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const border = x === 0 || x === 31 || y === 0 || y === 31;
      const checker = ((x >> 2) + (y >> 2)) % 2 === 0;
      let colorIdx: number;
      if (border) {
        colorIdx = 15;
      } else if (checker) {
        colorIdx = ((x * 3 + y * 5) % 14) + 1;
      } else {
        colorIdx = 0;
      }
      const [r, g, b] = hexToRgb(PALETTE[colorIdx]);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  return data;
}

export function SkiaSpike() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  // Initialized lazily inside useEffect to avoid impure render-time call (react-hooks/purity).
  const lastTime = useRef(0);
  const canvasRef = useCanvasRef();

  // Create SkImage from raw pixel data using Skia.MakeImage with SkData
  const skImage = useMemo(() => {
    const spriteData = generateSpriteData();
    const skData = Skia.Data.fromBytes(spriteData);
    const img = Skia.Image.MakeImage(
      {
        width: 32,
        height: 32,
        alphaType: AlphaType.Opaque,
        colorType: ColorType.RGBA_8888,
      },
      skData,
      32 * 4
    );
    return img;
  }, []);

  useEffect(() => {
    // Initialize timestamp here to avoid impure render-time call (react-hooks/purity).
    lastTime.current = Date.now();
    let animId: number;
    const tick = () => {
      frameCount.current++;
      const now = Date.now();
      const elapsed = now - lastTime.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        lastTime.current = now;
      }
      canvasRef.current?.redraw();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [canvasRef]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Skia Spike — 32x32 → 256x256 Nearest Neighbor</Text>
      <Canvas ref={canvasRef} style={styles.canvas}>
        {skImage && (
          <Image
            image={skImage}
            x={0}
            y={0}
            width={256}
            height={256}
            fit="fill"
            sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
          />
        )}
      </Canvas>
      <Text style={styles.fps}>FPS: {fps}</Text>
      <Text style={styles.note}>Target: 60fps sustained for 10s with nearest-neighbor scaling</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  canvas: {
    width: 256,
    height: 256,
    borderWidth: 2,
    borderColor: '#444',
  },
  fps: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  note: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
});