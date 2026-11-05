# Task 2 Spike Report: Skia vs expo-gl Rendering Validation

**Date:** 2026-11-03
**Expo SDK:** 58.0.0
**React Native:** 0.88.1
**@shopify/react-native-skia:** 2.14.0
**expo-gl:** SDK 58 compatible

## Installation Results

| Package | Status | Version Installed |
|---------|--------|-------------------|
| @shopify/react-native-skia | SUCCESS | 2.14.0 (SDK 58 compatible) |
| expo-gl | SUCCESS | SDK 58 compatible |

Both packages installed without conflicts via `npx expo install`.

## Backend Evaluation

### @shopify/react-native-skia

- **Nearest-neighbor support:** YES — `sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}` on `<Image>` provides exact pixel-art scaling with no interpolation.
- **API ergonomics:** Declarative JSX (`<Canvas>`, `<Image>`) integrates naturally with React component trees. Raw RGBA pixel data can be uploaded via `Skia.Image.MakeImage(info, skData, bytesPerRow)` where `skData = Skia.Data.fromBytes(uint8Array)`.
- **FPS target:** Expected 60fps sustained. Skia uses GPU-accelerated rendering via Metal (iOS) / Vulkan/OpenGL (Android). The declarative model avoids manual GL state management overhead.
- **Known issues / API gotchas discovered during spike:**
  - `AlphaType`, `ColorType`, `FilterMode`, `MipmapMode` are top-level named exports from `@shopify/react-native-skia`, NOT properties on the `Skia` object. Accessing `Skia.AlphaType` or `Skia.ColorType` causes TS2339 errors.
  - `useSkia()` does not exist in v2.14. Use the direct `Skia` export instead.
  - `ImageProps.image` expects `SkImage | null`, not a raw data descriptor object. Must create an `SkImage` via `Skia.Image.MakeImage()` before passing to `<Image>`.
  - `MakeImage` signature: `(info: ImageInfo, data: SkData, bytesPerRow: number) => SkImage | null`. The `ImageInfo` requires `{ width, height, alphaType: AlphaType, colorType: ColorType }`.
  - `SamplingOptions` is `CubicResampler | FilterOptions`. For nearest-neighbor, use `FilterOptions`: `{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }`. The property name is `filter`, not `filterMode`.
  - `canvasRef.current?.redraw()` works for forced frame updates in animation loops.
- **Platform notes:** Requires native build (not Expo Go). Both Android and iOS supported.

### expo-gl

- **Nearest-neighbor support:** YES — Standard WebGL `gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)` and `TEXTURE_MIN_FILTER` work as expected.
- **API ergonomics:** Imperative WebGL API. Requires manual shader compilation, buffer setup, texture creation, and render loop management. Significantly more boilerplate than Skia for equivalent output.
- **FPS target:** Expected 60fps sustained. Direct GL access gives fine-grained control but at the cost of complexity.
- **Known issues:** `endFrameEXP()` is required each frame (Expo-specific extension). Context creation is async. No built-in React integration — all state must be managed manually.
- **Platform notes:** Requires native build (not Expo Go). Both Android and iOS supported. Deprecated in favor of Skia in newer Expo docs but still functional in SDK 58.

## Comparison Matrix

| Criterion | Skia | expo-gl |
|-----------|------|---------|
| Nearest-neighbor filtering | Yes (declarative) | Yes (WebGL standard) |
| Code complexity for sprite rendering | Low (~100 LOC) | High (~150 LOC) |
| React integration | Native (JSX components) | Manual (imperative GL) |
| Raw pixel data upload | Via Skia.Image.MakeImage + SkData | Via texImage2D |
| Community/docs quality | Excellent (Shopify maintained) | Adequate but aging |
| Future-proofing | Active development | Maintenance mode |
| Performance ceiling | High (GPU batched) | High (direct GL) |
| Animation framework compat | Reanimated, Moti | Manual requestAnimationFrame |
| API stability (v2.14) | Some gotchas (see above) but stable | Stable WebGL subset |

## Recommendation

**Primary: @shopify/react-native-skia**

Skia is the recommended rendering backend for 16-bit pixel art in Metro Games Hub because:

1. Nearest-neighbor sampling is a first-class declarative API — no risk of accidentally enabling bilinear filtering.
2. Dramatically lower code complexity for sprite rendering, tile maps, and UI overlays.
3. Active maintenance by Shopify with strong React Native integration.
4. Compatible with Reanimated for performant animations without manual GL loops.
5. Raw pixel data upload is straightforward for procedural sprite generation once the MakeImage API is understood.

**Fallback: expo-gl**

expo-gl remains viable as a documented fallback if:
- A specific shader effect requires direct GLSL that Skia cannot express.
- Integration with an existing WebGL-based engine or library is needed.
- Skia introduces a platform-specific regression on a target device.

## Spike Artifacts

- `metro-games-hub/src/shared/rendering/spike/SkiaSpike.tsx` — Skia rendering demo with FPS counter
- `metro-games-hub/src/shared/rendering/spike/GLSpike.tsx` — expo-gl rendering demo with FPS counter
- Both screens accessible from Home screen via AppNavigator for manual device testing
- TypeScript compiles cleanly (`npx tsc --noEmit` passes with zero errors)

## Commit

SHA: `a19d4e8` on branch `feat/metro-games-hub-foundation`

## Manual Testing Checklist

When testing on physical device or emulator:
- [ ] Navigate to Skia Spike screen — sprite renders with sharp pixels (no blur)
- [ ] FPS counter shows ~60 sustained for 10+ seconds
- [ ] Navigate to expo-gl Spike screen — identical visual output
- [ ] FPS counter shows ~60 sustained for 10+ seconds
- [ ] No console warnings or errors on either screen
- [ ] Test on both Android and iOS if possible