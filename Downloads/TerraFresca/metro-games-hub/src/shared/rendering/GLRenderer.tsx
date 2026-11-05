import React, { useRef, useCallback } from 'react';
import { View } from 'react-native';
import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import type { PixelRenderer, PixelRendererProps } from './PixelRenderer';

/**
 * expo-gl-backed PixelRenderer fallback implementation.
 * Uses NEAREST texture filtering for crisp pixel-art scaling.
 */

const VERT_SHADER = `
attribute vec2 position;
attribute vec2 texCoord;
varying vec2 vTexCoord;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vTexCoord = texCoord;
}`;

const FRAG_SHADER = `
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uTexture;
void main() {
  gl_FragColor = texture2D(uTexture, vTexCoord);
}`;

const GLSprite: React.FC<PixelRendererProps> = ({ sprite, x, y, scale = 1 }) => {
  const width = sprite.width * scale;
  const height = sprite.height * scale;
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      glRef.current = gl;

      // Compile shaders
      const vert = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vert, VERT_SHADER);
      gl.compileShader(vert);

      const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(frag, FRAG_SHADER);
      gl.compileShader(frag);

      const program = gl.createProgram()!;
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      gl.useProgram(program);

      // Full-screen quad positioned at (x, y) within the canvas
      // Normalized device coordinates: map pixel coords to [-1, 1]
      const canvasW = gl.drawingBufferWidth;
      const canvasH = gl.drawingBufferHeight;
      const nx = (x / canvasW) * 2 - 1;
      const ny = 1 - (y / canvasH) * 2;
      const nw = (width / canvasW) * 2;
      const nh = (height / canvasH) * 2;

      const positions = new Float32Array([
        nx, ny - nh,
        nx + nw, ny - nh,
        nx, ny,
        nx + nw, ny,
      ]);
      const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);

      const posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const texBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
      const texLoc = gl.getAttribLocation(program, 'texCoord');
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

      // Create texture with NEAREST filtering for pixel art
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Placeholder 1x1 white texture (real asset loading handled by game layer)
      const placeholder = new Uint8Array([255, 255, 255, 255]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, placeholder);

      gl.viewport(0, 0, canvasW, canvasH);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.endFrameEXP();
    },
    [sprite, x, y, width, height],
  );

  return (
    <View style={{ position: 'absolute', left: x, top: y, width, height }}>
      <GLView style={{ width, height }} onContextCreate={onContextCreate} />
    </View>
  );
};

const GLCanvasWrapper: React.FC<{ width: number; height: number; children: React.ReactNode }> = ({
  width,
  height,
  children,
}) => {
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {children}
    </View>
  );
};

export const GLRenderer: PixelRenderer = {
  Sprite: GLSprite,
  Canvas: GLCanvasWrapper,
};