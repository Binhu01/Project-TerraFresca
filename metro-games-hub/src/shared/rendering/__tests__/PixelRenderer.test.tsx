import React from 'react';
import { render } from '@testing-library/react-native';
import { PixelRendererFactory } from '../PixelRendererFactory';

test('factory returns renderer with Sprite and Canvas components', () => {
  const r = PixelRendererFactory.create();
  expect(r.Sprite).toBeDefined();
  expect(r.Canvas).toBeDefined();
});

test('renderer Sprite renders without crash', () => {
  const r = PixelRendererFactory.create();
  // If render throws, the test fails automatically.
  // Reaching this assertion means the component tree mounted successfully.
  expect(() =>
    render(
      <r.Canvas width={320} height={240}>
        <r.Sprite sprite={{ uri: 'test.png', width: 32, height: 32 }} x={0} y={0} />
      </r.Canvas>
    )
  ).not.toThrow();
});