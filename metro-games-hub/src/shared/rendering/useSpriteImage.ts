/**
 * Hook that converts a SpriteSpec URI (data:image/svg+xml;base64,...)
 * into a Skia SkImage suitable for use with the <Image> component
 * inside a Skia <Canvas>.
 *
 * Skia's useImage internally calls Data.fromURI which uses fetch() and
 * does NOT support data: URIs on native. We decode the base64 payload
 * manually and pass raw bytes via Skia.Image.MakeImageFromEncoded.
 *
 * Returns null while the image is loading or if the source is invalid.
 */

import { useMemo } from 'react';
import { Skia, useImage } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import type { SpriteSpec } from './PixelRenderer';

/**
 * Decode a base64 string to Uint8Array without relying on atob
 * (which may not be available in all RN/Hermes environments).
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = typeof atob === 'function'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Extract the base64 payload from a data URI string.
 * Expected format: "data:<mime>;base64,<payload>"
 * Returns null if the string is not a valid data URI.
 */
function extractBase64FromDataUri(uri: string): string | null {
  const commaIndex = uri.indexOf(',');
  if (commaIndex === -1) return null;
  const prefix = uri.substring(0, commaIndex);
  if (!prefix.startsWith('data:') || !prefix.includes(';base64')) return null;
  return uri.substring(commaIndex + 1);
}

export function useSpriteImage(sprite: SpriteSpec | null | undefined): SkImage | null {
  // Convert data URI to raw bytes synchronously so useImage receives
  // a Uint8Array source instead of an unsupported data: URI string.
  const bytesSource = useMemo(() => {
    const uri = sprite?.uri;
    if (!uri) return null;
    const base64 = extractBase64FromDataUri(uri);
    if (!base64) return null;
    try {
      return base64ToBytes(base64);
    } catch {
      return null;
    }
  }, [sprite?.uri]);

  // useImage accepts Uint8Array and passes it through Skia.Data.fromBytes
  // → Skia.Image.MakeImageFromEncoded, which correctly handles SVG data.
  return useImage(bytesSource);
}