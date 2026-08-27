import { describe, expect, it } from 'vitest';
import { extractAverageColor } from '../src/features/moodboard/palette';

function makeImageData(pixels: [number, number, number][]): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return { data, width: pixels.length, height: 1, colorSpace: 'srgb' } as ImageData;
}

describe('extractAverageColor', () => {
  it('returns the exact color for a single-pixel uniform image', () => {
    const imageData = makeImageData([[100, 150, 200]]);
    expect(extractAverageColor(imageData)).toEqual({ r: 100, g: 150, b: 200 });
  });

  it('averages across multiple pixels', () => {
    const imageData = makeImageData([
      [0, 0, 0],
      [100, 100, 100],
    ]);
    expect(extractAverageColor(imageData)).toEqual({ r: 50, g: 50, b: 50 });
  });
});
